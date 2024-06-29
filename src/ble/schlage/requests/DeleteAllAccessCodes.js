import Request from "../Request.js";

export class DeleteAllAccessCodes extends Request {
	constructor() {
		super([ 8, 5 ], 4, 2);
	}
};
