import { ServiceError, type ServiceErrorType } from "@milestone/shared";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useCallback, useState } from "react";

export function parseFormData<TData extends Record<string, FormDataEntryValue>>(
	form: HTMLFormElement
): TData {
	const formData = new FormData(form);
	const entries = Array.from(formData.entries());
	return Object.fromEntries(entries) as TData;
}

type SubmitError = ServiceError | Error;

const parseSubmitError = (error: unknown): SubmitError => {
	if (error instanceof FunctionsHttpError) {
		return error;
	} else if (error instanceof Error) {
		return error;
	} else if (typeof error === "string") {
		return new Error(error);
	} else {
		return new Error("An unknown error occurred");
	}
};

const getErrorMessage = async (error: SubmitError): Promise<string> => {
	if (error instanceof FunctionsHttpError) {
		try {
			const response = error.context as Response;
			const { type } = (await response.json()) as { type: ServiceErrorType };
			return new ServiceError(type).message;
		} catch {
			return "A server error occurred";
		}
	}
	return error.message;
};

export function useForm<TData extends ReturnType<typeof parseFormData>>() {
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string>();
	const [fieldErrors, setFieldErrors] = useState<
		Partial<Record<keyof TData, string>>
	>({});

	const makeSubmitHandler = useCallback(
		(
			callback: (data: TData) => Promise<void>,
			onError?: (error: SubmitError) => void
		) => {
			return async (event: React.FormEvent<HTMLFormElement>) => {
				event.preventDefault();
				setIsLoading(true);

				try {
					const data = parseFormData<TData>(event.currentTarget);
					await callback(data);
				} catch (err) {
					const error = parseSubmitError(err);

					if (onError) {
						onError(error);
					} else {
						const message = await getErrorMessage(error);
						setErrorMessage(message);
					}
				} finally {
					setIsLoading(false);
				}
			};
		},
		[setErrorMessage]
	);

	const setFieldError = useCallback((key: keyof TData, message: string) => {
		setFieldErrors((prevErrors) => ({
			...prevErrors,
			[key]: message,
		}));
	}, []);

	const clearFieldError = useCallback((key: keyof TData) => {
		setFieldErrors((prevErrors) => ({
			...prevErrors,
			[key]: undefined,
		}));
	}, []);

	return {
		isLoading,
		makeSubmitHandler,
		errorMessage,
		setErrorMessage,
		fieldErrors,
		setFieldError,
		clearFieldError,
	};
}
