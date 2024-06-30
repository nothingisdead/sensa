import EAXSession from "./eax/EAXSession.js";
import EAXBase from "./eax/EAXBase.js";
import SpakeP224 from "./spake/SpakeP224.js";
import Request from "./ble/schlage/Request.js";
import * as Requests from "./ble/schlage/Requests.js";
import LogEntry from "./LogEntry.js";
import AccessCode from "./AccessCode.js";
import LockData from "./LockData.js";
import getSenseScanFilter from "./util/getSenseScanFilter.js";
import filterManufacturerData from "./util/filterManufacturerData.js";
import decodeAll from "./util/decodeAll.js";
import encodeAll from "./util/encodeAll.js";
import encodeMap from "./util/encodeMap.js";
import decodeObject from "./util/decodeObject.js";
// import getAny from "./util/getAny.js";
import arrayEquals from "./util/arrayEquals.js";
import waitForEvent from "./util/waitForEvent.js";
import { encode as toHex, decode as fromHex } from '@stablelib/hex';
import { encode, decode } from "@stablelib/cbor";
import { hmac } from '@stablelib/hmac';
import { SHA256 } from '@stablelib/sha256';
import { HKDF } from '@stablelib/hkdf';
import EventEmitter from "events";
import { v4 as uuid } from "uuid";

// Secrets used in HKDF key generation
const HKDF_INFO = fromHex('73657373696f6e206b6579');
const HKDF_SALT = fromHex('008a393622041f5f0fc75d97daee6e81cbbb2bc74f9ccc91e75e77a56b4a4b05');

// UUIDs used for BLE communication
const COMPANY_ID             = 0x013b;
const SERVICE_UUID           = '883f45ec-14cb-46aa-9864-9a4e782b33d0';
const RX_CHARACTERISTIC_UUID = '26002998-e001-4812-8c08-5cd2afda0830';
const TX_CHARACTERISTIC_UUID = 'ff530c78-cd50-4bb9-bbd4-0712f32b3796';

// Prefixes for various parts of the protocol
const ENCRYPT_PREFIX        = new Uint8Array([ 1, 0, 0 ]);
const DECRYPT_PREFIX        = new Uint8Array([ 3, 0, 0 ]);
const PAIR_ENCRYPT_PREFIX   = new Uint8Array([ 0 ]);
const PAIR_DECRYPT_PREFIX   = new Uint8Array([ 1 ]);
const AUTH_CHALLENGE_PREFIX = new Uint8Array([ 1 ]);
const AUTH_RESPONSE_PREFIX  = new Uint8Array([ 2 ]);
const SESSION_SALT_PREFIX   = new Uint8Array([ 2 ]);

// Symbol to store RX channel callback function
const RX_CB_SYMBOL = Symbol('rx');

const PACKET_TYPES = {
	INTERNAL         : 1,
	SINGLEPART       : 12,
	MULTIPART_FIRST  : 8,
	MULTIPART_LAST   : 4,
	MULTIPART_MIDDLE : 0,
};

const BLOCK_SIZE                 = 1024;
const MESSAGE_SIZE               = 19;
const REQUEST_PREFIX             = new Uint8Array([ 0, 1 ]);
const SECURE_CONNECTION_PREFIX   = new Uint8Array([ 0, 2, 0, 20, 2 ]);
const INSECURE_CONNECTION_PREFIX = new Uint8Array([ 0, 1, 0, 20, 0 ]);
const SEPARATOR_BYTE             = 20;
const MESSAGE_TYPE_MASK          = 0x0f;
const DEFAULT_TIMEOUT            = 1000 * 10;
const MAC_ADDRESS_OFFSET         = 7;

export default class SenseLock extends EventEmitter {
	#device;
	#address;
	#service;
	#rx_char;
	#tx_char;
	#eax_client;
	#eax_server;
	#access_codes;

	#authorized = false;
	#subscribed = false;
	#busy       = false;
	#ctr        = 0;
	#cat        = null;
	#sat        = null;

	/**
	 * Create an object that represents a BLE lock device
	 * @param {BluetoothDevice} device  The underlying BluetoothDevice object
	 * @param {Uint8Array}      address The device MAC address
	 */
	constructor(device, address) {
		super();

		// Store the bluetooth device and address
		this.#device  = device;
		this.#address = address;

		// When the GATT servcer disconnects, reset some internal state
		device.addEventListener('gattserverdisconnected', () => {
			this.#authorized = false;
			this.#subscribed = false;
			this.#service    = null;
			this.#rx_char    = null;
			this.#tx_char    = null;

			this.reset();
		});

		// Emit secure protocol messages
		this.on('data', async (message) => {
			// If there is a secure connection to the server
			try {
				// If this is a secure connection, decrypt the message
				if(this.#eax_server) {
					message = await this.#eax_server.decrypt(message);
				}

				// Emit the message
				this.emit('message', message);
			}
			catch(e) {
				// Do nothing
				console.warn(e);
			}
		});
	}

	// Returns the underlying BluetoothDevice
	get device() {
		return this.#device;
	}

	// Returns the MAC address of the underlying BluetoothDevice
	get address() {
		return toHex(this.#address);
	}

	// Returns true if the device is currently authorized
	get authorized() {
		return this.#authorized;
	}

	// Returns true if the device is currently busy
	get busy() {
		return this.#busy;
	}

	// Returns whether or not the remote GATT server is connected
	get connected() {
		return this.#device.gatt.connected;
	}

	/**
	 * Set up a secure session
	 * @param  {String}           cat           The session authorization secret
	 * @param  {String}           sat           The session encryption secret
	 * @param  {Boolean}          new_device    Whether or not this is a newly paired device
	 * @param  {Boolean}          cache_secrets Whether or not to cache the session secrets in case the GATT server is disconnected
	 * @return {Promise<Boolean>}               True if authorization succeeded, false if already authorized
	 */
	async authorize(cat = this.#cat, sat = this.#sat, new_device = false, cache_secrets = true) {
		// If the lock is already authorized, return false
		if(this.#authorized) {
			return false;
		}

		// If there are no cached secrets and none were passed in, throw an error
		if(cat === null || sat === null) {
			throw new Error("Not authorized, no cached secrets");
		}

		// Claim the device
		this.claim();

		// Make sure we are receiving RX events
		await this.#subscribe();

		console.warn("calculating client/server session keys");

		// Get the client/server random values
		const {
			client_salt,
			server_salt,
		} = await this.#getSessionSalts();

		console.warn("sending authorization challenge");

		// Create an authentication challenge and get the session secret
		const secret = await this.#sendServerChallenge(sat, client_salt, server_salt);

		console.warn("creating secure session");

		// Create an EAX session ID/key
		const { id, key } = await SenseLock.#createSession(client_salt, server_salt, secret);

		// Start a new EAX session
		this.#eax_server = new EAXSession(id, key, DECRYPT_PREFIX);
		this.#eax_client = new EAXSession(id, key, ENCRYPT_PREFIX);

		// Generate the CAT message
		const request = new Requests.SendCAT(cat, new_device);

		// Release the device
		this.release();

		console.warn("authorizing secure session");

		// Send the CAT message
		return await this.#request(request).then((timestamp) => {
			const { name } = this.#device;

			console.warn(`started secure session for lock ${name}`);

			// Make sure the lock sent a timestamp within a minute of the current timestamp
			if(Math.abs((Date.now() / 1000) - timestamp) > 60) {
				console.warn(`invalid timestamp for lock ${name} : ${new Date(timestamp * 1000).toLocaleString()}`);
			}

			// Set the authorized flag
			this.#authorized = true;

			// Cache the secrets
			if(cache_secrets) {
				this.#cat = cat;
				this.#sat = sat;
			}

			// If we got this far, authorization succeeded
			return true;
		});
	}

	/**
	 * Pair with a new lock
	 * @param  {String}           pin The pairing PIN
	 * @return {Promise<Object>}      An object with keys 'cat' and 'sat' (Save these to authorize to the lock in the future)
	 */
	async pair(pin) {
		// Claim the device
		this.claim();

		// Make sure we are receiving RX events
		await this.#subscribe();

		console.warn('setting up connection');

		// Set up an insecure connection
		await this.#connect();

		// Release the device
		this.release();

		console.warn('sending start pairing message');

		// Send a "start pairing" message
		const pairing_data = await this.#request(new Requests.StartPairing(), false);

		// Claim the device
		this.claim();

		// Get the server commitment and compute the client commitment
		const spake             = new SpakeP224(pin);
		const n                 = pairing_data.get(0);
		const server_commitment = pairing_data.get(1);
		const client_commitment = spake.computeCommitment();

		// Get the encryption key from the server commitment
		const key = spake.computeKey(server_commitment).slice(0, 16);
		const eax = new EAXBase(key);

		// Create an encrypted timestamp message
		const ts           = Math.floor(Date.now() / 1000);
		const ts_bytes     = encodeMap(new Map([[ 0, ts ]]));
		const ts_encrypted = await eax.encrypt(ts_bytes, PAIR_ENCRYPT_PREFIX, new Uint8Array());
		const ts_message   = new Requests.SendTimestamp(n, ts_encrypted, client_commitment);

		// Release the device
		this.release();

		console.warn('sending pairing timestamp message');

		// Decrypt the CAT/SAT tokens
		const tokens_encrypted = await this.#request(ts_message, false);
		const tokens_bytes     = await eax.decrypt(tokens_encrypted.get(0), PAIR_DECRYPT_PREFIX, new Uint8Array());
		const tokens           = decodeObject(tokens_bytes);
		const sat_buffer       = tokens.get(1);
		const cat_buffer   = tokens.get(0);

		// Encode the CAT/SAT tokens
		const sat     = toHex(sat_buffer);
		const tmp_cat = toHex(cat_buffer);

		console.warn('authorizing with temporary auth token');

		// Set up a secure connection
		await this.authorize(tmp_cat, sat, true, false);

		// Claim ownership
		const claim_response   = await this.#request(new Requests.ClaimOwnership());
		const claim_cat_buffer = claim_response.get(0);
		const cat              = toHex(claim_cat_buffer);

		console.warn('claiming ownership of lock');

		// Complete pairing
		await this.#request(new Requests.CompletePairing(claim_cat_buffer));

		// Unsubscribe from the RX channel
		await this.#unsubscribe();

		console.warn('disconnecting');

		// Disconnect the peripheral
		await this.disconnect();

		// Reset the session state
		this.reset();

		return { cat, sat };
	}

	/**
	 * Set the lock config
	 * @param   {Number}            prop    A config property from Constants.SET_LOCK_CONFIG
	 * @param   {Number}            value   The config value
	 * @param   {String}            user_id The UUID of the user issuing the command
	 * @returns {Promise<LockData>}         The LockData object
	 */
	async setConfig(prop, value, user_id = uuid()) {
		console.warn("setting lock config");

		// Authorize
		await this.authorize();

		// Send the request and return the response
		const response = await this.#request(new Requests.SetConfig(prop, value, user_id));

		console.warn("finished setting lock config");

		return response;
	}

	/**
	 * Set the lock state
	 * @param {Number}              prop    A state property from Constants.SET_LOCK_STATE
	 * @param {Number}              value   The state value
	 * @param {String}              user_id The UUID of the user issuing the command
	 * @returns {Promise<LockData>}         The LockData object
	 */
	async setState(prop, value, user_id = uuid()) {
		console.warn("setting lock state");

		// Authorize
		await this.authorize();

		// Send the request and return the response
		const response = await this.#request(new Requests.SetState(prop, value, user_id));

		console.warn("finished setting lock state");

		return response;
	}

	/**
	 * Get lock information
	 * @param   {Number}  command A command from Constants.GET_LOCK_INFO
	 * @returns {Promise}         The lock information
	 */
	async getInfo(command) {
		console.warn("getting lock info");

		// Authorize
		await this.authorize();

		// Send the request and process the response
		const request  = new Requests.GetInfo(command);
		const response = await this.#request(request);

		console.warn("finished getting lock info");

		return response;
	}

	/**
	 * Get lock configuration
	 * @param   {Number}  command A command from Constants.GET_LOCK_CONFIG
	 * @returns {Promise}         The lock information
	 */
	async getConfig(command) {
		console.warn("getting lock config");

		// Authorize
		await this.authorize();

		// Send the request and process the response
		const request  = new Requests.GetConfig(command);
		const response = await this.#request(request);

		console.warn("finished getting lock config");

		return response;
	}

	// /**
	//  * Get config/info/access codes/log entries as a single unified result
	//  * @param  {Number} props A bitmask containing any properties from GET_PROPERTY
	//  * @return {Object}       The results
	//  */
	// async get(props) {
	// 	return await getAny(this, props);
	// }

	/**
	 * @returns {Promise<Boolean>} Whether or not the lock has access codes available
	 */
	async hasAccessCodes() {
		console.warn("checking for access codes");

		// Authorize
		await this.authorize();

		// Send the request and process the response
		const request  = new Requests.HasAccessCodes();
		const response = await this.#request(request);

		console.warn("finished checking for access codes");

		return response === 1;
	}

	/**
	 * @returns {Promise<AccessCode[]>} The existing access codes
	 */
	async getAccessCodes() {
		console.warn("reading access codes");

		// Authorize
		await this.authorize();

		if(!this.#access_codes) {
			// Check to see if there are actually any access codes
			if(await this.hasAccessCodes()) {
				const codes = [];

				let finished = false;

				while(!finished) {
					const request          = new Requests.GetAccessCode();
					const { result, more } = await this.#request(request);

					codes.push(result);

					finished = !more;
				}

				this.#access_codes = codes;
			}
			else {
				this.#access_codes = [];
			}

			console.warn("finished reading access codes");
		}

		return this.#access_codes;
	}

	/**
	 * Get an access code by access code number
	 * @param   {Number}              code The access code
	 * @returns {Promise<AccessCode>}      The AccessCode object
	 */
	async getAccessCode(code) {
		console.warn('searching for access code');

		// Authorize
		await this.authorize();

		return (await this.getAccessCodes()).find((access_code) => {
			return +code === access_code.code;
		});
	}

	/**
	 * Delete an access code by code number
	 * @param   {Number}  code The access code
	 * @returns {Promise}
	 */
	async deleteAccessCode(code) {
		// Authorize
		await this.authorize();

		return await this.#request(new Requests.DeleteAccessCode(+code));
	}

	/**
	 * Delete all access codes
	 * TODO: Implement checking device type, figure out which device types support this
	 */
	async deleteAllAccessCodes() {
		throw new Error("Not implemented");

		// Authorize
		await this.authorize();

		return await this.#request(new Requests.DeleteAllAccessCodes());
	}

	/**
	 * @returns {Promise<Boolean>} Whether or not the lock has log entries available
	 */
	async hasLogEntries() {
		console.warn("checking for log entries");

		// Authorize
		await this.authorize();

		// Send the request and process the response
		const request  = new Requests.HasLogEntries();
		const response = await this.#request(request);

		console.warn("finished checking for log entries");

		return response === 1;
	}

	/**
	 * Get the log entries from the lock
	 * @param   {Function<LogEntry[], boolean>} stop  An optional reader function that reads log entries and returns true to stop reading
	 * @param   {Number}                        group The log entry group to read
	 * @returns {Promise<LogEntry[]>}                 All the log entries that were read
	 */
	async getLogEntries(stop, group = 1) {
		console.warn("reading log entries");

		// Authorize
		await this.authorize();

		// Default "stop" function stops when there are no more log entries
		stop = stop ?? ((_, more) => !more);

		// Collect the log entries
		const log_entries = [];

		if(await this.hasLogEntries()) {
			let finished = false;

			while(!finished) {
				const request          = new Requests.GetLogEntry(group);
				const { result, more } = await this.#request(request);

				log_entries.push(...result);

				finished = await stop(result, more);
			}
		}

		console.warn("finished reading log entries");

		return log_entries;
	}

	// Clear the secure session state
	reset() {
		this.#ctr        = 0;
		this.#eax_client = null;
		this.#eax_server = null;
	}

	// Disconnect from this device
	async disconnect() {
		if(!this.#device.gatt.connected) {
			throw new Error("Not connected");
		}

		// Unsubscribe from the RX characteristic
		await this.#unsubscribe();

		// Disconnect from the device
		this.#device.gatt.disconnect();
	}

	// Connect the GATT server
	async #connectGatt() {
		// If the server is already connected, return false
		if(this.#device.gatt.connected) {
			return false;
		}

		console.warn("connecting to the GATT server");

		// Connect to the GATT server
		await this.#device.gatt.connect();

		// If we got this far, the connection succeeded
		return true;
	}

	// Returns the primary bluetooth service used to manage locks
	async #getService() {
		if(!this.#service) {
			console.warn("getting the primary service");

			// Make sure the device is connected
			await this.#connectGatt();

			// Get the primary service
			this.#service = await this.#device.gatt.getPrimaryService(SERVICE_UUID);

			console.warn("finished getting the primary service");
		}

		return this.#service;
	}

	// Get the Rx characteristic
	async #getRxCharacteristic() {
		if(!this.#rx_char) {
			console.warn("getting the RX characteristic");

			const service = await this.#getService();
			const char    = await service.getCharacteristic(RX_CHARACTERISTIC_UUID);

			console.warn("finished getting the RX characteristic");

			this.#rx_char = char;
		}

		return this.#rx_char;
	}

	// Get the Tx characteristic
	async #getTxCharacteristic() {
		if(!this.#tx_char) {
			console.warn("getting the TX characteristic");

			const service = await this.#getService();
			const char    = await service.getCharacteristic(TX_CHARACTERISTIC_UUID);

			console.warn("finished getting the TX characteristic");

			this.#tx_char = char;
		}

		return this.#tx_char;
	}

	/**
	 * Send a message, breaking into multipart messages if necessary
	 * @param {Number|String|Uint8Array|Message|Map} data      The data to send
	 * @param {Boolean}                              multipart True/false to force multipart/singlepart, or null to calculate automatically
	 */
	async #send(data, multipart = null) {
		// CBOR-encode the message data
		let bytes = encodeMap(data);

		// If there is a secure connection, encrypt the data
		if(this.#eax_client) {
			bytes = new Uint8Array(await this.#eax_client.encrypt(bytes));
		}

		// Split messages into multipart packets automatically
		if(multipart === null) {
			multipart = bytes.length > MESSAGE_SIZE;
		}

		// Store the write responses
		const results = [];

		// For multipart messages
		if(multipart) {
			// Split the message into blocks
			for(let i = 0; i < bytes.length; i += BLOCK_SIZE) {
				const block = bytes.slice(i, i + BLOCK_SIZE);

				// Split each block into packets
				for(let z = 0; z < block.length; z += MESSAGE_SIZE) {
					// Get the packet data and type
					const packet = block.slice(z, z + MESSAGE_SIZE);
					const type   = z === 0 ? PACKET_TYPES.MULTIPART_FIRST : (z + MESSAGE_SIZE >= block.length ? PACKET_TYPES.MULTIPART_LAST : PACKET_TYPES.MULTIPART_MIDDLE);

					// Send packets in order
					results.push(await this.#sendWithType(packet, type));
				}
			}
		}
		else {
			// For singlepart messages, send all the data at once
			results.push(await this.#sendWithType(bytes, PACKET_TYPES.SINGLEPART));
		}

		// Return the write responses
		return results;
	}

	/**
	 * Send a request to the lock
	 * @param {Request} request The request to send
	 * @param {Boolean} secure  If true, wait for authorization
	 * @param {Number}  timeout How long to wait for the response
	 */
	async #request(request, secure = true, timeout = DEFAULT_TIMEOUT) {
		// When to time out
		const stop = Date.now() + timeout;

		// Wait for the lock to be authorized and idle
		while((secure && (!this.#eax_client || !this.#eax_server)) || this.busy) {
			if(Date.now() > stop) {
				throw new Error("Timed out");
			}

			await new Promise((r) => setTimeout(r, 500));
		}

		// Claim the device
		this.claim();

		// Send the request
		await this.#send(request);

		// Get the response
		const response = await waitForEvent(this, 'message', timeout);

		// Release the device
		this.release();

		// Call the response handler and return the response
		return request.handleRawResponse(response);
	}

	/**
	 * Add/update an access code
	 * @param {AccessCode} code The AccessCode object (set the UUID to update an existing access code)
	 */
	async setAccessCode(code) {
		// Clear the cached access codes
		this.#access_codes = null;

		// If this is an update
		if(code.uuid) {
			console.warn('checking for existing access code');

			// Get the current access code
			const current = await this.getAccessCode(code.code);

			// Assign any undefined properties to the update object
			for(let [ key, value ] of current.entries()) {
				code.set(key, code.get(key) ?? value);
			}
		}

		console.warn('saving access code');

		// Send the request
		await this.#request(new Requests.SetAccessCode(code));

		// Get the updated access code
		return await this.getAccessCode(code.code);
	}

	// Increment the packet counter
	#incrementPacketCtr() {
		if(++this.#ctr > 7) {
			this.#ctr = 0;
		}
	}

	/**
	 * Get a message request header and increment the packet counter
	 * @param   {Number} type   The message type
	 * @param   {Number} offset The byte offset
	 * @returns {Number}        The message header
	 */
	#getMessageHeader(type, offset = 0) {
		const upper = this.#ctr + offset;

		// Validate the offset
		if(upper > 15) {
			throw new Error("Invalid offset");
		}

		// Validate the type
		if(type > 15) {
			throw new Error("Invalid type");
		}

		// Generate the header byte
		const byte = +`0x${upper.toString(16)}${type.toString(16)}`;

		// Increment the packet counter
		this.#incrementPacketCtr();

		return byte;
	}

	// Get a connection request header and increment the packet counter
	#getConnectionRequestHeader() {
		return this.#getMessageHeader(0, 8);
	}

	// Claim the lock for an exclusive operation
	claim() {
		if(this.#busy) {
			throw new Error("Lock is busy");
		}

		this.#busy = true;
	}

	// Release the lock claim
	release() {
		this.#busy = false;
	}

	/**
	 * Write raw data to the TX characteristic
	 * @param {Uint8Array} data The data to write
	 */
	async #write(data) {
		// Get the TxData characteristic
		const tx = await this.#getTxCharacteristic();

		// Write to the characteristic
		await tx.writeValueWithResponse(data);
	}

	/**
	 * Send a message with a known type
	 * @param {Uint8Array} data The data to send
	 * @param {Number}     type The message type
	 */
	async #sendWithType(data, type) {
		// Get the message header and bytes
		const header = this.#getMessageHeader(type);
		const bytes  = new Uint8Array([ header, ...data ]);

		return await this.#write(bytes);
	}

	/**
	 * Send a connection request
	 * @param {Uint8Array} secure_salt For a secure connection request, a random 12-byte salt
	 */
	async #connect(secure_salt = null) {
		const prefix = secure_salt === null ? INSECURE_CONNECTION_PREFIX : SECURE_CONNECTION_PREFIX;
		const bytes  = new Uint8Array([ ...REQUEST_PREFIX, ...prefix, ...(secure_salt ?? []) ]);
		const header = this.#getConnectionRequestHeader();

		await this.#write(new Uint8Array([ header, ...bytes ]));

		return await waitForEvent(this, 'internal');
	}

	// Get the random server/client bytes used to set up a session
	async #getSessionSalts() {
		// Generate the client salt
		const client_salt = crypto.getRandomValues(new Uint8Array(12));

		// Send the connection request and receive the server salt
		const response = await this.#connect(client_salt);

		// The response should be exactly 17 bytes long
		if(response.length != 17) {
			throw new Error("Invalid response for connection request");
		}

		// The last 12 bytes of the response are the server salt
		const server_salt = response.slice(5);

		// Return the client/server salts
		return { client_salt, server_salt };
	}

	/**
	 * Send the authentication challenge, verify the response, and return the computed session secret
	 * @param   {String}              sat         The session encryption secret
	 * @param   {Uint8Array}          client_salt The client's random salt
	 * @param   {Uint8Array}          server_salt The server's random salt
	 * @returns {Promise<Uint8Array>}             The computed session secret
	 */
	async #sendServerChallenge(sat, client_salt, server_salt) {
		// Decode the SAT
		const sat_buffer = decode(fromHex(sat));

		// Further decode the SAT
		const [ challenge, secret ] = decodeAll(sat_buffer);

		// Calculate the challenge/response hashes
		const challenge_hash = await SenseLock.#calculateAuthHash(AUTH_CHALLENGE_PREFIX, client_salt, server_salt, secret);
		const response_hash  = await SenseLock.#calculateAuthHash(AUTH_RESPONSE_PREFIX, client_salt, server_salt, secret);

		// Add this value for some reason
		challenge.push(new Uint8Array([ SEPARATOR_BYTE ]));

		// Send the challenge
		await this.#send(encodeAll(challenge, challenge_hash));

		console.warn('sent');

		// Receive the response hash
		const response = await new Promise((r) => this.once('data', r));

		// Verify the response hash
		if(!arrayEquals(response_hash, response)) {
			throw new Error("Failed challenge/response");
		}

		// The SAT tag is used as the session secret
		return secret;
	}

	// Unsubscribe from the RX channel
	async #unsubscribe() {
		// If not subscribed, return false
		if(!this.#subscribed) {
			return false;
		}

		// Get the RX characteristic and the configuration descriptor
		const rx = await this.#getRxCharacteristic();

		// Unsubscribe from notifications on the RX characteristic
		await rx.stopNotifications();

		// If there is an event listener
		if(rx[RX_CB_SYMBOL]) {
			// Remove it
			rx.removeEventListener('characteristicvaluechanged', rx[RX_CB_SYMBOL]);

			// Delete the callback function
			delete rx[RX_CB_SYMBOL];
		}

		// Clear the subscribed flag
		this.#subscribed = false;

		// If we got this far, unsubscribe succeeded
		return true;
	}

	// Subscribe to the RX channel
	async #subscribe() {
		// Check if there is already a subscription
		if(this.#subscribed) {
			return false;
		}

		console.warn("subscribing to receive notifications");

		// Get the RX characteristic and the configuration descriptor
		const rx = await this.#getRxCharacteristic();

		// Store multipart message packets in a buffer
		let rx_buffer = new Uint8Array();

		// Store the callback on the rx characteristic
		rx[RX_CB_SYMBOL] = (e) => {
			// Get the message type and bytes
			const data  = new Uint8Array(e.target.value.buffer);
			const type  = data[0] & MESSAGE_TYPE_MASK;
			const bytes = data.slice(1);

			// For internal and single-part messages, just emit an event
			if(type === PACKET_TYPES.INTERNAL) {
				this.emit('internal', bytes);
			}
			else if(type === PACKET_TYPES.SINGLEPART) {
				this.emit('data', bytes);
			}
			else if(type === PACKET_TYPES.MULTIPART_FIRST) {
				// Start a new RX buffer
				rx_buffer = bytes;
			}
			else if(type === PACKET_TYPES.MULTIPART_MIDDLE || type === PACKET_TYPES.MULTIPART_LAST) {
				// Append to the RX buffer
				rx_buffer = new Uint8Array([ ...rx_buffer, ...bytes ]);

				// If this is the last packet
				if(type === PACKET_TYPES.MULTIPART_LAST) {
					// Emit a data event
					this.emit('data', rx_buffer);

					// Reset the RX buffer
					rx_buffer = new Uint8Array();
				}
			}
			else {
				console.warn("Unhandled data:", { type, bytes });
			}
		};

		// Receive and emit data events from the RX characteristic
		rx.addEventListener('characteristicvaluechanged', rx[RX_CB_SYMBOL]);

		// Subscribe to notifications on the RX characteristic
		await rx.startNotifications();

		// Set the subscribed flag
		this.#subscribed = true;

		// If we got this far, subscribe succeeded
		return true;
	}

	/**
	 * Find Schlage Sense locks
	 * @param   {Boolean}              paired  Pass true/false to limit to paired/unpaired locks
	 * @param   {(Uint8Array|String)?} address Search for locks with the given MAC address
	 * @returns {Promise<SenseLock>}           The found lock
	 */
	static async find(paired = null, address = null) {
		while(true) {
			try {
				// Get the device
				const { device, address : tmp_address } = await this.#getDevice(paired, address);

				// Connect to the GATT server
				await device.gatt.connect();

				// Create a SenseLock object
				return new SenseLock(device, tmp_address);
			}
			catch(e) {
				console.warn(e);
			}
		}
	}

	/**
	 * Find Schlage Sense bluetooth devices
	 * @param   {Boolean}              paired  Pass true/false to limit to paired/unpaired locks
	 * @param   {(Uint8Array|String)?} address Search for locks with the given MAC address
	 * @returns {Promise<Object>}              An object with keys 'device' and 'address'
	 */
	static async #getDevice(paired = null, address = null) {
		// Get the scanning filter
		const filter = getSenseScanFilter(paired, address);

		// Special handling for NodeJS as scanning with the current webbluetooth/SimpleBLE version is very buggy
		if(typeof window === 'undefined') {
			const { Bluetooth }  = await import("webbluetooth");
			const company_id_str = COMPANY_ID.toString();

			const bluetooth = new Bluetooth({
				scanTime        : 30,
				allowAllDevices : true,

				deviceFound : (device) => {
					if(filter.name && device.name !== filter.name) {
						return false;
					}

					if(device._adData.manufacturerData.has(company_id_str)) {
						const view = device._adData.manufacturerData.get(company_id_str);
						const data = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);

						for(let mfr of filter.manufacturerData ?? []) {
							// If the device matches the manufacturer data filter, use it
							if(!mfr.dataPrefix || filterManufacturerData(data, mfr.dataPrefix, mfr.mask ?? null)) {
								return true;
							}
						}
					}

					return false;
				},
			});

			const device = await bluetooth.requestDevice({
				acceptAllDevices : true,
				optionalServices : [ SERVICE_UUID ],
			});

			const mfr     = device._adData.manufacturerData.get(company_id_str);
			const address = (new Uint8Array(mfr.buffer, mfr.byteOffset, mfr.byteLength)).slice(MAC_ADDRESS_OFFSET, MAC_ADDRESS_OFFSET + 6);

			return { device, address };
		}
		else {
			// TODO: implement address for Chrome
			const device  = await navigator.bluetooth.requestDevice({ filters : [ filter ]});
			const address = new Uint8Array(6);

			return { device, address };
		}
	}

	/**
	 * Calculate hashes used for authentication
	 * @param {Uint8Array} prefix      Prefix for the hash data
	 * @param {Uint8Array} client_salt The client's random salt
	 * @param {Uint8Array} server_salt The server's random salt
	 * @param {Uint8Array} secret      The session authorization secret (the tag value from the SAT)
	 */
	 static async #calculateAuthHash(prefix, client_salt, server_salt, secret) {
		// Concatenate the data
		const bytes = new Uint8Array([ ...prefix, ...client_salt, ...server_salt ]);
		const data  = new Uint8Array([ SEPARATOR_BYTE, ...encode(bytes) ]);

		// Calculate the hash
		const hash = hmac(SHA256, secret, encode(data));
		const tag  = hash.slice(0, 16);

		return tag;
	}

	/**
	 * Create an EAX session ID and key
	 * @param {Uint8Array} client_salt The client's random salt
	 * @param {Uint8Array} server_salt The server's random salt
	 * @param {Uint8Array} secret      The session encryption secret
	 */
	static async #createSession(client_salt, server_salt, secret) {
		// Concatenate all the key material data
		const key_material = new Uint8Array([ ...SESSION_SALT_PREFIX, ...client_salt, ...server_salt, ...secret ]);

		// Compute the session key
		const hkdf  = new HKDF(SHA256, key_material, HKDF_SALT, HKDF_INFO);
		const bytes = hkdf.expand(32);

		// Split the session key into an ID + key
		const key = bytes.slice(0, 16);
		const id  = bytes.slice(16, 32);

		return { key, id };
	}
};

export { COMPANY_ID, SERVICE_UUID };
