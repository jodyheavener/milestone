import { Link } from "react-router";
import { cn } from "@/lib";
import type { Conversation } from "../model/types";

interface ConversationListProps {
	conversations: Conversation[];
	projectId: string;
}

export function ConversationList({
	conversations,
	projectId,
}: ConversationListProps) {
	if (conversations.length === 0) {
		return (
			<div className="text-center py-8 text-muted-foreground">
				<p>No conversations yet. Start a new conversation to begin.</p>
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{conversations.map((conversation) => (
				<Link
					key={conversation.id}
					to={`/projects/${projectId}/conversations/${conversation.id}`}
					className={cn(
						"block p-4 rounded-lg border border-border hover:bg-accent transition-colors"
					)}
				>
					<div className="flex items-center justify-between">
						<div className="flex-1 min-w-0">
							<h3 className="font-medium truncate">
								{conversation.title || "New Conversation"}
							</h3>
							<p className="text-sm text-muted-foreground mt-1">
								{new Date(conversation.updated_at).toLocaleDateString()}
							</p>
						</div>
					</div>
				</Link>
			))}
		</div>
	);
}
