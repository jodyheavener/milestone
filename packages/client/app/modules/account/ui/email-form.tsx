import type { EmailUpdateData } from "../model/types";

interface EmailFormProps {
	data: EmailUpdateData;
	onChange: (data: EmailUpdateData) => void;
	onSubmit: (e: React.FormEvent) => void;
	isLoading: boolean;
	error: string | null;
	success: string | null;
}

export function EmailForm({
	data,
	onChange,
	onSubmit,
	isLoading,
	error,
	success,
}: EmailFormProps) {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold text-foreground mb-4">
					Email Address
				</h2>
			</div>

			{error && (
				<div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
					<p className="text-destructive text-sm">{error}</p>
				</div>
			)}

			{success && (
				<div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
					<p className="text-green-600 text-sm">{success}</p>
				</div>
			)}

			<form onSubmit={onSubmit} className="space-y-4">
				<div>
					<label
						htmlFor="newEmail"
						className="block text-sm font-medium text-foreground mb-2"
					>
						New Email Address
					</label>
					<input
						id="newEmail"
						type="email"
						value={data.newEmail}
						onChange={(e) =>
							onChange({
								...data,
								newEmail: e.target.value,
							})
						}
						className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
						required
					/>
				</div>

				<div className="flex justify-end">
					<button
						type="submit"
						disabled={isLoading}
						className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? "Updating..." : "Update Email"}
					</button>
				</div>
			</form>
		</div>
	);
}
