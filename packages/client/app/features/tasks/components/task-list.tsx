import { Link } from "react-router";
import type { Task } from "~/features/tasks";
import { cn } from "~/library/utilities";

interface TaskListProps {
	tasks: Task[];
	projectId?: string;
}

export function TaskList({ tasks, projectId }: TaskListProps) {
	if (tasks.length === 0) {
		return (
			<div className="text-center py-8">
				<p className="text-muted-foreground">No tasks yet for this project.</p>
				{projectId && (
					<Link
						to={`/tasks/new?project=${projectId}`}
						className="text-sm text-primary hover:underline mt-2 inline-block"
					>
						Create your first task
					</Link>
				)}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{tasks.map((task) => (
				<div
					key={task.id}
					className={cn(
						"flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:bg-accent transition-colors",
						task.completed_at && "opacity-60"
					)}
				>
					<div className="flex-shrink-0">
						<div
							className={cn(
								"w-5 h-5 rounded border-2 flex items-center justify-center",
								task.completed_at
									? "bg-primary border-primary text-primary-foreground"
									: "border-muted-foreground"
							)}
						>
							{task.completed_at && (
								<svg
									className="w-3 h-3"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clipRule="evenodd"
									/>
								</svg>
							)}
						</div>
					</div>
					<div className="flex-1 min-w-0">
						<Link
							to={`/tasks/${task.id}`}
							className={cn(
								"block text-sm",
								task.completed_at
									? "text-muted-foreground line-through"
									: "text-foreground"
							)}
						>
							{task.description}
						</Link>
						<div className="text-xs text-muted-foreground mt-1">
							{new Date(task.created_at).toLocaleDateString()}
							{task.completed_at && (
								<span className="ml-2">
									• Completed {new Date(task.completed_at).toLocaleDateString()}
								</span>
							)}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
