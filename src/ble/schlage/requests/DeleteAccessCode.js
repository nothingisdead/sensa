import Request from "../Request.js";
import { KEY as ACCESS_CODE_KEY } from "../../../AccessCode.js";

export class DeleteAccessCode extends Request {
	/**
	 * @param {Number} code The access code
	 */
	constructor(code) {
		const access_code = new Map([
			[ ACCESS_CODE_KEY.CODE, code ],
		]);

		super([ 8, 2 ], 4, 1, access_code);
	}
};
