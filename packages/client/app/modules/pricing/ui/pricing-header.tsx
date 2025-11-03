interface PricingHeaderProps {
	hasSubscription: boolean;
}

export function PricingHeader({ hasSubscription }: PricingHeaderProps) {
	return (
		<>
			<div className="text-center mb-16">
				<h1 className="text-4xl font-bold text-foreground mb-4">
					Pricing Plans
				</h1>
				<p className="text-xl text-muted-foreground">
					Choose the perfect plan for your needs
				</p>
			</div>

			{hasSubscription && (
				<div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
					<p className="text-primary">
						You currently have an active subscription.
					</p>
				</div>
			)}
		</>
	);
}
