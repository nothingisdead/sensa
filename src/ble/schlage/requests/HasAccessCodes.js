import Request from "../Request.js";

export class HasAccessCodes extends Request {
	constructor() {
		super([ 8, 3 ], 4, 6, new Map([
			[ 0, 0 ],
		]));
	}
};
