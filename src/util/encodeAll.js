import { Encoder } from '@stablelib/cbor';

export default function encodeAll(...data) {
	const encoder = new Encoder();

	for(let item of data) {
		encoder.encode(item);
	}

	return encoder.finish();
};
