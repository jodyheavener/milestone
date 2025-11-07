import { Link } from "react-router";
import { cn } from "@/lib";
import type { ContextEntryWithProjects } from "../model/types";

interface ContextEntryListItemProps {
	contextEntry: ContextEntryWithProjects;
}

export function ContextEntryListItem({
	contextEntry,
}: ContextEntryListItemProps) {
	return (
		<Link
			to={`/context/${contextEntry.id}`}
			className={cn(
				"block p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
			)}
		>
			<div className="space-y-2">
				<div className="text-xs text-muted-foreground">
					{new Date(contextEntry.created_at).toLocaleDateString()}
				</div>
				<div className="text-sm text-muted-foreground line-clamp-2">
					{contextEntry.content}
				</div>
			</div>
		</Link>
	);
}
