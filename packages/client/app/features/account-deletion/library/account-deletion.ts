import { makeBrowserClient } from "~/library/supabase";

export interface AccountDeletionData {
	confirmationText: string;
}

export async function deleteAccount(): Promise<void> {
	const supabase = makeBrowserClient();

	// Delete the user account - this will cascade delete all related data
	// due to the foreign key constraints we set up in the database
	const { error } = await supabase.rpc("delete_user");

	if (error) {
		throw error;
	}
}

export function validateDeletionForm(data: AccountDeletionData): string[] {
	const errors: string[] = [];

	if (data.confirmationText !== "DELETE") {
		errors.push("Please type DELETE to confirm account deletion");
	}

	return errors;
}
