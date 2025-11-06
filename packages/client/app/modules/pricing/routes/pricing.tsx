import { useState } from "react";
import { AuthContext } from "@/lib/supabase";
import { makeBrowserClient } from "@/lib/supabase";
import {
	createCheckoutSession,
	getProducts,
	getSubscription,
} from "@/modules/account/api/subscription";
import type { Product } from "@/modules/account/model/types";
import { PricingCard } from "../ui/pricing-card";
import { PricingHeader } from "../ui/pricing-header";
import type { Route } from "./+types/pricing";

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

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
				<PricingHeader hasSubscription={!!subscription} />

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
						{products.map((product, index) => (
							<PricingCard
								key={product.id}
								product={product}
								index={index}
								totalProducts={products.length}
								isLoading={isLoading}
								hasSubscription={!!subscription}
								onSubscribe={handleSubscribe}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
