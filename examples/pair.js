import SenseLock from "../src/SenseLock.js";

if(process.argv.length < 3) {
	throw new Error("Usage: node examples/pair.js 123456 > .env.FRONT_DOOR");
}

const pin  = +process.argv[2];
const lock = await SenseLock.find(false);

try {
	console.warn(`Pairing ${lock.device.name}`);
	console.warn(`Please enter ${`000000${pin}`.slice(-6)}0 on the keypad`);

	const { cat, sat } = await lock.pair(pin);

	console.log(`CAT=${cat}\nSAT=${sat}\nNAME=${lock.device.name}`);
}
finally {
	if(lock.connected) {
		await lock.disconnect();
	}
}
