import EAXBase from './EAXBase.js';

export default class EAXSession {
	/** Message counter */
	#ctr = 0;

	/** EAX session ID */
	#session_id;

	/** A value that gets injected into the nonce */
	#nonce_prefix;

	/** EAX encryption/decryption */
	#eax;

	/**
	 * Create an EAX Session
	 * @param {Uint8Array} session_id   The EAX session ID
	 * @param {Uint8Array} session_key  The EAX session key
	 * @param {Uint8Array} nonce_prefix The EAX session nonce prefix (this value gets injected into the nonce)
	 */
	constructor(session_id, session_key, nonce_prefix = new Uint8Array()) {
		this.#session_id   = session_id;
		this.#nonce_prefix = nonce_prefix;
		this.#eax          = new EAXBase(session_key);
	}

	/**
	 * Encrypt some data for an EAX session
	 * @param {Uint8Array} data The data to be encrypted
	 */
	async encrypt(data) {
		const nonce = new Uint8Array([ ...this.#session_id, ...this.#nonce_prefix, ++this.#ctr ]);
		const bytes = await this.#eax.encrypt(data, nonce, new Uint8Array());

		return bytes;
	}

	/**
	 * Decrypt some data from an EAX session
	 * @param {Uint8Array} data The data to be decrypted
	 */
	async decrypt(data) {
		const nonce = new Uint8Array([ ...this.#session_id, ...this.#nonce_prefix, ++this.#ctr ]);
		const bytes = await this.#eax.decrypt(data, nonce, new Uint8Array());

		return bytes;
	}
}
