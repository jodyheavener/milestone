import { useNavigate } from "react-router";
import type { AccountDeletionData } from "../model/types";

interface DeleteAccountFormProps {
	data: AccountDeletionData;
	onChange: (data: AccountDeletionData) => void;
	onSubmit: (e: React.FormEvent) => void;
	isLoading: boolean;
	error: string | null;
}

export function DeleteAccountForm({
	data,
	onChange,
	onSubmit,
	isLoading,
	error,
}: DeleteAccountFormProps) {
	const navigate = useNavigate();

	return (
		<div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5">
			<div className="mb-6">
				<h2 className="text-xl font-semibold text-destructive mb-4">
					Warning: This action is irreversible
				</h2>
				<p className="text-muted-foreground mb-4">
					Deleting your account will permanently remove:
				</p>
				<ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
					<li>Your profile information</li>
					<li>All your projects and their associated data</li>
					<li>All your context entries and their associated data</li>
					<li>All conversations and AI-generated content</li>
					<li>All file attachments and sources</li>
					<li>Your account settings and preferences</li>
				</ul>
				<p className="text-muted-foreground">
					This action cannot be undone. If you're sure you want to proceed, type{" "}
					<strong>DELETE</strong> in the confirmation field below.
				</p>
			</div>

			{error && (
				<div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
					<p className="text-destructive text-sm">{error}</p>
				</div>
			)}

			<form onSubmit={onSubmit} className="space-y-6">
				<div>
					<label
						htmlFor="confirmationText"
						className="block text-sm font-medium text-foreground mb-2"
					>
						Type DELETE to confirm
					</label>
					<input
						id="confirmationText"
						type="text"
						value={data.confirmationText}
						onChange={(e) =>
							onChange({
								...data,
								confirmationText: e.target.value,
							})
						}
						placeholder="DELETE"
						className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
						required
					/>
				</div>

				<div className="flex justify-between">
					<button
						type="button"
						onClick={() => navigate("/account")}
						className="px-6 py-2 border border-border text-foreground rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={isLoading || data.confirmationText !== "DELETE"}
						className="px-6 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? "Deleting Account..." : "Delete Account"}
					</button>
				</div>
			</form>
		</div>
	);
}
