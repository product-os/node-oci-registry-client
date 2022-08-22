#!/usr/bin/env -S deno run --allow-net

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016 Joyent, Inc.
 */

import { parseRepoAndRef } from '../../lib/';
import { RegistryClientV2 } from '../../lib/';

// tslint:disable-next-line no-var-requires
const args = require('minimist')(process.argv.slice(2));

const name = args._[0];
if (!name || !(name.includes(':') || name.includes('@'))) {
	console.error('usage: node examples/v2/%s.js REPO:TAG|@DIGEST\n');
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
		scopes: ['push', 'pull'],
	});

	await client.deleteManifest({
		ref: rar.tag || rar.digest || '',
	});
	console.log('deleted', name);
}

main().catch(console.error);
