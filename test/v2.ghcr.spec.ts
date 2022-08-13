/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

import {
	assertThrowsHttp,
	getFirstLayerDigestFromManifest,
	hashAndCount,
} from './util';
import * as assert from 'assert';

import { RegistryClientV2 } from '../lib';
import { parseRepo, MEDIATYPE_MANIFEST_V2 } from '../lib';
import { ManifestV2 } from '../lib';

const REPO = 'ghcr.io/product-os/node-docker-registry-client/hello-world';
const TAG = 'latest';

const repo = parseRepo(REPO);

const username = process.env['GITHUB_USERNAME'];
const password = process.env['GITHUB_PASSWORD'];

// tslint:disable-next-line: no-empty
const testIf = (check: any) => (check ? it : () => {});

describe('GitHub container registry', function () {
	jest.setTimeout(10 * 1000);

	it('v2 ghcr.io / RegistryClientV2', async () => {
		const client = new RegistryClientV2({ name: REPO, username, password });
		assert.equal(client.version, 2);
	});

	it('v2 ghcr.io / supportsV2', async () => {
		const client = new RegistryClientV2({ name: REPO, username, password });
		const supportsV2 = await client.supportsV2();
		assert(supportsV2, 'supportsV2');
	});

	it('v2 ghcr.io / ping', async () => {
		const client = new RegistryClientV2({ name: REPO, username, password });
		const res = await client.ping();
		assert.equal(res.status, 401);
		assert(res.headers.has('www-authenticate'));
		assert.equal(
			res.headers.get('docker-distribution-api-version'),
			'registry/2.0',
		);
	});

	testIf(username)('v2 ghcr.io / listTags', async () => {
		const client = new RegistryClientV2({ name: REPO, username, password });
		const tags = await client.listTags();
		assert(tags);
		assert.equal(tags.name, repo.remoteName);
		assert(tags.tags.indexOf(TAG) !== -1, 'no "' + TAG + '" tag');
	});

	let _manifest: ManifestV2 | null;
	let _manifestDigest: string | null;
	testIf(username)('v2 ghcr.io / getManifest', async () => {
		const client = new RegistryClientV2({ name: REPO, username, password });
		const { manifest, resp } = await client.getManifest({ ref: TAG });
		_manifestDigest = resp.headers.get('docker-content-digest');
		assert(manifest);
		assert(_manifestDigest, 'check for manifest digest header');
		assert.equal(manifest.schemaVersion, 2);
		assert(manifest.schemaVersion === 2);
		assert(manifest.mediaType === MEDIATYPE_MANIFEST_V2);
		_manifest = manifest ?? null;
		assert(manifest.config);
		assert(manifest.config.digest, manifest.config.digest);
		assert(manifest.layers);
		assert(manifest.layers.length > 0);
		assert(manifest.layers[0].digest);
	});

	testIf(username)('v2 ghcr.io / getManifest (by digest)', async () => {
		if (!_manifestDigest || !_manifest) {
			throw new Error('cannot test');
		}
		const client = new RegistryClientV2({ name: REPO, username, password });
		const { manifest } = await client.getManifest({ ref: _manifestDigest });
		assert(manifest);
		assert.equal(_manifest!.schemaVersion, manifest.schemaVersion);
		assert(manifest.schemaVersion === 2);
		assert(manifest.mediaType === MEDIATYPE_MANIFEST_V2);
		assert.deepEqual(_manifest!.config, manifest.config);
		assert.deepEqual(_manifest!.layers, manifest.layers);
	});

	testIf(username)('v2 ghcr.io / getManifest (unknown tag)', async () => {
		const client = new RegistryClientV2({ name: REPO, username, password });
		await assertThrowsHttp(async () => {
			await client.getManifest({ ref: 'unknowntag' });
		}, 404);
	});

	testIf(username)('v2 ghcr.io / getManifest (unknown repo)', async () => {
		const client = new RegistryClientV2({
			name: 'unknownreponame',
		});
		await assertThrowsHttp(async () => {
			await client.getManifest({ ref: 'latest' });
		}, 401);
	});

	testIf(username)(
		'v2 ghcr.io / getManifest (bad username/password)',
		async () => {
			const client = new RegistryClientV2({
				name: REPO,
				username: 'fredNoExistHere',
				password: 'fredForgot',
				// log: log
			});
			await assertThrowsHttp(async () => {
				await client.getManifest({ ref: 'latest' });
			}, 403);
		},
	);

	testIf(username)('v2 ghcr.io / headBlob', async () => {
		if (!_manifest) {
			throw new Error('cannot test');
		}
		const client = new RegistryClientV2({ name: REPO, username, password });
		const digest = _manifest.layers?.[0].digest;
		const ress = await client.headBlob({ digest });
		assert(Array.isArray(ress), 'responses is an array');
		const first = ress[0];

		assert.equal(
			first.status,
			200,
			'first response status code 200, 302 or 307: statusCode=' + first.status,
		);

		// No digest head is returned (it's using an earlier version of the
		// registry API).
		if (first.headers.get('docker-content-digest')) {
			assert.equal(first.headers.get('docker-content-digest'), digest);
		}

		assert.equal(
			first.headers.get('docker-distribution-api-version'),
			'registry/2.0',
		);

		const last = ress[ress.length - 1];
		assert(last);
		assert.equal(last.status, 200, 'last response status code should be 200');

		assert.equal(
			last.headers.get('content-type'),
			'application/octet-stream',
			'expect specific Content-Type on last response; ' +
				`statusCode=${last.status}`,
		);

		assert(last.headers.get('content-length'));
	});

	testIf(username)('v2 ghcr.io / headBlob (unknown digest)', async () => {
		const client = new RegistryClientV2({ name: REPO, username, password });
		await assertThrowsHttp(async () => {
			await client.headBlob({ digest: 'cafebabe' });
		}, 405);
	});

	testIf(username)('v2 ghcr.io / createBlobReadStream', async () => {
		if (!_manifestDigest || !_manifest) {
			throw new Error('cannot test');
		}
		const client = new RegistryClientV2({ repo, username, password });
		const digest = getFirstLayerDigestFromManifest(_manifest);
		const { ress, stream } = await client.createBlobReadStream({ digest });
		assert(ress, 'got responses');
		assert(Array.isArray(ress), 'ress is an array');

		const first = ress[0];
		assert(
			first.status === 200 || first.status === 307 || first.status === 302,
			`createBlobReadStream first res statusCode is 200 or 307, was ${first.status}`,
		);
		if (first.headers.get('docker-content-digest')) {
			assert.equal(
				first.headers.get('docker-content-digest'),
				digest,
				'"docker-content-digest" header from first response is ' +
					'the queried digest',
			);
		}
		assert.equal(
			first.headers.get('docker-distribution-api-version'),
			'registry/2.0',
			'"docker-distribution-api-version" header is "registry/2.0"',
		);

		const last = ress.slice(-1)[0];
		assert(last, 'got a stream');
		assert.equal(last.status, 200);
		assert.equal(last.headers.get('content-type'), 'application/octet-stream');
		assert(
			last.headers.get('content-length') !== undefined,
			'got a "content-length" header',
		);

		const { hashHex, numBytes } = await hashAndCount(
			digest.split(':')[0],
			stream,
		);
		assert.equal(hashHex, digest.split(':')[1]);
		assert.equal(numBytes, Number(last.headers.get('content-length')));
	});

	testIf(username)(
		'v2 ghcr.io / createBlobReadStream (unknown digest)',
		async () => {
			const client = new RegistryClientV2({ repo, username, password });
			await assertThrowsHttp(async () => {
				await client.createBlobReadStream({ digest: 'cafebabe' });
			}, 303);
		},
	);
});
