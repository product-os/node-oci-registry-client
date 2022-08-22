#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2016 Joyent, Inc.
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream';
import { parseRepoAndRef } from '../../lib/';
import { RegistryClientV2 } from '../../lib/';
import { promisify } from 'util';

// tslint:disable-next-line no-var-requires
const args = require('minimist')(process.argv.slice(2));

if (!args._[0]) {
	console.error('usage: ./examples/v2/%s.ts REPO@DIGEST');
	process.exit(2);
}

const pump = promisify(pipeline);

async function main() {
	// The interesting stuff starts here.
	const rar = parseRepoAndRef(args._[0]);
	if (!rar.digest) {
		throw new Error('must specify a @DIGEST');
	}
	console.log('Repo:', rar.canonicalName);

	const client = new RegistryClientV2({
		repo: rar,
		insecure: args.insecure,
		username: args.username,
		password: args.password,
	});

	const { ress, stream } = await client.createBlobReadStream({
		digest: rar.digest,
	});

	const filename = rar.digest.split(':')[1].slice(0, 12) + '.blob';
	console.log('Downloading blob to "%s".', filename);
	console.log('Response headers:');
	console.table(Array.from(ress[0].headers));
	if (ress.length > 1) {
		console.log('Response headers (after redirects):');
		console.table(Array.from(ress[ress.length - 1].headers));
	}

	const destPath = path.join(os.tmpdir(), filename);
	const writeStream = fs.createWriteStream(destPath);

	await pump(stream, writeStream);

	console.log('Done downloading', destPath);
}

main().catch(console.error);
