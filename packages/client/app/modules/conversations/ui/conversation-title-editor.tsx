import { useRef, useState } from "react";
import { Form, useNavigation, useSubmit } from "react-router";
import { cn } from "@/lib";

interface ConversationTitleEditorProps {
	conversationId: string;
	title: string | null;
}

export function ConversationTitleEditor({
	conversationId,
	title,
}: ConversationTitleEditorProps) {
	const [isEditing, setIsEditing] = useState(false);
	// Use local state only when editing, otherwise derive from prop
	const [editTitle, setEditTitle] = useState(title || "");
	const navigation = useNavigation();
	const submit = useSubmit();
	const formRef = useRef<HTMLFormElement>(null);

	const isSubmitting = navigation.state === "submitting";

	// When starting to edit, ensure we have the current title
	const handleStartEditing = () => {
		setEditTitle(title || "");
		setIsEditing(true);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!isSubmitting && formRef.current) {
			const formData = new FormData(formRef.current);
			submit(formData, { method: "post" });
			setIsEditing(false);
		}
	};

	const handleBlur = () => {
		if (!isSubmitting && formRef.current) {
			// Only submit if the title actually changed
			if (editTitle !== (title || "")) {
				const formData = new FormData(formRef.current);
				submit(formData, { method: "post" });
			}
			setIsEditing(false);
		}
	};

	if (isEditing) {
		return (
			<Form
				ref={formRef}
				method="post"
				onSubmit={handleSubmit}
				className="flex-1"
			>
				<input type="hidden" name="intent" value="update_title" />
				<input type="hidden" name="conversation_id" value={conversationId} />
				<input
					type="text"
					name="title"
					value={editTitle}
					onChange={(e) => setEditTitle(e.target.value)}
					onBlur={handleBlur}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							handleSubmit(e);
						} else if (e.key === "Escape") {
							setEditTitle(title || "");
							setIsEditing(false);
						}
					}}
					autoFocus
					className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					placeholder="Conversation title"
				/>
			</Form>
		);
	}

	return (
		<button
			type="button"
			onClick={handleStartEditing}
			className={cn(
				"text-left flex-1 min-w-0",
				"hover:bg-accent rounded px-2 py-1 transition-colors"
			)}
		>
			<h1 className="text-2xl font-bold truncate">
				{title || "New Conversation"}
			</h1>
		</button>
	);
}
