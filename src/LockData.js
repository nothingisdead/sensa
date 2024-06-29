const KEY = {
	LOCK_STATE        : 0,
	BATTERY_STATE     : 12,
	ALARM_MODE        : 14,
	ALARM_SENSITIVITY : 15,
	AUTO_LOCK_DELAY   : 16,
	ONE_TOUCH_LOCKING : 17,
	KEYPRESS_BEEPER   : 18,
	FIRMWARE_VERSION  : 20,
};

export default class LockData extends Map {
	get lock_state() {
		return this.get(KEY.LOCK_STATE);
	}

	get battery_state() {
		return this.get(KEY.BATTERY_STATE);
	}

	get alarm_mode() {
		return this.get(KEY.ALARM_MODE);
	}

	get alarm_sensitivity() {
		return this.get(KEY.ALARM_SENSITIVITY);
	}

	get auto_lock_delay() {
		return this.get(KEY.AUTO_LOCK_DELAY);
	}

	get one_touch_locking() {
		return this.get(KEY.ONE_TOUCH_LOCKING) === 1;
	}

	get keypress_beeper() {
		return this.get(KEY.KEYPRESS_BEEPER) === 1;
	}

	get firmware_version() {
		return this.get(KEY.FIRMWARE_VERSION);
	}

	toJSON() {
		const {
			lock_state,
			battery_state,
			alarm_mode,
			alarm_sensitivity,
			auto_lock_delay,
			one_touch_locking,
			keypress_beeper,
			firmware_version,
		} = this;

		return {
			lock_state,
			battery_state,
			alarm_mode,
			alarm_sensitivity,
			auto_lock_delay,
			one_touch_locking,
			keypress_beeper,
			firmware_version,
		};
	}
};
