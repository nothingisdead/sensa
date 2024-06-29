import Request from "../Request.js";
import LockData from "../../../LockData.js";
import { decode as fromHex } from "@stablelib/hex";

export class SetState extends Request {
	/**
	 * @param {Number} command A command from Constants.SET_LOCK_STATE
	 * @param {Number} arg     The value
	 * @param {String} user_id The user ID
	 */
	constructor(command, arg, user_id) {
		// Remove any hyphens from the UUID
		user_id = user_id.replace(/\-/g, '');

		// Create the set request data
		const data = new Map([
			[ 0, arg ],
			[ 1, fromHex(user_id) ],
		]);

		super([ 8, 7 ], 1, command, data);
	}

	/**
	 * Map the response to a LockData object
	 * @param   {Map}      data The response data
	 * @returns {LockData}      The LockData object
	 */
	handleResponse(data) {
		return new LockData(super.handleResponse(data));
	}
};
