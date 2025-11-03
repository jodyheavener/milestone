import { useState } from "react";
import { AuthContext } from "@/lib/supabase";
import {
	getEntitlements,
	getProjectsCount,
	getSubscription,
	getUsageCounters,
} from "../api/billing";
import { handleManageBilling as handleManageBillingAction } from "../lib/billing-handlers";
import { AccountNavigation } from "../ui/account-navigation";
import { BillingDisplay } from "../ui/billing-display";
import type { Route } from "./+types/billing";

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
		{ title: "Billing - Milestone" },
		{ name: "description", content: "Manage your subscription and usage" },
	];
}

export default function BillingRoute({ loaderData }: Route.ComponentProps) {
	const [isLoading, setIsLoading] = useState(false);
	const { subscription, entitlements, usageCounters, projectsCount } =
		loaderData;

	const handleManageBilling = async () => {
		setIsLoading(true);
		try {
			const url = await handleManageBillingAction();
			if (url) {
				window.location.href = url;
			}
		} catch (error) {
			console.error("Error creating portal session:", error);
			alert("Failed to open billing portal. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground">Billing</h1>
				<p className="text-muted-foreground mt-2">
					Manage your subscription and usage.
				</p>
				<AccountNavigation activeTab="billing" />
			</div>

			<BillingDisplay
				subscription={subscription}
				entitlements={entitlements}
				usageCounters={usageCounters}
				projectsCount={projectsCount}
				onManageBilling={handleManageBilling}
				isLoading={isLoading}
			/>
		</div>
	);
}
