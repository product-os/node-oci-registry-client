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
import { join } from 'path';
import * as crypto from 'crypto';
import * as assert from 'assert';
import { parseRepoAndRef, RegistryClientV2 } from '../../lib';

// tslint:disable-next-line no-var-requires
const args = require('minimist')(process.argv.slice(2));

function checksumFile(algorithm: string, path: string) {
	return new Promise((resolve, reject) => {
		const hash = crypto.createHash(algorithm);
		const stream = fs.createReadStream(path);
		stream.on('error', (err) => reject(err));
		stream.on('data', (chunk) => hash.update(chunk));
		stream.on('end', () => resolve(hash.digest('hex')));
	});
}

if (!args._[0] || (args._[0].indexOf(':') === -1 && !args._[1])) {
	console.error('usage: node examples/v2/%s.js REPO blob-file\n');
	process.exit(2);
}

async function main() {
	// The interesting stuff starts here.
	const rar = parseRepoAndRef(args._[0]);
	assert.ok(rar.canonicalName, 'must specify a repo');
	console.log('Repo:', rar.canonicalName);

	const filePath = join(__dirname, args._[1]);
	assert.equal(typeof filePath, 'string');
	assert.equal(fs.existsSync(filePath), true);
	const fileSize = fs.statSync(filePath).size;
	const sha256 = await checksumFile('sha256', filePath);

	const client = new RegistryClientV2({
		insecure: args.insecure,
		repo: rar,
		username: args.username,
		password: args.password,
	});

	const digest = 'sha256:' + sha256;
	const stream = fs.createReadStream(filePath);
	const blobOpts = {
		contentLength: fileSize,
		digest,
		stream,
	};
	console.log('Uploading blob: %s, digest: %s', filePath, digest);
	const res = await client.blobUpload(blobOpts);

	console.log('Response headers:');
	console.log(JSON.stringify(res.headers, null, 4));

	console.log('Body:\n%s', res.body);
}

main().catch(console.error);
