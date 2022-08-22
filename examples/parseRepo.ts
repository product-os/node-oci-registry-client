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

import { parseRepo } from '../lib';

if (process.argv.length !== 4) {
	console.error(
		'usage:\n' + '    ./examples/parseRepo.ts [INDEX/]REPO DEFAULT_INDEX\n',
	);
	process.exit(2);
}

const repo = parseRepo(process.argv[2], process.argv[3]);
console.log(JSON.stringify(repo, null, 4));
