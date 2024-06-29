import { encode as toHex } from '@stablelib/hex';

const ACTION = {
	UNKNOWN       :-1,
	STATE_READ    :0,
	STATE_ACTION  :1,
	STATE_CLEARED :4,
};

const EVENT = {
	UNKNOWN                         : -1,
	UNKNOWN0                        : 0,
	LOCKED_BY_KEYPAD                : 1,
	UNLOCKED_BY_KEYPAD              : 2,
	LOCKED_BY_THUMBTURN             : 3,
	UNLOCKED_BY_THUMBTURN           : 4,
	LOCKED_BY_SCHLAGE_BUTTON        : 5,
	LOCKED_BY_MOBILE_DEVICE         : 6,
	UNLOCKED_BY_MOBILE_DEVICE       : 7,
	LOCKED_BY_TIME                  : 8,
	UNLOCKED_BY_TIME                : 9,
	LOCK_JAMMED                     : 10,
	KEYPAD_DISABLED_INVALID_CODE    : 11,
	ALARM_TRIGGERED                 : 12,
	ACCESS_CODE_USER_ADDED          : 14,
	ACCESS_CODE_USER_DELETED        : 15,
	MOBILE_USER_ADDED               : 16,
	MOBILE_USER_DELETED             : 17,
	ADMIN_PRIVILEGE_ADDED           : 18,
	ADMIN_PRIVILEGE_DELETED         : 19,
	FIRMWARE_UPDATED                : 20,
	LOW_BATTERY_INDICATED           : 21,
	BATTERIES_REPLACED              : 22,
	FORCED_ENTRY_ALARM_SILENCED     : 23,
	HALL_SENSOR_COMM_ERROR          : 27,
	FDR_FAILED                      : 28,
	CRITICAL_BATTERY_STATE          : 29,
	ALL_ACCESS_CODE_DELETED         : 30,
	FIRMWARE_UPDATE_FAILED          : 32,
	BT_FW_DOWNLOAD_FAILED           : 33,
	WIFI_FW_DOWNLOAD_FAILED         : 34,
	KEYPAD_DISCONNECTED             : 35,
	WIFI_AP_DISCONNECT              : 36,
	WIFI_HOST_DISCONNECT            : 37,
	WIFI_AP_CONNECT                 : 38,
	WIFI_HOST_CONNECT               : 39,
	USER_DB_FAILURE                 : 40,
	PASSAGE_MODE_ACTIVATED          : 48,
	PASSAGE_MODE_DEACTIVATED        : 49,
	EVENT_LOG_ALERT_ALARM_TRIGGERED : 51,
	HISTORY_CLEARED                 : 255,
};

const KEY = {
	USER_UUID              : 0,
	TIMESTAMP              : 1,
	ACTION                 : 2,
	EVENT_DATA             : 3,
	EVENT_DATA_EVENT       : 0,
	EVENT_DATA_DEVICE_UUID : 1,
};

export default class LogEntry extends Map {
	/**
	 * @returns {Number}
	 */
	get timestamp() {
		return this.get(KEY.TIMESTAMP);
	}

	/**
	 * @returns {Number}
	 */
	get action_code() {
		return this.get(KEY.ACTION) ?? ACTION.UNKNOWN;
	}

	/**
	 * @returns {Map}
	 */
	get event_data() {
		return this.get(KEY.EVENT_DATA);
	}

	/**
	 * @returns {Number}
	 */
	get event_code() {
		let event = this.event_data?.get(KEY.EVENT_DATA_EVENT);

		if(this.action_code === ACTION.STATE_CLEARED) {
			event = EVENT.HISTORY_CLEARED;
		}

		return event ?? EVENT.UNKNOWN;
	}

	/**
	 * @returns {String?}
	 */
	get device_uuid() {
		const { event_data } = this;

		if(event_data && event_data.has(KEY.EVENT_DATA_DEVICE_UUID)) {
			return toHex(event_data.get(KEY.EVENT_DATA_DEVICE_UUID));
		}

		return null;
	}

	/**
	 * @returns {String?}
	 */
	get user_uuid() {
		if(this.has(KEY.USER_UUID)) {
			return toHex(this.get(KEY.USER_UUID));
		}

		return null;
	}

	/**
	 * @returns {Object}
	 */
	toJSON() {
		const {
			timestamp,
			action_code,
			action,
			event_code,
			event,
			device_uuid,
			user_uuid,
		} = this;

		return {
			timestamp,
			action_code,
			action,
			event_code,
			event,
			device_uuid,
			user_uuid,
		};
	}
};
