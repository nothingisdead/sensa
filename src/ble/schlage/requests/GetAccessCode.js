import Request from "../Request.js";
import AccessCode from "../../../AccessCode.js";

const KEY_HAS_MORE = 10;

export class GetAccessCode extends Request {
	constructor() {
		super([ 8, 4 ], 4, 5);
	}

	/**
	 * Map the response to an AccessCode object
	 * @param   {Map}    data The response data
	 * @returns {Object}      An object with keys 'more' and 'result'
	 */
	handleResponse(data) {
		const response = super.handleResponse(data);
		const more     = response.get(KEY_HAS_MORE) === 1;
		const result   = new AccessCode(response);

		return { more, result };
	}
};
