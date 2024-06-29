import { decode } from '@stablelib/cbor';

const mapify = (value) => {
	if(typeof value === 'object' && !(value instanceof Map) && !(value instanceof Array) && !(value instanceof Uint8Array)) {
		const map = new Map();

		for(let [ k, v ] of Object.entries(value)) {
			if(typeof v === 'object') {
				v = mapify(v);
			}

			map.set(+k, v);
		}

		return map;
	}

	return value;
};

/**
 * @param   {Uint8Array} value
 * @param   {Object}     opts
 * @returns {Map}
 */
export default function decodeObject(value, opts = {}) {
	return mapify(decode(value));
};
