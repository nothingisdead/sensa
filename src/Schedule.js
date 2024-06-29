const DAYS = {
	SUNDAY    : 0b1000000,
	MONDAY    : 0b0100000,
	TUESDAY   : 0b0010000,
	WEDNESDAY : 0b0001000,
	THURSDAY  : 0b0000100,
	FRIDAY    : 0b0000010,
	SATURDAY  : 0b0000001,
	ALL       : 0b1111111,
	WEEKEND   : 0b1000001,
	WEEKDAYS  : 0b0111110,
};

const BYTES = {
	START_HOUR   : 0,
	START_MINUTE : 1,
	END_HOUR     : 2,
	END_MINUTE   : 3,
	DAYS         : 4,
};

export default class Schedule {
	#bytes;

	/**
	 * Create a Schedule from a Uint8Array
	 * @param {Uint8Array} bytes The Uint8Array object
	 */
	constructor(bytes = null) {
		// If bytes are not provided, create an empty schedule
		if(bytes === null) {
			bytes = new Uint8Array(5);
		}

		// Check the bytes length
		if(bytes.length !== 5) {
			throw new Error("Invalid length");
		}

		this.#bytes = bytes;
	}

	/**
	 * Create a recurring weekly schedule that can be represented by a 5-byte Uint8Array
	 * @param {Number} days         The days (@see set days())
	 * @param {Number} start_hour   The starting hour (@see set start_hour())
	 * @param {Number} start_minute The starting mniute (@see set start_minute())
	 * @param {Number} end_hour     The ending hour (@see set end_hour())
	 * @param {Number} end_minute   The ending minute (@see set end_minute())
	 */
	static create(days = DAYS.ALL, start_hour = 0, start_minute = 0, end_hour = 23, end_minute = 59) {
		const bytes    = new Uint8Array([ start_hour, start_minute, end_hour, end_minute, days ]);
		const schedule = new Schedule(bytes);

		return schedule;
	}

	// Get the underlying bytes
	get bytes() {
		return new Uint8Array(this.#bytes);
	}

	// Get the starting hour
	get start_hour() {
		return this.#bytes[BYTES.START_HOUR];
	}

	/**
	 * Set the starting hour
	 * @param {Number} hour A number between 0 and this.getEndHour()
	 */
	set start_hour(hour) {
		if(this.end_minutes < (hour * 60) + this.start_minute || hour < 0) {
			throw new Error("Invalid starting time");
		}

		this.#bytes[BYTES.START_HOUR] = hour;
	}

	// Get the ending hour
	get end_hour() {
		return this.#bytes[BYTES.END_HOUR];
	}

	/**
	 * Set the ending hour
	 * @param {Number} hour A number between this.getStartHour() and 23
	 */
	set end_hour(hour) {
		if((hour * 60) + this.end_minute > this.start_minutes || hour > 24) {
			throw new Error("Invalid starting time");
		}

		this.#bytes[BYTES.END_HOUR] = hour;
	}

	// Get the starting minute
	get start_minute() {
		return this.#bytes[BYTES.START_MINUTE];
	}

	/**
	 * Set the starting minute
	 * @param {Number} minute A number between 0 and this.getEndMinute()
	 */
	set start_minute(minute) {
		if(this.end_minutes < (this.start_hour * 60) + minute || minute > 24) {
			throw new Error("Invalid starting time");
		}

		this.#bytes[BYTES.START_MINUTE] = minute;
	}

	// Get the ending minute
	get end_minute() {
		return this.#bytes[BYTES.END_MINUTE];
	}

	/**
	 * Set the ending minute
	 * @param {Number} minute A number between this.getStartMinute() and 59
	 */
	set end_minute(minute) {
		if((this.end_hour * 60) + minute < this.start_minutes || minute > 24) {
			throw new Error("Invalid ending time");
		}

		this.#bytes[BYTES.END_MINUTE] = minute;
	}

	// Get the total number of minutes for the starting time
	get start_minutes() {
		return (this.start_hour * 60) + this.start_minute;
	}

	// Get the total number of minutes for the ending time
	get end_minutes() {
		return (this.end_hour * 60) + this.end_minute;
	}

	// Get the days
	get days() {
		return this.#bytes[BYTES.DAYS];
	}

	/**
	 * Set the days
	 * @param {Number} days A 7-digit bitmask representing a weekly schedule (e.g. 0b1000001 for Sat/Sun)
	 */
	set days(days) {
		// A schedule is meaningless if there are 0 days enabled
		if(days === 0) {
			days = DAYS.ALL;
		}

		if(days < DAYS.SATURDAY || days > DAYS.ALL) {
			throw new Error("Invalid days");
		}

		this.#bytes[BYTES.DAYS] = days;
	}

	get weekdays() {
		return [
			this.hasDays(DAYS.SUNDAY) ? 'U' : '',
			this.hasDays(DAYS.MONDAY) ? 'M' : '',
			this.hasDays(DAYS.TUESDAY) ? 'T' : '',
			this.hasDays(DAYS.WEDNESDAY) ? 'W' : '',
			this.hasDays(DAYS.THURSDAY) ? 'H' : '',
			this.hasDays(DAYS.FRIDAY) ? 'F' : '',
			this.hasDays(DAYS.SATURDAY) ? 'S' : '',
		].join('');
	}

	/**
	 * Add some days to the schedule
	 * @param  {...Number} days
	 */
	addDays(...days) {
		for(let day of days) {
			this.days |= day;
		}
	}

	/**
	 * Remove some days from the schedule
	 * @param  {...Number} days
	 */
	removeDays(...days) {
		for(let day of days) {
			this.days &= ~day;
		}
	}

	/**
	 * Check whether the schedule is enabled for the given days
	 * @param   {...Number} days
	 * @returns {Boolean}
	 */
	hasDays(...days) {
		for(let day of days) {
			if((this.days & day) === 0) {
				return false;
			}
		}

		return true;
	}

	/**
	 * @returns {Object} A JSON representation of the access code
	 */
	toJSON() {
		const {
			start_hour,
			start_minute,
			end_hour,
			end_minute,
			weekdays,
		} = this;

		return {
			start_hour,
			start_minute,
			end_hour,
			end_minute,
			weekdays,
		};
	}
};

export { DAYS };
