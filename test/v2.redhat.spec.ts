/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2017, Joyent, Inc.
 */

/*
 * Test v2 Registry API against <registry.access.redhat.com>.
 */

import * as assert from 'assert';

import { assertThrowsHttp } from './util';

import { RegistryClientV2 } from '../lib/registry-client-v2';
import { MEDIATYPE_MANIFEST_V2 } from '../lib/common';

// --- globals

const REPO = 'registry.access.redhat.com/rhel';
const TAG = 'latest';

// --- Tests

jest.setTimeout(10 * 1000);

it('v2 registry.access.redhat.com / RegistryClientV2', () => {
	const client = new RegistryClientV2({ name: REPO });
	assert(client);
	assert.equal(client.version, 2);
});

it('v2 registry.access.redhat.com / supportsV2', async () => {
	const client = new RegistryClientV2({ name: REPO });
	const supportsV2 = await client.supportsV2();
	assert(supportsV2, 'supportsV2');
});

it('v2 registry.access.redhat.com / ping', async () => {
	const client = new RegistryClientV2({ name: REPO });
	const res = await client.ping();
	assert(res, 'have a response');
	assert.equal(res.status, 200);
	assert.equal(
		res.headers.get('docker-distribution-api-version'),
		'registry/2.0',
	);
});

it('v2 registry.access.redhat.com / getManifest (no redirects)', async () => {
	const client = new RegistryClientV2({ name: REPO });
	const { resp } = await assertThrowsHttp(async () => {
		await client.getManifest({ ref: TAG, followRedirects: false });
	});
	assert.equal(resp.status, 302);
});

it('v2 registry.access.redhat.com / getManifest (redirected)', async () => {
	const client = new RegistryClientV2({ name: REPO });
	const { manifest } = await client.getManifest({ ref: TAG });
	assert(manifest, 'Got the manifest');
	assert.equal(manifest.schemaVersion, 2);
	assert.equal(manifest.mediaType, MEDIATYPE_MANIFEST_V2);
	assert(manifest.mediaType === MEDIATYPE_MANIFEST_V2);
	assert(manifest.config.digest);
	assert(manifest.layers[0].digest);
});
