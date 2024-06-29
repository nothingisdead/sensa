import { ReadStream } from "fs";

/**
 *
 * @param   {ReadStream} stream
 * @param   {String}     encoding
 * @returns {String}
 */
export default async function readStream(stream, encoding = 'utf8') {
	stream.setEncoding(encoding);

	let data = '';

	for await(let chunk of stream) {
		data = `${data}${chunk}`;
	}

	return data;
}
