import decodeObject from "../../util/decodeObject.js";

const KEY = {
	CLASS      : 1,
	TYPE       : 2,
	ERROR      : 3,
	ERROR_CODE : 4,
	TX_DATA    : 16,
	RX_DATA    : 17,
	RESPONSE   : 17,
};

export default class SimpleRequest extends Map {
	/**
	 *
	 * @param {Array<Number>} msg  An array of [ Message Class, Message Type ]
	 * @param {...any}        args Message values
	 */
	constructor(msg, ...args) {
		const [ msg_class, msg_type ] = msg;

		// Build the request
		const request = new Map([
			[ KEY.CLASS, msg_class ],
			[ KEY.TYPE, msg_type ],
		]);

		// Set optional arguments
		if(args.length) {
			const data = new Map();

			for(let i = 0; i < args.length; i++) {
				data.set(i, args[i]);
			}

			request.set(KEY.TX_DATA, data);
		}

		super(request);
	}

	/**
	 * Handles the raw response for a given request
	 * @param {Uint8Array} response
	 */
	handleRawResponse(response) {
		// CBOR-decode the message
		const message = decodeObject(response);

		// Get the message type, data, and error
		const data  = message.get(KEY.RX_DATA);
		const error = message.get(KEY.ERROR);

		// Check for errors
		if(error) {
			this.handleError(error.get(KEY.ERROR_CODE));
		}

		return this.handleResponse(data);
	}

	/**
	 * Handle the error for this request
	 * @param {Number} error The error Message
	 */
	handleError(error_code) {
		throw new Error(`Request error: ${error_code}`);
	}

	/**
	 * Handle the message data for this request
	 * @param   {any} data The message data
	 * @returns {any}      The response
	 */
	handleResponse(data) {
		return data;
	}
}
