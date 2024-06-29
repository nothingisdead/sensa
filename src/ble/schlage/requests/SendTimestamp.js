import SimpleRequest from "../SimpleRequest.js";

const SIGN_INT = Math.pow(2, 32);

export class SendTimestamp extends SimpleRequest {
	/**
	 * @param {Number}     n
	 * @param {Uint8Array} ts_encrypted
	 * @param {Uint8Array} client_commitment
	 */
	constructor(n, ts_encrypted, client_commitment) {
		// Make sure n is positive
		if(n < 0) {
			n += SIGN_INT;
		}

		super([ 3, 2 ], n, client_commitment, ts_encrypted);
	}
};
