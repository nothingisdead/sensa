import Schedule from "./Schedule.js";
import { encode as toHex, decode as fromHex } from "@stablelib/hex";

const KEY = {
	UUID            : 0,
	NAME            : 1,
	CODE            : 2,
	SCHEDULE1       : 3,
	SCHEDULE2       : 4,
	BLOCKED         : 5,
	START_TIMESTAMP : 6,
	END_TIMESTAMP   : 7,
};

export default class AccessCode extends Map {
	constructor(...args) {
		super(...args);

		// Create a default schedule for schedule 1 if necessary
		if((this.schedule1_bytes || []).every((n) => n === 0)) {
			this.schedule1 = Schedule.create();
		}
	}

	/**
	 * @returns {String} The access code name
	 */
	get name() {
		return this.get(KEY.NAME);
	}

	/**
	 * @param {String} value The access code name
	 */
	set name(value) {
		this.set(KEY.NAME, value);
	}

	/**
	 * @returns {Number} The access code
	 */
	get code() {
		return this.get(KEY.CODE);
	}

	/**
	 * @param {Number} value The access code
	 */
	set code(value) {
		this.set(KEY.CODE, value);
	}

	/**
	 * @returns {Uint8Array} The schedule bytes for the primary schedule
	 */
	get schedule1_bytes() {
		return this.get(KEY.SCHEDULE1);
	}

	/**
	 * @returns {Schedule} The primary schedule
	 */
	get schedule1() {
		return new Schedule(this.schedule1_bytes);
	}

	/**
	 * @param {Schedule} value The primary schedule
	 */
	set schedule1(value) {
		this.set(KEY.SCHEDULE1, value.bytes);
	}

	/**
	 * @returns {Uint8Array} The schedule bytes for the secondary schedule
	 */
	get schedule2_bytes() {
		return this.get(KEY.SCHEDULE2);
	}

	/**
	 * @returns {Schedule} The secondary schedule
	 */
	get schedule2() {
		return new Schedule(this.schedule2_bytes);
	}

	/**
	 * @param {Schedule} value The secondary schedule
	 */
	set schedule2(value) {
		this.set(KEY.SCHEDULE2, value.bytes);
	}

	/**
	 * @returns {Boolean} Whether the access code is blocked
	 */
	get blocked() {
		return this.get(KEY.BLOCKED) === 1;
	}

	/**
	 * @param {Boolean} value Whether the access code is blocked
	 */
	set blocked(value) {
		this.set(KEY.BLOCKED, value ? 1 : 0);
	}

	/**
	 * @returns {Number} The starting unix timestamp for this access code
	 */
	get start_timestamp() {
		return this.get(KEY.START_TIMESTAMP);
	}

	/**
	 * @param {Number} value The starting unix timestamp for this access code
	 */
	set start_timestamp(value) {
		this.set(KEY.START_TIMESTAMP, value);
	}

	/**
	 * @returns {Number} The ending unix timestamp for this access code
	 */
	get end_timestamp() {
		return this.get(KEY.END_TIMESTAMP);
	}

	/**
	 * @param {Number} value The ending unix timestamp for this access code
	 */
	set end_timestamp(value) {
		this.set(KEY.END_TIMESTAMP, value);
	}

	/**
	 * @returns {Uint8Array} The access code UUID
	 */
	get uuid() {
		return this.get(KEY.UUID);
	}

	/**
	 * @param {Uint8Array|String} value The access code UUID
	 */
	set uuid(value) {
		if(typeof value === 'string') {
			value = fromHex(value.replace(/-/g, ''));
		}

		this.set(KEY.UUID, value);
	}

	/**
	 * @returns {Object} A JSON representation of the access code
	 */
	toJSON() {
		const {
			uuid,
			code,
			name,
			start_timestamp,
			end_timestamp,
			schedule1,
			schedule2,
			blocked,
		} = this;

		return {
			uuid : toHex(uuid),
			schedule1,
			schedule2,
			code,
			name,
			start_timestamp,
			end_timestamp,
			blocked,
		};
	}
};

export { KEY };
