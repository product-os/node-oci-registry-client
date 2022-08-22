#!/usr/bin/env -S deno run --allow-net

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016 Joyent, Inc.
 */

import { RegistryClientV2, parseRepoAndRef } from '../../lib';

// tslint:disable-next-line no-var-requires
const args = require('minimist')(process.argv.slice(2));

const name = args._[0];
if (!name) {
	console.error('usage: node examples/v2/%s.js REPO[:TAG|@DIGEST]\n');
	process.exit(2);
}

async function main() {
	// The interesting stuff starts here.
	const rar = parseRepoAndRef(name);
	const client = new RegistryClientV2({
		repo: rar,
		// log: log,
		insecure: args.insecure,
		username: args.username,
		password: args.password,
		acceptOCIManifests: args['accept-oci'],
	});
	const tagOrDigest = rar.tag || rar.digest || '';
	const { resp, manifest } = await client.getManifest({
		ref: tagOrDigest,
		acceptManifestLists: args['accept-list'],
	});

	console.error('# response headers');
	console.table(Array.from(resp.headers));
	console.error('# manifest');
	console.log(JSON.stringify(manifest, null, 4));
}

main().catch(console.error);
