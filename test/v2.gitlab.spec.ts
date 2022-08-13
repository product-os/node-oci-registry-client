/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

/*
 * Specifically we want to test a repo name with a '/'.
 * See <https://github.com/joyent/node-docker-registry-client/issues/16>.
 */

import * as assert from 'assert';
import { dirname } from 'path';

import {
	assertThrowsHttp,
	getFirstLayerDigestFromManifest,
	hashAndCount,
} from './util';

import { RegistryClientV2 } from '../lib/registry-client-v2';
import { parseRepo, MEDIATYPE_MANIFEST_V2 } from '../lib/common';
import { ManifestV2 } from '../lib/types';

// --- globals

const REPO =
	'registry.gitlab.com/masakura/docker-registry-client-bug-sample/image';
const TAG = 'hello-world';

// --- Tests

jest.setTimeout(10 * 1000);

const repo = parseRepo(REPO);

it('v2 registry.gitlab.com / RegistryClientV2', async () => {
	const client = new RegistryClientV2({ repo });
	assert(client);
	assert.equal(client.version, 2);
});

it('v2 registry.gitlab.com / ping', async () => {
	const client = new RegistryClientV2({ repo });
	const res = await client.ping();
	assert(res, 'have a response');
	assert.equal(res.status, 401);
	assert(res.headers.get('www-authenticate'));
});

/*
 * Example expected output:
 *  {
 *      "name": "library/alpine",
 *      "tags": [ "2.6", "2.7", "3.1", "3.2", "edge", "latest" ]
 *  }
 */
it('v2 registry.gitlab.com / listTags', async () => {
	const client = new RegistryClientV2({ repo });
	const tags = await client.listTags();
	assert(tags);
	assert.equal(tags.name, repo.remoteName);
	assert(tags.tags.indexOf(TAG) !== -1, 'have a "' + TAG + '" tag');
});

/*
 *  {
 *      "name": <name>,
 *      "tag": <tag>,
 *      "fsLayers": [
 *         {
 *            "blobSum": <tarsum>
 *         },
 *         ...
 *      ],
 *      "history": <v1 images>,
 *      "signature": <JWS>
 *  }
 */
// Seems like Gitlab isn't serving up v2.1 anymore.
// it('v2 registry.gitlab.com / getManifest (v2.1)', async () => {
//     const client = new RegistryClientV2({ repo });
//     const {manifest} = await client.getManifest({ref: TAG});
//     assert(manifest);
//     assert.equal(manifest.schemaVersion, 1);
//     assert(manifest.schemaVersion === 1);
//     assert.equal(manifest.name, repo.remoteName);
//     assert.equal(manifest.tag, TAG);
//     assert(manifest.architecture);
//     assert(manifest.fsLayers);
//     assert(manifest.history[0].v1Compatibility);
//     assert(manifest.signatures?.[0].signature);
// });

/*
 * {
 *   "schemaVersion": 2,
 *   "mediaType": "application/vnd.docker.distribution.manifest.v2+json",
 *   "config": {
 *     "mediaType": "application/octet-stream",
 *     "size": 1459,
 *     "digest": "sha256:2b8fd9751c4c0f5dd266fc...01"
 *   },
 *   "layers": [
 *     {
 *       "mediaType": "application/vnd.docker.image.rootfs.diff.tar.gzip",
 *       "size": 667590,
 *       "digest": "sha256:8ddc19f16526912237dd8af...a9"
 *     }
 *   ]
 * }
 */
let _manifest: ManifestV2 | null;
let _manifestDigest: string | null;
it('v2 registry.gitlab.com / getManifest (v2.2)', async () => {
	const client = new RegistryClientV2({ repo });
	const { manifest, resp } = await client.getManifest({ ref: TAG });
	_manifestDigest = resp.headers.get('docker-content-digest');
	assert.equal(manifest.schemaVersion, 2);
	assert(manifest.schemaVersion === 2);
	assert(manifest.mediaType === MEDIATYPE_MANIFEST_V2);
	_manifest = manifest;
	assert(manifest.config);
	assert(manifest.config.digest, manifest.config.digest);
	assert(manifest.layers);
	assert(manifest.layers.length > 0);
	assert(manifest.layers[0].digest);
});

/*
 * Note this test requires that the manifest be pulled in the v2.2 format,
 * otherwise you will get a manifest not found error.
 */
it('v2 registry.gitlab.com / getManifest (by digest)', async () => {
	const client = new RegistryClientV2({ repo });
	const { manifest } = await client.getManifest({
		ref: _manifestDigest!,
	});
	assert(manifest);
	assert.equal(_manifest!.schemaVersion, manifest.schemaVersion);
	assert(manifest.schemaVersion === 2);
	assert(manifest.mediaType === MEDIATYPE_MANIFEST_V2);
	assert.deepEqual(_manifest!.config, manifest.config);
	assert.deepEqual(_manifest!.layers, manifest.layers);
});

it('v2 registry.gitlab.com / getManifest (unknown tag)', async () => {
	const client = new RegistryClientV2({ repo });
	await assertThrowsHttp(async () => {
		await client.getManifest({ ref: 'unknowntag' });
	}, 404);
});

it('v2 registry.gitlab.com / getManifest (unknown repo)', async () => {
	const client = new RegistryClientV2({
		name: dirname(REPO) + '/unknownreponame',
	});
	await assertThrowsHttp(async () => {
		await client.getManifest({ ref: 'latest' });
	}, 404);
});

it('v2 registry.gitlab.com / getManifest (bad username/password)', async () => {
	const client = new RegistryClientV2({
		repo,
		username: 'fredNoExistHere',
		password: 'fredForgot',
	});
	await assertThrowsHttp(async () => {
		await client.getManifest({ ref: 'latest' });
	}, 401);
});

it('v2 registry.gitlab.com / headBlob', async () => {
	if (!_manifestDigest || !_manifest) {
		throw new Error('cannot test');
	}
	const client = new RegistryClientV2({ repo });
	const digest = getFirstLayerDigestFromManifest(_manifest);
	const ress = await client.headBlob({ digest });
	assert(ress, 'got a "ress"');
	assert(Array.isArray(ress), '"ress" is an array');
	const first = ress[0];
	assert(
		first.status === 200 || first.status === 307,
		'first response statusCode is 200 or 307',
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
	const last = ress[ress.length - 1];
	assert.equal(last.status, 200, 'last response statusCode is 200');
	const contentType = last.headers.get('content-type');
	assert(
		['application/octet-stream', 'application/x-gzip'].indexOf(
			contentType ?? '',
		) !== -1,
		'content-type is as expected, got ' + contentType,
	);
	assert(last.headers.get('content-length'));
});

it('v2 registry.gitlab.com / headBlob (unknown digest)', async () => {
	const client = new RegistryClientV2({ repo });
	const { resp } = await assertThrowsHttp(async () => {
		await client.headBlob({ digest: 'cafebabe' });
	}, 404);
	assert.equal(
		resp.headers.get('docker-distribution-api-version'),
		'registry/2.0',
	);
});

it('v2 registry.gitlab.com / createBlobReadStream', async () => {
	if (!_manifestDigest || !_manifest) {
		throw new Error('cannot test');
	}
	const client = new RegistryClientV2({ repo });
	const digest = getFirstLayerDigestFromManifest(_manifest);
	const { ress, stream } = await client.createBlobReadStream({ digest });
	assert(ress, 'got responses');
	assert(Array.isArray(ress), 'ress is an array');

	const first = ress[0];
	assert(
		first.status === 200 || first.status === 307,
		'createBlobReadStream first res statusCode is 200 or 307',
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
	assert.equal(last.status, 200, 'stream statusCode is 200');
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

it('v2 registry.gitlab.com / createBlobReadStream (unknown digest)', async () => {
	const client = new RegistryClientV2({ repo });
	const { resp } = await assertThrowsHttp(async () => {
		await client.createBlobReadStream({ digest: 'cafebabe' });
	}, 404);
	assert.equal(
		resp.headers.get('docker-distribution-api-version'),
		'registry/2.0',
	);
});
