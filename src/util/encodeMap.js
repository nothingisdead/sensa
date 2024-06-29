import { encode } from '@stablelib/cbor';

const objectify = (value) => {
	if(typeof value === 'object') {
		if(value instanceof Map) {
			value = Object.fromEntries(value.entries());
		}

		for(let k in value) {
			if(typeof value[k] === 'object') {
				value[k] = objectify(value[k]);
			}
		}
	}

	return value;
};

/**
 * @param   {any}        value
 * @param   {Object}     opts
 * @returns {Uint8Array}
 */
export default function encodeMap(value, opts = {}) {
	return encode(objectify(value), { ...opts, intKeys : true });
};
