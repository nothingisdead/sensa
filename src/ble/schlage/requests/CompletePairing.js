import SimpleRequest from "../SimpleRequest.js";

export class CompletePairing extends SimpleRequest {
	/**
	 * @param {Uint8Array} cat_buffer
	 */
	constructor(cat_buffer) {
		super([ 25, 5 ], cat_buffer);
	}
};
