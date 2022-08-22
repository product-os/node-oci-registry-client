#!/usr/bin/env node

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright 2017 Joyent, Inc.
 */

import * as fs from 'fs';
import * as assert from 'assert';
import { parseRepoAndRef, RegistryClientV2 } from '../../lib';

// tslint:disable-next-line no-var-requires
const args = require('minimist')(process.argv.slice(2));

async function main() {
	if (!args._[0] || (args._[0].indexOf(':') === -1 && !args._[1])) {
		console.error(
			'usage: node examples/v2/%s.js REPO[:TAG|@DIGEST] ' + 'manifest-file',
		);
		process.exit(2);
	}

	// The interesting stuff starts here.
	const rar = parseRepoAndRef(args._[0]);
	assert.ok(rar.canonicalName, 'must specify a repo');
	const ref = rar.tag || rar.digest;
	assert.ok(ref, 'must specify a tag or digest');

	console.log('Repo:', rar.canonicalName + ':' + ref);

	const filepath = args._[1];
	assert.equal(typeof filepath, 'string');
	const manifestData = fs.readFileSync(filepath);
	const manifest = JSON.parse(manifestData.toString());

	const client = new RegistryClientV2({
		repo: rar,
		insecure: args.insecure,
		username: args.username,
		password: args.password,
	});

	console.log('Uploading manifest: %s', filepath);
	const manifestOpts = {
		manifestData,
		ref,
		mediaType: manifest.mediaType,
	};
	const { digest, location } = await client.putManifest(manifestOpts);

	console.log('Upload successful => digest:', digest, 'location:', location);
}

main().catch(console.error);
