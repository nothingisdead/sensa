import Request from "../Request.js";

export class HasLogEntries extends Request {
	constructor() {
		super([ 8, 2 ], 3, 0, new Map([
			[ 0, 0 ],
		]));
	}
};
