import { isRouteErrorResponse } from "react-router";
import { isEnv } from "@/lib/config";

export type ErrorContentProps = {
	title: string;
	status: number;
	message: string;
	stack?: string;
};

export function getErrorContent(error: unknown): ErrorContentProps {
	let title = "An error occurred";
	let message =
		"We're sorry, this request could not be completed due to an error on our end. Please try again later.";
	let status = 500;
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		status = error.status;
		switch (error.status) {
			case 404:
				title = "Page Not Found";
				message =
					"The page you are trying to access does not exist. Please check the URL or try again later.";
				break;
			case 403:
				title = "Forbidden";
				message = "You do not have permission to access this page.";
				break;
			case 401:
				title = "Unauthorized";
				message = "You are not authorized to access this page.";
				break;
			case 400:
				title = "Bad Request";
				message =
					"The request could not be understood or was missing required parameters.";
				break;
		}
	} else if (isEnv("lcl") && error instanceof Error) {
		message = error.message;
		stack = error.stack;
	}

	return {
		title,
		message,
		status,
		stack,
	};
}
