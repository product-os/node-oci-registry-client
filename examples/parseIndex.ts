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
 * An example showing how an index (a.k.a. repository host) string is parsed.
 */

import { parseIndex } from '../lib';

if (process.argv.length !== 3) {
	console.error('usage:\n' + '    ./examples/parseIndex.ts INDEX\n');
	process.exit(2);
}

const idx = parseIndex(process.argv[2]);
console.log(JSON.stringify(idx, null, 4));
