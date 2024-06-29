import LogEntry from "../../../LogEntry.js";
import Request from "../Request.js";

const KEY_HAS_MORE = 4;
const KEY_LOG0     = 10;
const KEY_LOG1     = 11;
const KEY_LOG2     = 12;
const KEY_LOG3     = 13;
const KEY_LOG4     = 14;

export class GetLogEntry extends Request {
	constructor(group = 1) {
		super([ 8, 3 ], 3, group);
	}

	/**
	 * Map the response to a LogEntry list
	 * @param   {Map}    data The response data
	 * @returns {Object}      An object with keys 'more' and 'result'
	 */
	handleResponse(data) {
		const response = super.handleResponse(data);
		const more     = response.get(KEY_HAS_MORE) === 1;
		const result   = [];

		if(response.has(KEY_LOG0)) {
			for(let key in [ KEY_LOG0, KEY_LOG1, KEY_LOG2, KEY_LOG3, KEY_LOG4 ]) {
				const log_data = response.get(key) ?? null;

				if(log_data !== null) {
					result.push(new LogEntry(log_data));
				}
			}
		}
		else {
			result.push(new LogEntry(response));
		}

		return { more, result };
	}
};
