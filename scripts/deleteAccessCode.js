import SenseLock from "../src/SenseLock.js";

if(process.argv.length < 3 || !process.argv[2].match(/^\d{4,8}$/)) {
	throw new Error("Usage: node --env-file=.env.FRONT_DOOR scripts/deleteAccessCode.js 123456");
}

// Find the lock
const lock = await SenseLock.find(true, process.env.NAME ?? null);

// Authorize the session
if(process.env.CAT && process.env.SAT) {
	await lock.authorize(process.env.CAT, process.env.SAT);
}

// Delete the access code
await lock.deleteAccessCode(+process.argv[2]);

if(lock.connected) {
	await lock.disconnect();
}
