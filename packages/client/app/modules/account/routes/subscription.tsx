import { useState } from "react";
import { AuthContext } from "@/lib/supabase";
import {
	getEntitlements,
	getProjectsCount,
	getSubscription,
	getUsageCounters,
} from "../api/subscription";
import { handleManageSubscription as handleManageSubscriptionAction } from "../lib/subscription-handlers";
import { SubscriptionDisplay } from "../ui/subscription-display";
import type { Route } from "./+types/subscription";

export async function loader({ context }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const {
		data: { user },
	} = await supabase.auth.getUser();

	if (!user) {
		throw new Response("Unauthorized", { status: 401 });
	}

	const [subscription, entitlements, usageCounters, projectsCount] =
		await Promise.all([
			getSubscription(supabase).catch(() => null),
			getEntitlements(supabase).catch(() => null),
			getUsageCounters(supabase).catch(() => null),
			getProjectsCount(supabase).catch(() => 0),
		]);

	return {
		subscription,
		entitlements,
		usageCounters,
		projectsCount,
	};
}

export function meta({}: Route.MetaArgs) {
	return [
		{ title: "Subscription - Milestone" },
		{ name: "description", content: "Manage your subscription and usage" },
	];
}

export default function SubscriptionRoute({
	loaderData,
}: Route.ComponentProps) {
	const [isLoading, setIsLoading] = useState(false);
	const { subscription, entitlements, usageCounters, projectsCount } =
		loaderData;

	const handleManageSubscription = async () => {
		setIsLoading(true);
		try {
			const url = await handleManageSubscriptionAction();
			if (url) {
				window.location.href = url;
			}
		} catch (error) {
			console.error("Error creating portal session:", error);
			alert("Failed to open subscription portal. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground">Subscription</h1>
				<p className="text-muted-foreground mt-2">
					Manage your subscription and usage.
				</p>
			</div>

			<SubscriptionDisplay
				subscription={subscription}
				entitlements={entitlements}
				usageCounters={usageCounters}
				projectsCount={projectsCount}
				onManageSubscription={handleManageSubscription}
				isLoading={isLoading}
			/>
		</div>
	);
}
