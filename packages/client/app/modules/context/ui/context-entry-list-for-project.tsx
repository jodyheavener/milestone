import { Link } from "react-router";
import type { ContextEntryWithProjects } from "../model/types";
import { ContextEntryListItem } from "./context-entry-list-item";

interface ContextEntryListForProjectProps {
	contextEntries: ContextEntryWithProjects[];
	projectId: string;
}

export function ContextEntryListForProject({
	contextEntries,
	projectId,
}: ContextEntryListForProjectProps) {
	if (contextEntries.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-muted-foreground">
					No context entries yet for this project.
				</p>
				<Link
					to={`/context/new?project=${projectId}`}
					className="text-sm text-primary hover:underline mt-2 inline-block"
				>
					Create your first context entry
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{contextEntries.map((contextEntry) => (
				<ContextEntryListItem
					key={contextEntry.id}
					contextEntry={contextEntry}
				/>
			))}
		</div>
	);
}
