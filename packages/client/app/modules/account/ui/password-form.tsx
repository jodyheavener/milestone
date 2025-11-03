import type { PasswordUpdateData } from "../model/types";

interface PasswordFormProps {
	data: PasswordUpdateData;
	onChange: (data: PasswordUpdateData) => void;
	onSubmit: (e: React.FormEvent) => void;
	isLoading: boolean;
	error: string | null;
	success: string | null;
}

export function PasswordForm({
	data,
	onChange,
	onSubmit,
	isLoading,
	error,
	success,
}: PasswordFormProps) {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold text-foreground mb-4">Password</h2>
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
						htmlFor="currentPassword"
						className="block text-sm font-medium text-foreground mb-2"
					>
						Current Password
					</label>
					<input
						id="currentPassword"
						type="password"
						value={data.currentPassword}
						onChange={(e) =>
							onChange({
								...data,
								currentPassword: e.target.value,
							})
						}
						className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
						required
					/>
				</div>

				<div>
					<label
						htmlFor="newPassword"
						className="block text-sm font-medium text-foreground mb-2"
					>
						New Password
					</label>
					<input
						id="newPassword"
						type="password"
						value={data.newPassword}
						onChange={(e) =>
							onChange({
								...data,
								newPassword: e.target.value,
							})
						}
						className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
						required
					/>
				</div>

				<div>
					<label
						htmlFor="confirmPassword"
						className="block text-sm font-medium text-foreground mb-2"
					>
						Confirm New Password
					</label>
					<input
						id="confirmPassword"
						type="password"
						value={data.confirmPassword}
						onChange={(e) =>
							onChange({
								...data,
								confirmPassword: e.target.value,
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
						{isLoading ? "Updating..." : "Update Password"}
					</button>
				</div>
			</form>
		</div>
	);
}
