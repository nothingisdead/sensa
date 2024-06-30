import { decode as fromHex, encode as toHex } from "@stablelib/hex";
import { COMPANY_ID, SERVICE_UUID } from '../SenseLock.js';

/**
 * Get a WebBluetooth scan filter for a Schlage Sense lock
 * @param   {Boolean?}             paired  Filter for paired/unpaired devices
 * @param   {(Uint8Array|String)?} address The device MAC address
 * @returns {Object}
 */
export default function getSenseScanFilter(paired = null, address = null) {
	// Convert Uint8Array MAC addresses to hex strings
	if(address instanceof Uint8Array) {
		address = toHex(address);
	}

	const mfr = {
		companyIdentifier : COMPANY_ID,
	};

	const filter = {
		services         : [ SERVICE_UUID ],
		manufacturerData : [ mfr ],
	};

	// Add filters
	if(paired !== null || address !== null) {
		const paired_mask    = paired  === null ? '00' : 'ff';
		const paired_prefix  = paired  === null ? '00' : (paired ? '02' : '01');
		const address_mask   = address === null ? '000000000000' : 'ffffffffffff';
		const address_prefix = address === null ? '000000000000' : address;

		Object.assign(mfr, {
			dataPrefix : fromHex(`000000${paired_prefix}000000${address_prefix}`),
			mask       : fromHex(`000000${paired_mask}000000${address_mask}`),
		});
	}

	return filter;
};
