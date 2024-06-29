import SimpleRequest from "./SimpleRequest.js";
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

export default class Request extends SimpleRequest {
	/**
	 * Get the response for this request
	 * @param   {Map} data The message data
	 * @returns {any}      The response
	 */
	handleResponse(data) {
		let response = super.handleResponse(data).get(KEY.RESPONSE);

		// Trim string responses
		if(typeof response === 'string') {
			response = response.trim();
		}

		return response;
	}
}
