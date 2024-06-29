import Request from "../Request.js";
import { decode } from "@stablelib/hex";

const KEY_TIMESTAMP = 1;

export class SendCAT extends Request {
	/**
	 * @param {String}  CAT
	 * @param {Boolean} new_device
	 */
	constructor(CAT, new_device) {
		const type = new_device ? 3 : 1;
		const mode = new_device ? 1 : 2;

		super([ 5, type ], mode, 0, decode(CAT));
	}

	/**
	 * Map the response to a Unix timestamp
	 * @param   {Map}    data The response data
	 * @returns {Number}      The current timestamp
	 */
	handleResponse(data) {
		return data.get(KEY_TIMESTAMP);
	}
};
