import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type { ReactNode } from "react";
import { stripe } from "~/library/config";

const stripePromise = loadStripe(stripe.publishableKey);

export function StripeProvider({ children }: { children: ReactNode }) {
	return <Elements stripe={stripePromise}>{children}</Elements>;
}
