import SenseLock from "../src/SenseLock.js";
import { SET_LOCK_STATE } from "../src/ble/schlage/Constants.js";

// Find the lock
const lock = await SenseLock.find(true, process.env.MAC_ADDRESS ?? null);

// Authorize the session
if(process.env.CAT && process.env.SAT) {
	await lock.authorize(process.env.CAT, process.env.SAT);
}

// Set the secured state
await lock.setState(SET_LOCK_STATE.TIMESTAMP, Math.floor(Date.now() / 1000));

if(lock.connected) {
	await lock.disconnect();
}
