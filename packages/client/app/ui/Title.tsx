import { createPageTitle } from "@/lib/page-title";

export function Title({
	title,
	parentTitle,
}: {
	title: string;
	parentTitle?: string;
}) {
	return <title>{createPageTitle(parentTitle, title)}</title>;
}
