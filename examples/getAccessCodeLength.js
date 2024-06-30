import SenseLock from "../src/SenseLock.js";
import { GET_LOCK_CONFIG } from "../src/ble/schlage/Constants.js";

// Find the lock
const lock = await SenseLock.find(true, process.env.MAC_ADDRESS ?? null);

// Authorize the session
if(process.env.CAT && process.env.SAT) {
	await lock.authorize(process.env.CAT, process.env.SAT);
}

// Get the access codes
console.log(`Access code length: ${await lock.getConfig(GET_LOCK_CONFIG.ACCESS_CODE_LENGTH)}`);

if(lock.connected) {
	await lock.disconnect();
}
