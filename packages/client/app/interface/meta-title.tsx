import { createPageTitle } from "~/library/utilities";

export function Title({
	title,
	parentTitle,
}: {
	title: string;
	parentTitle?: string;
}) {
	return <title>{createPageTitle(parentTitle, title)}</title>;
}
