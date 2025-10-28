import { makeBrowserClient } from "~/library/supabase";
import type { Tables, TablesUpdate } from "@m/shared";

export type Profile = Tables<"profile">;
export type ProfileUpdate = TablesUpdate<"profile">;

export interface ProfileFormData {
	name: string;
	job_title: string;
	employer_name: string;
	employer_description: string;
	employer_website: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
	const supabase = makeBrowserClient();

	const { data, error } = await supabase
		.from("profile")
		.select("*")
		.eq("id", userId)
		.single();

	if (error) {
		console.error("Error fetching profile:", error);
		return null;
	}

	return data;
}

export async function updateProfile(
	userId: string,
	updates: ProfileUpdate
): Promise<Profile | null> {
	const supabase = makeBrowserClient();

	const { data, error } = await supabase
		.from("profile")
		.update(updates)
		.eq("id", userId)
		.select()
		.single();

	if (error) {
		console.error("Error updating profile:", error);
		throw error;
	}

	return data;
}

export function validateProfileForm(data: ProfileFormData): string[] {
	const errors: string[] = [];

	if (!data.name.trim()) {
		errors.push("Name is required");
	}

	if (data.employer_website && !isValidUrl(data.employer_website)) {
		errors.push("Employer website must be a valid URL");
	}

	return errors;
}

function isValidUrl(url: string): boolean {
	try {
		new URL(url);
		return true;
	} catch {
		return false;
	}
}
