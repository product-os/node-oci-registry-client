#!/usr/bin/env -S deno run --allow-net

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016 Joyent, Inc.
 */

import { parseRepoAndRef } from '../../lib/common';
import { RegistryClientV2 } from '../../lib/registry-client-v2';

// tslint:disable-next-line no-var-requires
const args = require('minimist')(process.argv.slice(2));

const name = args._[0];
if (!name) {
	console.error('usage: node examples/v2/%s.js REPO@DIGEST');
	process.exit(2);
}

async function main() {
	// The interesting stuff starts here.
	const rat = parseRepoAndRef(name);
	if (!rat.digest) {
		throw new Error('must specify a @DIGEST');
	}
	const client = new RegistryClientV2({
		repo: rat,
		insecure: args.insecure,
		username: args.username,
		password: args.password,
	});
	const ress = await client.headBlob({ digest: rat.digest });
	for (const res of ress) {
		console.table(Array.from(res.headers));
	}
}

main().catch(console.error);
