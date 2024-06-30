import SenseLock from "../src/SenseLock.js";
import { SET_LOCK_CONFIG } from "../src/ble/schlage/Constants.js";

if(process.argv.length < 3 || +process.argv[2] < 0 || +process.argv[2] > 300) {
	throw new Error("Usage: node --env-file=.env.FRONT_DOOR examples/setAutoLockDelay.js 30");
}

// Find the lock
const lock = await SenseLock.find(true, process.env.MAC_ADDRESS ?? null);

// Authorize the session
if(process.env.CAT && process.env.SAT) {
	await lock.authorize(process.env.CAT, process.env.SAT);
}

// Set the auto lock delay
await lock.setConfig(SET_LOCK_CONFIG.AUTO_LOCK_DELAY, +process.argv[2]);

if(lock.connected) {
	await lock.disconnect();
}
