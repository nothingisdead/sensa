import { Decoder } from '@stablelib/cbor';

/**
 *
 * @param   {Uint8Array} bytes
 * @returns {Array}
 */
export default function decodeAll(bytes) {
	const decoder = new Decoder(bytes, { ignoreExtraData : true });
	const items   = [];

	while(decoder.undecodedLength) {
		items.push(decoder.decode());
	}

	return items;
};
