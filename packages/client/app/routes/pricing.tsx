import { useState } from "react";
import type { Route } from "./+types/pricing";
import { AuthContext } from "~/library/supabase/auth";
import {
	type Product,
	createCheckoutSession,
	getProducts,
	getSubscription,
} from "~/features/account-billing";
import { makeBrowserClient } from "~/library/supabase";

export async function loader({ context }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const {
		data: { user },
	} = await supabase.auth.getUser();

	let subscription = null;
	let products: Product[] = [];

	if (user) {
		try {
			subscription = await getSubscription(supabase);
		} catch (error) {
			console.error("Error fetching subscription:", error);
		}
	}

	try {
		products = await getProducts(supabase);
	} catch (error) {
		console.error("Error fetching products:", error);
	}

	return { subscription, products };
}

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Pricing - Milestone" },
		{ name: "description", content: "Choose the perfect plan for your needs" },
	];
}

function formatPrice(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency.toUpperCase(),
	}).format(amount / 100);
}

function formatInterval(interval: string | null): string {
	if (!interval) return "";
	return `/${interval}`;
}

export default function PricingRoute({ loaderData }: Route.ComponentProps) {
	const [isLoading, setIsLoading] = useState<string | null>(null);
	const { subscription, products } = loaderData;

	const handleSubscribe = async (priceId: string) => {
		setIsLoading(priceId);
		try {
			const supabase = makeBrowserClient();
			const result = await createCheckoutSession(supabase, [priceId]);
			if (result.url) {
				window.location.href = result.url;
			}
		} catch (error) {
			console.error("Error creating checkout session:", error);
			alert("Failed to start checkout. Please try again.");
		} finally {
			setIsLoading(null);
		}
	};

	// Extract features from metadata or use default format
	function getFeatures(product: Product): string[] {
		const metadata = product.metadata as Record<string, unknown> | null;
		if (metadata?.features && Array.isArray(metadata.features)) {
			return metadata.features as string[];
		}

		// Fallback: generate from metadata if available
		const features: string[] = [];
		if (metadata?.projects_limit) {
			const limit = metadata.projects_limit as number;
			features.push(
				limit === -1 || limit >= 1000
					? "Unlimited projects"
					: `${limit} project${limit !== 1 ? "s" : ""}`
			);
		}
		if (metadata?.agentic_limit) {
			const limit = metadata.agentic_limit as number;
			features.push(`${limit.toLocaleString()} agentic requests per 12 hours`);
		}
		if (metadata?.support_level) {
			features.push(`${metadata.support_level as string} support`);
		}

		return features.length > 0
			? features
			: ["See details for more information"];
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
				<div className="text-center mb-16">
					<h1 className="text-4xl font-bold text-foreground mb-4">
						Pricing Plans
					</h1>
					<p className="text-xl text-muted-foreground">
						Choose the perfect plan for your needs
					</p>
				</div>

				{subscription && (
					<div className="mb-8 p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
						<p className="text-primary">
							You currently have an active subscription.
						</p>
					</div>
				)}

				{products.length === 0 ? (
					<div className="text-center py-16">
						<p className="text-muted-foreground">
							No pricing plans available at this time.
						</p>
					</div>
				) : (
					<div
						className={`grid gap-8 ${
							products.length === 1
								? "md:grid-cols-1 max-w-md mx-auto"
								: products.length === 2
									? "md:grid-cols-2 max-w-4xl mx-auto"
									: "md:grid-cols-3"
						}`}
					>
						{products.map((product, index) => {
							// Use the first recurring price (or first price if available)
							const price =
								product.prices.find(
									(p: Product["prices"][number]) => p.type === "recurring"
								) || product.prices[0];

							if (!price) {
								return null;
							}

							const metadata =
								(product.metadata as
									| Record<string, unknown>
									| null
									| undefined) || null;
							const isPopular =
								metadata?.popular === true ||
								index === Math.floor(products.length / 2);

							return (
								<div
									key={product.id}
									className={`relative rounded-lg border-2 p-8 ${
										isPopular
											? "border-primary bg-primary/5"
											: "border-border bg-card"
									}`}
								>
									{isPopular && (
										<div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
											<span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
												Most Popular
											</span>
										</div>
									)}

									<div className="text-center mb-6">
										<h3 className="text-2xl font-bold text-foreground mb-2">
											{product.name}
										</h3>
										{product.description && (
											<p className="text-muted-foreground mb-4">
												{product.description}
											</p>
										)}
										<div className="flex items-baseline justify-center">
											<span className="text-4xl font-bold text-foreground">
												{formatPrice(price.unit_amount, price.currency)}
											</span>
											<span className="text-muted-foreground ml-2">
												{formatInterval(price.recurring_interval)}
											</span>
										</div>
									</div>

									<ul className="space-y-3 mb-8">
										{getFeatures(product).map((feature) => (
											<li key={feature} className="flex items-start">
												<svg
													className="w-5 h-5 text-primary mr-2 mt-0.5 flex-shrink-0"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M5 13l4 4L19 7"
													/>
												</svg>
												<span className="text-foreground">{feature}</span>
											</li>
										))}
									</ul>

									<button
										onClick={() => handleSubscribe(price.stripe_price_id)}
										disabled={
											isLoading === price.stripe_price_id ||
											subscription !== null
										}
										className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
											isPopular
												? "bg-primary text-primary-foreground hover:bg-primary/90"
												: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
										} disabled:opacity-50 disabled:cursor-not-allowed`}
									>
										{isLoading === price.stripe_price_id
											? "Loading..."
											: subscription
												? "Current Plan"
												: subscription === null
													? "Subscribe"
													: "Sign Up"}
									</button>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
