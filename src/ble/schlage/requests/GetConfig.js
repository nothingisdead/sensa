import Request from "../Request.js";

export class GetConfig extends Request {
	/**
	 * Create a get request message from a command
	 * @param {Number} command A command from Constants.GET_LOCK_CONFIG
	 */
	constructor(command) {
		super([ 8, 4 ], 5, command);
	}
};
