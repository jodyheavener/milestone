import { Link } from "react-router";
import type {
	Entitlements,
	Subscription,
	UsageCounters,
} from "../model/types";
import { calculateUsagePercent, formatDate } from "../lib/formatters";

interface BillingDisplayProps {
	subscription: Subscription | null;
	entitlements: Entitlements | null;
	usageCounters: UsageCounters | null;
	projectsCount: number;
	onManageBilling: () => void;
	isLoading: boolean;
}

export function BillingDisplay({
	subscription,
	entitlements,
	usageCounters,
	projectsCount,
	onManageBilling,
	isLoading,
}: BillingDisplayProps) {
	const projectsUsed = projectsCount || 0;
	const projectsLimit = entitlements?.projects_limit || 0;
	const agenticUsed = usageCounters?.agentic_requests_used || 0;
	const agenticLimit = entitlements?.agentic_limit || 0;

	const projectsPercent = calculateUsagePercent(projectsUsed, projectsLimit);
	const agenticPercent = calculateUsagePercent(agenticUsed, agenticLimit);

	return (
		<div className="space-y-8">
			{/* Subscription Status */}
			<div className="space-y-6">
				<div>
					<h2 className="text-xl font-semibold text-foreground mb-4">
						Subscription
					</h2>
				</div>

				{subscription ? (
					<div className="p-6 border border-border rounded-lg bg-card">
						<div className="grid md:grid-cols-2 gap-4">
							<div>
								<p className="text-sm text-muted-foreground">Status</p>
								<p className="text-lg font-semibold text-foreground capitalize">
									{subscription.status}
								</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">
									Current Period End
								</p>
								<p className="text-lg font-semibold text-foreground">
									{subscription.current_period_end
										? formatDate(subscription.current_period_end)
										: "Not available"}
								</p>
							</div>
							<div>
								<p className="text-sm text-muted-foreground">
									Current Period Start
								</p>
								<p className="text-lg font-semibold text-foreground">
									{subscription.current_period_start
										? formatDate(subscription.current_period_start)
										: "Not available"}
								</p>
							</div>
							{subscription.cancel_at_period_end && (
								<div>
									<p className="text-sm text-muted-foreground">Cancellation</p>
									<p className="text-lg font-semibold text-destructive">
										Cancels at period end
									</p>
								</div>
							)}
						</div>

						<button
							onClick={onManageBilling}
							disabled={isLoading}
							className="mt-6 px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{isLoading ? "Loading..." : "Manage Billing"}
						</button>
					</div>
				) : (
					<div className="p-6 border border-border rounded-lg bg-card">
						<p className="text-muted-foreground mb-4">
							You don't have an active subscription.
						</p>
						<Link
							to="/pricing"
							className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
						>
							View Plans
						</Link>
					</div>
				)}
			</div>

			{/* Usage */}
			{entitlements &&
				(entitlements.projects_limit > 0 || entitlements.agentic_limit > 0) && (
					<div className="space-y-6">
						<div>
							<h2 className="text-xl font-semibold text-foreground mb-4">
								Usage
							</h2>
						</div>

						{/* Projects Usage */}
						{entitlements.projects_limit > 0 && (
							<div className="p-6 border border-border rounded-lg bg-card">
								<div className="flex justify-between items-center mb-2">
									<h3 className="text-lg font-semibold text-foreground">
										Projects
									</h3>
									<span className="text-sm text-muted-foreground">
										{projectsUsed} / {projectsLimit}
									</span>
								</div>
								<div className="w-full bg-secondary rounded-full h-2.5 mb-2">
									<div
										className={`h-2.5 rounded-full ${
											projectsPercent >= 100
												? "bg-destructive"
												: projectsPercent >= 80
													? "bg-yellow-500"
													: "bg-primary"
										}`}
										style={{ width: `${projectsPercent}%` }}
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									Resets on {formatDate(entitlements.resets_at)}
								</p>
							</div>
						)}

						{/* Agentic Requests Usage */}
						{entitlements.agentic_limit > 0 && (
							<div className="p-6 border border-border rounded-lg bg-card">
								<div className="flex justify-between items-center mb-2">
									<h3 className="text-lg font-semibold text-foreground">
										Agentic Requests
									</h3>
									<span className="text-sm text-muted-foreground">
										{agenticUsed} / {agenticLimit}
									</span>
								</div>
								<div className="w-full bg-secondary rounded-full h-2.5 mb-2">
									<div
										className={`h-2.5 rounded-full ${
											agenticPercent >= 100
												? "bg-destructive"
												: agenticPercent >= 80
													? "bg-yellow-500"
													: "bg-primary"
										}`}
										style={{ width: `${agenticPercent}%` }}
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									Rolling 12-hour window
								</p>
							</div>
						)}
					</div>
				)}
		</div>
	);
}
