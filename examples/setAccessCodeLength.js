import SenseLock from "../src/SenseLock.js";
import { SET_LOCK_CONFIG } from "../src/ble/schlage/Constants.js";

if(process.argv.length < 3 || +process.argv[2] < 4 || +process.argv[2] > 8) {
	throw new Error("Usage: node --env-file=.env.FRONT_DOOR examples/setAccessCodeLength.js 6");
}

// Find the lock
const lock = await SenseLock.find(true, process.env.NAME ?? null);

// Authorize the session
if(process.env.CAT && process.env.SAT) {
	await lock.authorize(process.env.CAT, process.env.SAT);
}

// Set the access code length
await lock.setConfig(SET_LOCK_CONFIG.ACCESS_CODE_LENGTH, +process.argv[2]);

if(lock.connected) {
	await lock.disconnect();
}
