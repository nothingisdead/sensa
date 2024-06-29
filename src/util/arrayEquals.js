/**
 *
 * @param   {Array|Uint8Array} a
 * @param   {Array|Uint8Array} b
 * @returns {Boolean}
 */
export default function arrayEquals(a, b) {
	if(a.length !== b.length) {
		return false;
	}

	return a.every((n, i) => b[i] === n);
};
