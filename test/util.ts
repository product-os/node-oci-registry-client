import * as crypto from 'crypto';
import * as assert from 'assert';

import { HttpError } from '../lib/errors';
import { MEDIATYPE_MANIFEST_V2 } from '../lib/common';
import { Manifest } from '../lib/types';

export async function assertThrowsHttp<T = void>(
	fn: () => Promise<T>,
	statusCode?: number,
	msgIncludes = '',
	msg?: string,
): Promise<HttpError> {
	let httpErr: HttpError | undefined;
	await assert.rejects(
		async () => {
			try {
				await fn();
			} catch (err) {
				if (err instanceof HttpError) {
					httpErr = err;
				}
				throw err;
			}
		},
		HttpError,
		msgIncludes + msg,
	);

	assert(httpErr);
	if (statusCode) {
		assert.equal(httpErr.resp.status, statusCode);
	}
	return httpErr;
}

export function getFirstLayerDigestFromManifest(manifest: Manifest) {
	if (manifest.mediaType !== MEDIATYPE_MANIFEST_V2) {
		throw new Error(`unexpected non-image manifest`);
	}
	return manifest.layers![0].digest;
}

export async function hashAndCount(
	digestType: string,
	stream: NodeJS.ReadableStream,
) {
	assert.equal(digestType, 'sha256');

	let numBytes = 0;
	const hash = crypto.createHash('sha256');

	for await (const chunk of stream) {
		hash.update(chunk);
		numBytes += chunk.length;
	}

	return {
		hashHex: hash.digest('hex'),
		numBytes,
	};
}
