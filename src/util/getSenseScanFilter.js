import { decode as fromHex } from "@stablelib/hex";
import { COMPANY_ID, SERVICE_UUID } from '../SenseLock.js';

/**
 * Get a WebBluetooth scan filter for a Schlage Sense lock
 * @param   {Boolean?} paired
 * @param   {String?}  name
 * @returns {Object}
 */
export default function getSenseScanFilter(paired = null, name = null) {
	const mfr = {
		companyIdentifier : COMPANY_ID,
	};

	const filter = {
		services         : [ SERVICE_UUID ],
		manufacturerData : [ mfr ],
	};

	// If the "paired" filter is set, filter by device state
	if(paired !== null) {
		const paired_mask    = (paired === false ? '0' : 'f').repeat(2);
		const paired_prefix  = paired === false ? '00' : (paired ? '02' : '01');

		Object.assign(mfr, {
			dataPrefix : fromHex(`000000${paired_prefix}`),
			mask       : fromHex(`000000${paired_mask}`),
		});
	}

	// If the "name" filter is set, filter by name
	if(name !== null) {
		Object.assign(filter, { name });
	}

	return filter;
};
