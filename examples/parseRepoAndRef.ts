#!/usr/bin/env -S deno run

/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

/*
 * An example showing how a repo string is parsed.
 */

import { parseRepoAndRef } from '../lib';

if (process.argv.length !== 1) {
	console.error(
		'usage:\n' +
			'    ./examples/parseRepoAndRef.ts [INDEX/]REPO[:TAG|@DIGEST]\n',
	);
	process.exit(2);
}

const rat = parseRepoAndRef(process.argv[2]);
console.log(JSON.stringify(rat, null, 4));
