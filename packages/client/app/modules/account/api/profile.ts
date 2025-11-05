import type { SupabaseClient } from "@/lib/supabase";
import { makeBrowserClient } from "@/lib/supabase";
import type { Profile, ProfileUpdate, UpdateProfileData } from "../model/types";

export async function getProfile(
	supabase: SupabaseClient,
	userId: string
): Promise<Profile | null> {
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
	supabase: SupabaseClient,
	userId: string,
	data: UpdateProfileData
): Promise<Profile | null> {
	const updateData: Partial<ProfileUpdate> = {};

	if (data.name !== undefined) {
		updateData.name = data.name;
	}

	if (data.jobTitle !== undefined) {
		updateData.job_title = data.jobTitle;
	}

	if (data.employerName !== undefined) {
		updateData.employer_name = data.employerName;
	}

	if (data.employerDescription !== undefined) {
		updateData.employer_description = data.employerDescription;
	}

	if (data.employerWebsite !== undefined) {
		updateData.employer_website = data.employerWebsite;
	}

	const { data: profile, error } = await supabase
		.from("profile")
		.update(updateData)
		.eq("id", userId)
		.select()
		.single();

	if (error) {
		console.error("Error updating profile:", error);
		throw error;
	}

	return profile;
}

export async function updateProfileWithBrowser(
	userId: string,
	data: UpdateProfileData
): Promise<Profile | null> {
	const supabase = makeBrowserClient();
	return updateProfile(supabase, userId, data);
}
