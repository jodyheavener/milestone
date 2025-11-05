import { useEffect, useRef, useState } from "react";
import { Form, useActionData, useNavigation, useSubmit } from "react-router";
import { cn } from "@/lib";
import type { ConversationEntry } from "../model/types";

interface ChatInterfaceProps {
	conversationId: string;
	entries: ConversationEntry[];
	isLoading?: boolean;
}

export function ChatInterface({
	conversationId,
	entries,
	isLoading: externalLoading,
}: ChatInterfaceProps) {
	const [message, setMessage] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const navigation = useNavigation();
	const submit = useSubmit();
	const actionData = useActionData<{ error?: string }>();

	const isSubmitting =
		navigation.state === "submitting" ||
		externalLoading ||
		(navigation.formData?.get("conversation_id") === conversationId &&
			navigation.state !== "idle");

	// Scroll to bottom when entries change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [entries]);

	// Track previous submission state to detect when submission completes
	const prevSubmittingRef = useRef(isSubmitting);
	useEffect(() => {
		// If we were submitting and now we're not, and there's no error, clear the message
		if (prevSubmittingRef.current && !isSubmitting && !actionData?.error) {
			// Reset message after successful submission
			queueMicrotask(() => {
				setMessage("");
			});
		}
		prevSubmittingRef.current = isSubmitting;
	}, [isSubmitting, actionData?.error]);

	const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!message.trim() || isSubmitting) return;

		const formData = new FormData();
		formData.set("intent", "send_message");
		formData.set("conversation_id", conversationId);
		formData.set("message", message.trim());

		submit(formData, {
			method: "post",
		});
	};

	return (
		<div className="flex flex-col h-full">
			{/* Messages area */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
				{entries.length === 0 && (
					<div className="text-center text-muted-foreground py-8">
						<p>Start the conversation by sending a message.</p>
					</div>
				)}

				{entries.map((entry) => (
					<div
						key={entry.id}
						className={cn(
							"flex",
							entry.role === "user" ? "justify-end" : "justify-start"
						)}
					>
						<div
							className={cn(
								"max-w-[80%] rounded-lg px-4 py-2",
								entry.role === "user"
									? "bg-primary text-primary-foreground"
									: "bg-muted text-foreground"
							)}
						>
							<div className="whitespace-pre-wrap break-words">
								{entry.content}
							</div>
						</div>
					</div>
				))}

				{isSubmitting && (
					<div className="flex justify-start">
						<div className="bg-muted text-foreground rounded-lg px-4 py-2">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 bg-current rounded-full animate-pulse" />
								<div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:0.2s]" />
								<div className="w-2 h-2 bg-current rounded-full animate-pulse [animation-delay:0.4s]" />
							</div>
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input area */}
			<div className="border-t border-border p-4">
				{actionData?.error && (
					<div className="mb-2 p-2 text-sm text-destructive bg-destructive/10 rounded">
						{actionData.error}
					</div>
				)}

				<Form ref={formRef} onSubmit={handleSubmit} className="flex gap-2">
					<input type="hidden" name="conversation_id" value={conversationId} />
					<textarea
						name="message"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.shiftKey) {
								e.preventDefault();
								if (!isSubmitting && message.trim() && formRef.current) {
									formRef.current.requestSubmit();
								}
							}
						}}
						placeholder="Type your message..."
						disabled={isSubmitting}
						rows={3}
						className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
					/>
					<button
						type="submit"
						disabled={isSubmitting || !message.trim()}
						className={cn(
							"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
							"h-auto px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
						)}
					>
						{isSubmitting ? "Sending..." : "Send"}
					</button>
				</Form>
			</div>
		</div>
	);
}
