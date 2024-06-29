import Request from "../Request.js";
import AccessCode, { KEY as ACCESS_CODE_KEY } from "../../../AccessCode.js";
import { v4 as uuid } from "uuid";

export class SetAccessCode extends Request {
	/**
	 * Create a request to add/update an access code
	 * @param {AccessCode} code The AccessCode object
	 */
	constructor(code) {
		if(!code.code) {
			throw new Error("The 'code' property is required");
		}

		// If there is a UUID, this is an update
		const update = !!code.uuid;

		// For new access codes, generate a UUID
		if(!update) {
			code.uuid = uuid();
		}

		// Provide a default name
		if(!code.name) {
			code.name = `auto-${Math.random().toString(36).substr(2, 6)}`;
		}

		// Terminate the name with a null byte
		if(!code.name.endsWith('\0')) {
			code.name = `${code.name}\0`;
		}

		// Create the access code message with the required parameters
		const access_code = new Map([
			[ ACCESS_CODE_KEY.UUID, code.uuid ],
			[ ACCESS_CODE_KEY.NAME, code.name ],
			[ ACCESS_CODE_KEY.CODE, code.code ],
			[ ACCESS_CODE_KEY.BLOCKED, code.blocked ? 1 : 0 ],
		]);

		// Set any recurring schedules, if given
		if(code.schedule1 !== undefined) {
			access_code.set(ACCESS_CODE_KEY.SCHEDULE1, code.schedule1.bytes);
		}

		if(code.schedule2 !== undefined) {
			access_code.set(ACCESS_CODE_KEY.SCHEDULE2, code.schedule2.bytes);
		}

		// Set start/end timestamps, if given
		if(code.start_timestamp !== undefined) {
			access_code.set(ACCESS_CODE_KEY.START_TIMESTAMP, code.start_timestamp);
		}

		if(code.end_timestamp !== undefined) {
			access_code.set(ACCESS_CODE_KEY.END_TIMESTAMP, code.end_timestamp);
		}

		// Create the request
		super([ 8, 3 ], 4, update ? 4 : 0, access_code);
	}
};
