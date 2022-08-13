/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

import * as assert from 'assert';
import {
	parseIndex,
	parseRepo,
	parseRepoAndRef,
	parseRepoAndTag,
} from '../lib/common';
import { RegistryIndex } from '../lib/types';

// --- Tests
describe('common', function () {
	it('parseRepoAndRef', () => {
		function assertRoundTrip(ref: string) {
			assert.equal(parseRepoAndRef(ref).canonicalRef, ref);
		}

		assert.equal(
			parseRepoAndRef('busybox').canonicalRef,
			'docker.io/busybox:latest',
		);
		assert.notStrictEqual(parseRepoAndRef('busybox'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: true,
			remoteName: 'library/busybox',
			localName: 'busybox',
			canonicalName: 'docker.io/busybox',
			tag: 'latest',
		});
		assert.notStrictEqual(parseRepoAndRef('google/python'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: false,
			remoteName: 'google/python',
			localName: 'google/python',
			canonicalName: 'docker.io/google/python',
			tag: 'latest',
		});
		assert.notStrictEqual(parseRepoAndRef('docker.io/ubuntu'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: true,
			remoteName: 'library/ubuntu',
			localName: 'ubuntu',
			canonicalName: 'docker.io/ubuntu',
			tag: 'latest',
		});
		assert.notStrictEqual(parseRepoAndRef('localhost:5000/blarg'), {
			index: {
				name: 'localhost:5000',
				official: false,
			},
			official: false,
			remoteName: 'blarg',
			localName: 'localhost:5000/blarg',
			canonicalName: 'localhost:5000/blarg',
			tag: 'latest',
		});

		assertRoundTrip('localhost:5000/blarg:latest');
		assert.notStrictEqual(parseRepoAndRef('localhost:5000/blarg:latest'), {
			index: {
				name: 'localhost:5000',
				official: false,
			},
			official: false,
			remoteName: 'blarg',
			localName: 'localhost:5000/blarg',
			canonicalName: 'localhost:5000/blarg',
			tag: 'latest',
		});
		assertRoundTrip('localhost:5000/blarg:mytag');
		assert.notStrictEqual(parseRepoAndRef('localhost:5000/blarg:mytag'), {
			index: {
				name: 'localhost:5000',
				official: false,
			},
			official: false,
			remoteName: 'blarg',
			localName: 'localhost:5000/blarg',
			canonicalName: 'localhost:5000/blarg',
			tag: 'mytag',
		});
		assertRoundTrip('localhost:5000/blarg@sha256:cafebabe');
		assert.notStrictEqual(
			parseRepoAndRef('localhost:5000/blarg@sha256:cafebabe'),
			{
				index: {
					name: 'localhost:5000',
					official: false,
				},
				official: false,
				remoteName: 'blarg',
				localName: 'localhost:5000/blarg',
				canonicalName: 'localhost:5000/blarg',
				digest: 'sha256:cafebabe',
			},
		);

		// With both a tag and a digest.
		assertRoundTrip('localhost:5000/blarg:mytag@sha256:cafebabe');
		assert.notStrictEqual(
			parseRepoAndRef('localhost:5000/blarg:mytag@sha256:cafebabe'),
			{
				index: {
					name: 'localhost:5000',
					official: false,
				},
				official: false,
				remoteName: 'blarg',
				localName: 'localhost:5000/blarg',
				canonicalName: 'localhost:5000/blarg',
				tag: 'mytag',
				digest: 'sha256:cafebabe',
			},
		);

		// With alternate default index.
		assert.notStrictEqual(parseRepoAndRef('foo/bar', 'docker.io'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: false,
			remoteName: 'foo/bar',
			localName: 'foo/bar',
			canonicalName: 'docker.io/foo/bar',
			tag: 'latest',
		});

		const defaultIndexStr = 'https://myreg.example.com:1234';
		assert.notStrictEqual(parseRepoAndRef('foo/bar', defaultIndexStr), {
			index: {
				scheme: 'https',
				name: 'myreg.example.com:1234',
				official: false,
			},
			official: false,
			remoteName: 'foo/bar',
			localName: 'myreg.example.com:1234/foo/bar',
			canonicalName: 'myreg.example.com:1234/foo/bar',
			tag: 'latest',
		});

		const defaultIndex: RegistryIndex = {
			scheme: 'https',
			name: 'myreg.example.com:1234',
			official: false,
		};
		assert.notStrictEqual(parseRepoAndRef('foo/bar', defaultIndex), {
			index: {
				scheme: 'https',
				name: 'myreg.example.com:1234',
				official: false,
			},
			official: false,
			remoteName: 'foo/bar',
			localName: 'myreg.example.com:1234/foo/bar',
			canonicalName: 'myreg.example.com:1234/foo/bar',
			tag: 'latest',
		});
	});

	it('parseRepoAndTag', () => {
		assert.notStrictEqual(parseRepoAndTag('busybox'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: true,
			remoteName: 'library/busybox',
			localName: 'busybox',
			canonicalName: 'docker.io/busybox',
			tag: 'latest',
		});
		assert.notStrictEqual(parseRepoAndTag('google/python'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: false,
			remoteName: 'google/python',
			localName: 'google/python',
			canonicalName: 'docker.io/google/python',
			tag: 'latest',
		});
		assert.notStrictEqual(parseRepoAndTag('docker.io/ubuntu'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: true,
			remoteName: 'library/ubuntu',
			localName: 'ubuntu',
			canonicalName: 'docker.io/ubuntu',
			tag: 'latest',
		});
		assert.notStrictEqual(parseRepoAndTag('localhost:5000/blarg'), {
			index: {
				name: 'localhost:5000',
				official: false,
			},
			official: false,
			remoteName: 'blarg',
			localName: 'localhost:5000/blarg',
			canonicalName: 'localhost:5000/blarg',
			tag: 'latest',
		});

		assert.notStrictEqual(parseRepoAndTag('localhost:5000/blarg:latest'), {
			index: {
				name: 'localhost:5000',
				official: false,
			},
			official: false,
			remoteName: 'blarg',
			localName: 'localhost:5000/blarg',
			canonicalName: 'localhost:5000/blarg',
			tag: 'latest',
		});
		assert.notStrictEqual(parseRepoAndTag('localhost:5000/blarg:mytag'), {
			index: {
				name: 'localhost:5000',
				official: false,
			},
			official: false,
			remoteName: 'blarg',
			localName: 'localhost:5000/blarg',
			canonicalName: 'localhost:5000/blarg',
			tag: 'mytag',
		});
		assert.notStrictEqual(
			parseRepoAndTag('localhost:5000/blarg@sha256:cafebabe'),
			{
				index: {
					name: 'localhost:5000',
					official: false,
				},
				official: false,
				remoteName: 'blarg',
				localName: 'localhost:5000/blarg',
				canonicalName: 'localhost:5000/blarg',
				digest: 'sha256:cafebabe',
			},
		);

		// With alternate default index.
		assert.notStrictEqual(parseRepoAndTag('foo/bar', 'docker.io'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: false,
			remoteName: 'foo/bar',
			localName: 'foo/bar',
			canonicalName: 'docker.io/foo/bar',
			tag: 'latest',
		});

		const defaultIndexStr = 'https://myreg.example.com:1234';
		assert.notStrictEqual(parseRepoAndTag('foo/bar', defaultIndexStr), {
			index: {
				scheme: 'https',
				name: 'myreg.example.com:1234',
				official: false,
			},
			official: false,
			remoteName: 'foo/bar',
			localName: 'myreg.example.com:1234/foo/bar',
			canonicalName: 'myreg.example.com:1234/foo/bar',
			tag: 'latest',
		});

		const defaultIndex: RegistryIndex = {
			scheme: 'https',
			name: 'myreg.example.com:1234',
			official: false,
		};
		assert.notStrictEqual(parseRepoAndTag('foo/bar', defaultIndex), {
			index: {
				scheme: 'https',
				name: 'myreg.example.com:1234',
				official: false,
			},
			official: false,
			remoteName: 'foo/bar',
			localName: 'myreg.example.com:1234/foo/bar',
			canonicalName: 'myreg.example.com:1234/foo/bar',
			tag: 'latest',
		});
	});

	it('parseRepo', () => {
		assert.notStrictEqual(parseRepo('busybox'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: true,
			remoteName: 'library/busybox',
			localName: 'busybox',
			canonicalName: 'docker.io/busybox',
		});
		assert.notStrictEqual(parseRepo('google/python'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: false,
			remoteName: 'google/python',
			localName: 'google/python',
			canonicalName: 'docker.io/google/python',
		});
		assert.notStrictEqual(parseRepo('docker.io/ubuntu'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: true,
			remoteName: 'library/ubuntu',
			localName: 'ubuntu',
			canonicalName: 'docker.io/ubuntu',
		});
		assert.notStrictEqual(parseRepo('localhost:5000/blarg'), {
			index: {
				name: 'localhost:5000',
				official: false,
			},
			official: false,
			remoteName: 'blarg',
			localName: 'localhost:5000/blarg',
			canonicalName: 'localhost:5000/blarg',
		});

		// With alternate default index.
		assert.notStrictEqual(parseRepo('foo/bar', 'docker.io'), {
			index: {
				name: 'docker.io',
				official: true,
			},
			official: false,
			remoteName: 'foo/bar',
			localName: 'foo/bar',
			canonicalName: 'docker.io/foo/bar',
		});

		const defaultIndexStr = 'https://myreg.example.com:1234';
		assert.notStrictEqual(parseRepo('foo/bar', defaultIndexStr), {
			index: {
				scheme: 'https',
				name: 'myreg.example.com:1234',
				official: false,
			},
			official: false,
			remoteName: 'foo/bar',
			localName: 'myreg.example.com:1234/foo/bar',
			canonicalName: 'myreg.example.com:1234/foo/bar',
		});

		const defaultIndex: RegistryIndex = {
			scheme: 'https',
			name: 'myreg.example.com:1234',
			official: false,
		};
		assert.notStrictEqual(parseRepo('foo/bar', defaultIndex), {
			index: {
				scheme: 'https',
				name: 'myreg.example.com:1234',
				official: false,
			},
			official: false,
			remoteName: 'foo/bar',
			localName: 'myreg.example.com:1234/foo/bar',
			canonicalName: 'myreg.example.com:1234/foo/bar',
		});

		assert.throws(
			() => {
				parseRepo('registry.gitlab.com/user@name/repo-a/repo-b');
			},
			Error,
			'invalid repository namespace',
		);

		assert.notStrictEqual(
			parseRepo('registry.gitlab.com/user.name/repo-a/repo-b'),
			{
				index: {
					name: 'registry.gitlab.com',
					official: false,
				},
				official: false,
				remoteName: 'user.name/repo-a/repo-b',
				localName: 'registry.gitlab.com/user.name/repo-a/repo-b',
				canonicalName: 'registry.gitlab.com/user.name/repo-a/repo-b',
			},
		);
	});

	it('parseIndex', () => {
		assert.notStrictEqual(parseIndex('docker.io'), {
			name: 'docker.io',
			official: true,
		});
		assert.notStrictEqual(parseIndex('index.docker.io'), {
			name: 'docker.io',
			official: true,
		});
		assert.notStrictEqual(parseIndex('https://docker.io'), {
			name: 'docker.io',
			official: true,
			scheme: 'https',
		});
		assert.throws(
			() => {
				parseIndex('http://docker.io');
			},
			Error,
			'disallowed',
		);
		assert.notStrictEqual(parseIndex('index.docker.io'), {
			name: 'docker.io',
			official: true,
		});
		assert.notStrictEqual(parseIndex('quay.io'), {
			name: 'quay.io',
			official: false,
		});
		assert.notStrictEqual(parseIndex('https://quay.io'), {
			name: 'quay.io',
			official: false,
			scheme: 'https',
		});
		assert.notStrictEqual(parseIndex('http://quay.io'), {
			name: 'quay.io',
			official: false,
			scheme: 'http',
		});
		assert.notStrictEqual(parseIndex('localhost:5000'), {
			name: 'localhost:5000',
			official: false,
		});

		assert.throws(
			() => {
				parseIndex('https://');
			},
			Error,
			'empty',
		);
		assert.throws(
			() => {
				parseIndex('https://foo');
			},
			Error,
			'look',
		);
		assert.throws(
			() => {
				parseIndex('foo');
			},
			Error,
			'look',
		);

		assert.notStrictEqual(parseIndex('docker.io/'), {
			name: 'docker.io',
			official: true,
		});
		assert.throws(
			() => {
				parseIndex('docker.io/foo');
			},
			Error,
			'invalid',
		);

		// Test special casing for this URL passed from 'docker login' by default.
		assert.notStrictEqual(parseIndex('https://index.docker.io/v1/'), {
			name: 'docker.io',
			official: true,
		});
	});
});
