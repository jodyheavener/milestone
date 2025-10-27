import { appTitle } from "@m/shared";

export function createPageTitle(title?: string, subtitle?: string) {
	if (!title || title === "") {
		return appTitle;
	}

	let pageTitle = title;

	if (subtitle && subtitle !== "") {
		pageTitle = `${subtitle} | ${pageTitle}`;
	}

	return `${pageTitle} | ${appTitle}`;
}
