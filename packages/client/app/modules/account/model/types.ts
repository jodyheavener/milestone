import type { Tables, TablesUpdate } from "@milestone/shared";

export type Profile = Tables<"profile">;
export type ProfileUpdate = TablesUpdate<"profile">;

export interface UpdateProfileData {
	name?: string;
	jobTitle?: string | null;
	employerName?: string | null;
	employerDescription?: string | null;
	employerWebsite?: string | null;
}

export interface EmailUpdateData {
	newEmail: string;
}

export interface PasswordUpdateData {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

export interface AccountDeletionData {
	confirmationText: string;
}

export interface Subscription {
	id: string;
	status: string;
	current_period_start: string | null;
	current_period_end: string | null;
	cancel_at_period_end: boolean;
}

export interface Entitlements {
	projects_limit: number;
	agentic_limit: number;
	resets_at: string | null;
}

export interface UsageCounters {
	agentic_requests_used: number;
	projects_used: number;
	period_start: string;
	period_end: string;
}

export interface CreatePortalResponse {
	url: string;
}

export interface CreateCheckoutResponse {
	session_id: string;
	url: string;
}

export interface Product {
	id: string;
	stripe_product_id: string;
	name: string;
	description: string | null;
	metadata: unknown;
	prices: Array<{
		id: string;
		stripe_price_id: string;
		currency: string;
		unit_amount: number;
		recurring_interval: string | null;
		type: string;
		metadata: unknown;
	}>;
}

export interface AuthorizeOperationResponse {
	allowed: boolean;
	reason: string | null;
	remaining: number | null;
}
