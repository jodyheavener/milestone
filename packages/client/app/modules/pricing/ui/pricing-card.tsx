import { formatInterval, formatPrice } from "@/lib/formatters";
import type { Product } from "@/modules/account/model/types";
import { getProductFeatures } from "../lib/products";

interface PricingCardProps {
	product: Product;
	index: number;
	totalProducts: number;
	isLoading: string | null;
	hasSubscription: boolean;
	onSubscribe: (priceId: string) => void;
}

export function PricingCard({
	product,
	index,
	totalProducts,
	isLoading,
	hasSubscription,
	onSubscribe,
}: PricingCardProps) {
	const price =
		product.prices.find(
			(p: Product["prices"][number]) => p.type === "recurring"
		) || product.prices[0];

	if (!price) {
		return null;
	}

	const metadata =
		(product.metadata as Record<string, unknown> | null | undefined) || null;
	const isPopular =
		metadata?.popular === true || index === Math.floor(totalProducts / 2);

	const features = getProductFeatures(product);

	return (
		<div
			className={`relative rounded-lg border-2 p-8 ${
				isPopular ? "border-primary bg-primary/5" : "border-border bg-card"
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
					<p className="text-muted-foreground mb-4">{product.description}</p>
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
				{features.map((feature) => (
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
				onClick={() => onSubscribe(price.stripe_price_id)}
				disabled={isLoading === price.stripe_price_id || hasSubscription}
				className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
					isPopular
						? "bg-primary text-primary-foreground hover:bg-primary/90"
						: "bg-secondary text-secondary-foreground hover:bg-secondary/80"
				} disabled:opacity-50 disabled:cursor-not-allowed`}
			>
				{isLoading === price.stripe_price_id
					? "Loading..."
					: hasSubscription
						? "Current Plan"
						: "Subscribe"}
			</button>
		</div>
	);
}
