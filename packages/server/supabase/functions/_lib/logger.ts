import { AsyncLocalStorage } from "node:async_hooks";

type LogLevel = "info" | "warn" | "error";

interface LogContext {
	[key: string]: unknown;
}

/**
 * Logger utility with automatic requestId inclusion
 * Use setRequestId() at the start of a request handler to automatically include it in all logs
 */
class Logger {
	private requestIdStorage = new AsyncLocalStorage<string>();

	/**
	 * Set the request ID for the current async context
	 * This will be automatically included in all subsequent log calls
	 */
	setRequestId(requestId: string): void {
		this.requestIdStorage.enterWith(requestId);
	}

	private formatMessage(
		level: LogLevel,
		message: string,
		context?: LogContext,
	): void {
		const requestId = this.requestIdStorage.getStore();
		const logEntry = {
			level,
			msg: message,
			...(requestId && { requestId }),
			...(context ?? {}),
		};

		const output = JSON.stringify(logEntry);

		switch (level) {
			case "error":
				console.error(output);
				break;
			case "warn":
				console.warn(output);
				break;
			case "info":
			default:
				console.log(output);
				break;
		}
	}

	/**
	 * Log an info message
	 */
	info(message: string, context?: LogContext): void {
		this.formatMessage("info", message, context);
	}

	/**
	 * Log a warning message
	 */
	warn(message: string, context?: LogContext): void {
		this.formatMessage("warn", message, context);
	}

	/**
	 * Log an error message
	 */
	error(message: string, context?: LogContext): void {
		this.formatMessage("error", message, context);
	}
}

export const logger = new Logger();
