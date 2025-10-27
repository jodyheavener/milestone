export const serviceErrors = {
	// Request errors
	METHOD_NOT_ALLOWED: {
		message: "The requested method is not allowed",
		statusCode: 405,
	},
	UNAUTHORIZED: {
		message: "You are not authorized to perform this action",
		statusCode: 401,
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
