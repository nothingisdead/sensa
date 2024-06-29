import SenseLock from "../src/SenseLock.js";

// Find the lock
const lock = await SenseLock.find(true, process.env.NAME ?? null);

// Authorize the session
if(process.env.CAT && process.env.SAT) {
	await lock.authorize(process.env.CAT, process.env.SAT);
}

// Get the access codes
console.log(JSON.stringify(await lock.getAccessCodes(), null, "\t"));

if(lock.connected) {
	await lock.disconnect();
}
