/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

import * as assert from 'assert';

import {
	assertThrowsHttp,
	getFirstLayerDigestFromManifest,
	hashAndCount,
} from './util';

import {
	RegistryClientV2,
	digestFromManifestStr,
} from '../lib/registry-client-v2';
import {
	parseRepo,
	MEDIATYPE_MANIFEST_LIST_V2,
	MEDIATYPE_MANIFEST_V2,
} from '../lib/common';
import { ManifestV2 } from '../lib/types';

// --- globals

const REPO = 'mcr.microsoft.com/dotnet/runtime-deps';
const TAG = 'latest';

// --- Tests

jest.setTimeout(10 * 1000);

const repo = parseRepo(REPO);

it('v2 mcr.microsoft.com / RegistryClientV2', async () => {
	const client = new RegistryClientV2({ repo });
	assert(client);
	assert.equal(client.version, 2);
});

it('v2 mcr.microsoft.com / ping', async () => {
	const client = new RegistryClientV2({ repo });
	const res = await client.ping();
	assert(res, 'have a response');
	assert.equal(res.status, 200);
	// MCR seems to act like it doesn't need auth...
	// which will be a problem for private access!
	// assert(res.headers.get('www-authenticate'));
});

it('v2 mcr.microsoft.com / listTags', async () => {
	const client = new RegistryClientV2({ repo });
	const tags = await client.listTags();
	assert(tags);
	assert.equal(tags.name, repo.remoteName);
	assert(tags.tags.indexOf(TAG) !== -1, 'no "' + TAG + '" tag');
});

it('v2 mcr.microsoft.com / getManifest (v2.1)', async () => {
	const client = new RegistryClientV2({ repo });
	const { manifest } = await client.getManifest({ ref: TAG });
	assert(manifest);
	assert.equal(manifest.schemaVersion, 2);
	assert(manifest.schemaVersion === 2);
	assert.equal(manifest.mediaType, MEDIATYPE_MANIFEST_V2);
	assert(manifest.mediaType === MEDIATYPE_MANIFEST_V2);
	assert(manifest.config.digest);
	assert(manifest.layers[0].digest);
});

let _manifest: ManifestV2 | null;
let _manifestDigest: string | null;
it('v2 mcr.microsoft.com / getManifest (v2.2 list)', async () => {
	const client = new RegistryClientV2({ repo });
	const getOpts = {
		acceptManifestLists: true,
		ref: TAG,
	};
	const { manifest } = await client.getManifest(getOpts);
	assert(manifest);
	assert.equal(manifest.schemaVersion, 2);
	assert(manifest.schemaVersion === 2);
	assert.equal(
		manifest.mediaType,
		MEDIATYPE_MANIFEST_LIST_V2,
		'mediaType should be manifest list',
	);
	assert(manifest.mediaType === MEDIATYPE_MANIFEST_LIST_V2);
	assert(Array.isArray(manifest.manifests), 'manifests is an array');
	manifest.manifests.forEach(function (m) {
		assert(m.digest, 'm.digest');
		assert(m.platform, 'm.platform');
		assert(m.platform.architecture, 'm.platform.architecture');
		assert(m.platform.os, 'os.platform.os');
	});
	// Take the first manifest (for testing purposes).
	_manifestDigest = manifest.manifests[0].digest;
});

it('v2 mcr.microsoft.com / getManifest (v2.2)', async () => {
	const client = new RegistryClientV2({ repo });
	const { manifest, resp } = await client.getManifest({ ref: TAG });
	assert(manifest);
	assert.equal(manifest.schemaVersion, 2);
	assert(manifest.schemaVersion === 2);
	assert(manifest.mediaType === MEDIATYPE_MANIFEST_V2);
	_manifest = manifest;
	assert(manifest.config);
	assert(manifest.config.digest, manifest.config.digest);
	assert(manifest.layers);
	assert(manifest.layers.length > 0);
	assert(manifest.layers[0].digest);

	const manifestStr = new TextDecoder().decode(await resp.dockerBody());
	const computedDigest = digestFromManifestStr(manifestStr);
	assert.equal(
		computedDigest,
		_manifestDigest,
		'compare computedDigest to expected manifest digest',
	);
	// Note that res.headers['docker-content-digest'] may be incorrect,
	// c.f. https://github.com/docker/distribution/issues/2395
});

it('v2 mcr.microsoft.com / getManifest (by digest)', async () => {
	if (!_manifestDigest || !_manifest) {
		throw new Error('cannot test');
	}
	const client = new RegistryClientV2({ repo });
	const { manifest } = await client.getManifest({ ref: _manifestDigest });
	assert(manifest, 'Got the manifest object');
	assert.equal(_manifest!.schemaVersion, manifest.schemaVersion);
	assert(manifest.schemaVersion === 2);
	assert(manifest.mediaType === MEDIATYPE_MANIFEST_V2);
	assert.deepEqual(_manifest!.config, manifest.config);
	assert.deepEqual(_manifest!.layers, manifest.layers);
});

it('v2 mcr.microsoft.com / getManifest (unknown tag)', async () => {
	const client = new RegistryClientV2({ repo });
	await assertThrowsHttp(async () => {
		await client.getManifest({ ref: 'unknowntag' });
	}, 404);
});

it('v2 mcr.microsoft.com / getManifest (unknown repo)', async () => {
	const client = new RegistryClientV2({
		name: 'unknownreponame',
	});
	await assertThrowsHttp(async () => {
		await client.getManifest({ ref: 'latest' });
	}, 401);
});

// MCR seems to act like it doesn't need auth...
// which will be a problem for private access!
// it('v2 mcr.microsoft.com / getManifest (bad username/password)', async () => {
//     const client = new RegistryClientV2({
//         repo,
//         username: 'fredNoExistHere',
//         password: 'fredForgot',
//     });
//     await assertThrowsHttp(async () => {
//         await client.getManifest({ref: 'latesr'});
//     }, 401);
// });

it('v2 mcr.microsoft.com / headBlob', async () => {
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

it('v2 mcr.microsoft.com / headBlob (unknown digest)', async () => {
	const client = new RegistryClientV2({ repo });
	const { resp } = await assertThrowsHttp(async () => {
		await client.headBlob({ digest: 'cafebabe' });
	}, 404);
	assert.equal(
		resp.headers.get('docker-distribution-api-version'),
		'registry/2.0',
	);
});

it('v2 mcr.microsoft.com / createBlobReadStream', async () => {
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

it('v2 mcr.microsoft.com / createBlobReadStream (unknown digest)', async () => {
	const client = new RegistryClientV2({ repo });
	const { resp } = await assertThrowsHttp(async () => {
		await client.createBlobReadStream({ digest: 'cafebabe' });
	}, 404);
	assert.equal(
		resp.headers.get('docker-distribution-api-version'),
		'registry/2.0',
	);
});
