import { crypto, enums } from "openpgp";
// import { crypto, enums } from "openpgp/dist/node/openpgp.mjs";

export default class EAXBase {
	#eax;

	/**
	 * Create an EAXBase object
	 * @param {Uint8Array} key The key
	 */
	constructor(key) {
		this.#eax = crypto.mode.eax(enums.symmetric.aes128, key, 12);
	}

	/**
	 *
	 * @param   {Uint8Array}          plaintext The plaintext data
	 * @param   {Uint8Array}          nonce     The nonce
	 * @param   {Uint8Array}          adata     The associated data
	 * @returns {Promise<Uint8Array>}           The ciphertext data
	 */
	async encrypt(plaintext, nonce, adata) {
		const eax = await this.#eax;

		return await eax.encrypt(plaintext, nonce, adata);
	}

	/**
	 *
	 * @param   {Uint8Array}          ciphertext The ciphertext data
	 * @param   {Uint8Array}          nonce      The nonce
	 * @param   {Uint8Array}          adata      The associated data
	 * @returns {Promise<Uint8Array>}            The plaintext data
	 */
	async decrypt(ciphertext, nonce, adata) {
		const eax = await this.#eax;

		return await eax.decrypt(ciphertext, nonce, adata);
	}
}
