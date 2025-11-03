import { Link } from "react-router";

export function DangerZone() {
	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-xl font-semibold text-foreground mb-4">
					Danger Zone
				</h2>
			</div>

			<div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5">
				<div className="flex items-center justify-between">
					<div>
						<h3 className="text-lg font-medium text-foreground">
							Delete Account
						</h3>
						<p className="text-muted-foreground mt-1">
							Permanently delete your account and all associated data. This
							action cannot be undone.
						</p>
					</div>
					<Link
						to="/account/delete"
						className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
					>
						Delete Account
					</Link>
				</div>
			</div>
		</div>
	);
}
