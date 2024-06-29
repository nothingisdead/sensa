import EventEmitter from "events";

/**
 * Returns a promise that resolves the next time an event is emitted from an EventEmitter
 * @param   {EventEmitter} obj     The EventEmitter object
 * @param   {String}       event   The event to wait for
 * @param   {Number}       timeout How long to wait
 * @param   {String}       error   The error message to throw if the timeout is exceeded
 * @returns {Promise<any>}
 */
export default function waitForEvent(obj, event, timeout = 10000, error = "Timed out") {
	return new Promise((resolve, reject) => {
		const reject_callback = (error) => {
			obj.off(event, resolve_callback);
			clearTimeout(timer);
			reject(error);
		};

		const resolve_callback = (result) => {
			clearTimeout(timer);
			resolve(result);
		};

		// Reject after the timeout
		const timer = setTimeout(() => reject_callback(error), timeout);

		// Resolve once the event is fired
		obj.once(event, resolve_callback);
	});
};
