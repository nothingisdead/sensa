import { encode } from "@stablelib/hex";
/**
 * Utility function to filter bluetooth manufacturer data
 * @param {Uint8Array} data
 * @param {Uint8Array} prefix
 * @param {Uint8Array?} mask
 */
export default function filterManufacturerData(data, prefix, mask = null) {
	// For each byte in the prefix
	for(let i = 0; i < prefix.byteLength; i++) {
		// Get the prefix byte
		const byteA = mask === null ? prefix[i] : prefix[i] & mask[i];

		// Get the data byte
		const byteB = mask === null ? data[i] : data[i] & mask[i];

		// If the prefix byte doesn't match the data byte, return false
		if(byteA !== byteB) {
			return false;
		}
	}

	return true;
};
