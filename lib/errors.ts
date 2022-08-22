/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/*
 * Copyright (c) 2015, Joyent, Inc.
 */

import { DockerResponse, RegistryError } from './types';

/*
 * Error classes that docker-registry-client may produce.
 */

/** Base class for custom error classes. */
export class ApiError extends Error {
	constructor(message: string) {
		super(message);
		this.name = new.target.name;
		Error.captureStackTrace?.(this, new.target);
	}
}

export class HttpError extends ApiError {
	name = 'HttpError';
	constructor(
		public resp: DockerResponse,
		public errors: RegistryError[],
		message: string,
	) {
		super(message);
	}
}

export class UnauthorizedError extends HttpError {
	readonly name = 'UnauthorizedError';
	readonly statusCode = 401;
}

export class ForbiddenError extends HttpError {
	readonly name = 'DeniedError';
	readonly statusCode = 403;
}

export class NotFoundError extends HttpError {
	readonly name = 'NotFoundError';
	readonly statusCode = 404;
}

export function getHttpError(statusCode: number): typeof HttpError {
	switch (statusCode) {
		case 401:
			return UnauthorizedError;
		case 403:
			return ForbiddenError;
		case 404:
			return NotFoundError;
		default:
			return HttpError;
	}
}

export class BadDigestError extends ApiError {
	readonly name = 'BadDigestError';
}
export class InvalidContentError extends ApiError {
	readonly name = 'InvalidContentError';
}

export class InternalError extends ApiError {
	readonly name = 'InternalError';
}

export class ManifestVerificationError extends ApiError {
	readonly name = 'ManifestVerificationError';
}

export class InvalidManifestError extends ApiError {
	readonly name = 'InvalidManifestError';
}

export class DownloadError extends ApiError {
	readonly name = 'DownloadError';
}

export class UploadError extends ApiError {
	readonly name = 'UploadError';
}

export class TooManyRedirectsError extends ApiError {
	readonly name = 'TooManyRedirectsError';
}
