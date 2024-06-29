import Request from "../Request.js";

export class GetInfo extends Request {
	/**
	 * Create a get request message from a command
	 * @param command A command from Constants.GET_LOCK_INFO
	 */
	constructor(command) {
		super([ 8, 4 ], 1, command);
	}
};
