import SimpleRequest from "../SimpleRequest.js";

export class StartPairing extends SimpleRequest {
	constructor() {
		super([ 2, 1 ], 1, 0);
	}
};
