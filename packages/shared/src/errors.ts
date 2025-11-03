export const serviceErrors = {
	// Request errors
	INTERNAL_ERROR: {
		message: "An internal error occurred",
		statusCode: 500,
	},
	METHOD_NOT_ALLOWED: {
		message: "The requested method is not allowed",
		statusCode: 405,
	},
	UNAUTHORIZED: {
		message: "You are not authorized to perform this action",
		statusCode: 401,
	},
	INVALID_REQUEST: {
		message: "The request is invalid",
		statusCode: 400,
	},
	NOT_FOUND: {
		message: "The requested resource was not found",
		statusCode: 404,
	},

	// Authentication errors
	BAD_AUTH_HEADER: {
		message: "An `Authorization` header is required but is missing or invalid",
		statusCode: 401,
	},
	INVALID_AUTH: {
		message: "No user found with the provided Authorization header",
		statusCode: 401,
	},

	// Storage errors
	FILE_NOT_FOUND: {
		message: "File not found",
		statusCode: 404,
	},
	UNSUPPORTED_FILE_TYPE: {
		message: "Unsupported file type",
		statusCode: 400,
	},

	// Website parsing errors
	INVALID_URL: {
		message: "Invalid URL format",
		statusCode: 400,
	},
	NO_CONTENT: {
		message: "No content could be extracted from the website",
		statusCode: 400,
	},
};

export type ServiceErrorType = keyof typeof serviceErrors;

export class ServiceError extends Error {
	type: ServiceErrorType;
	status: number;
	responseInfo?: unknown;
	debugInfo?: unknown;

	constructor(
		errorType: ServiceErrorType,
		details?: {
			responseInfo?: unknown;
			debugInfo?: unknown;
		}
	) {
		const { message, statusCode } = serviceErrors[errorType];
		const { responseInfo, debugInfo } = details || {};

		super(message);
		this.name = "ServiceError";
		this.type = errorType;
		this.status = statusCode;
		this.responseInfo = responseInfo;
		this.debugInfo = debugInfo;
	}
}
