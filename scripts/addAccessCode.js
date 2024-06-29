import SenseLock from "../src/SenseLock.js";
import AccessCode from "../src/AccessCode.js";

if(process.argv.length < 3 || !process.argv[2].match(/^\d{4,8}$/)) {
	throw new Error("Usage: node --env-file=.env.FRONT_DOOR scripts/addAccessCode.js 123456");
}

// Find the lock
const lock = await SenseLock.find(true, process.env.NAME ?? null);

// Authorize the session
if(process.env.CAT && process.env.SAT) {
	await lock.authorize(process.env.CAT, process.env.SAT);
}

const access_code = new AccessCode();

// Set the access code
access_code.code = +process.argv[2];

// Set the access code
await lock.setAccessCode(access_code);

if(lock.connected) {
	await lock.disconnect();
}
