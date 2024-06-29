import SimpleRequest from "../SimpleRequest.js";

export class ClaimOwnership extends SimpleRequest {
	constructor() {
		super([ 24, 4 ]);
	}
};
