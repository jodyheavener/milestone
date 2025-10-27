export function parseFormData<TData extends Record<string, FormDataEntryValue>>(
	form: HTMLFormElement
): TData {
	const formData = new FormData(form);
	const entries = Array.from(formData.entries());
	return Object.fromEntries(entries) as TData;
}
