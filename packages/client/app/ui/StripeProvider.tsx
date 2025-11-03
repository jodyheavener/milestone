import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import type { ReactNode } from "react";
import { config } from "@/lib/config";

const stripePromise = loadStripe(config("APP_STRIPE_PUBLISHABLE_KEY"));

export function StripeProvider({ children }: { children: ReactNode }) {
	return <Elements stripe={stripePromise}>{children}</Elements>;
}
