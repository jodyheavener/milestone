import { Link } from "react-router";
import { cn } from "@/lib";
import type { RecordWithProjects } from "../model/types";

interface RecordListItemProps {
	record: RecordWithProjects;
}

export function RecordListItem({ record }: RecordListItemProps) {
	return (
		<Link
			to={`/records/${record.id}`}
			className={cn(
				"block p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors"
			)}
		>
			<div className="space-y-2">
				<div className="text-xs text-muted-foreground">
					{new Date(record.created_at).toLocaleDateString()}
				</div>
				<div className="text-sm text-muted-foreground line-clamp-2">
					{record.content}
				</div>
			</div>
		</Link>
	);
}
