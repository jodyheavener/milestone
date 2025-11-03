import { Link } from "react-router";
import type { RecordWithProjects } from "../model/types";
import { RecordListItem } from "./record-list-item";

interface RecordListForProjectProps {
	records: RecordWithProjects[];
	projectId: string;
}

export function RecordListForProject({
	records,
	projectId,
}: RecordListForProjectProps) {
	if (records.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-muted-foreground">
					No records yet for this project.
				</p>
				<Link
					to={`/records/new?project=${projectId}`}
					className="text-sm text-primary hover:underline mt-2 inline-block"
				>
					Create your first record
				</Link>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{records.map((record) => (
				<RecordListItem key={record.id} record={record} />
			))}
		</div>
	);
}
