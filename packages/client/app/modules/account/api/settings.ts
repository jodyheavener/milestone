import { makeBrowserClient } from "@/lib/supabase";
import type {
	EmailUpdateData,
	PasswordUpdateData,
} from "../model/types";

export async function updateEmail(data: EmailUpdateData): Promise<void> {
	const supabase = makeBrowserClient();

	const { error } = await supabase.auth.updateUser({
		email: data.newEmail,
	});

	if (error) {
		throw error;
	}
}

export async function updatePassword(data: PasswordUpdateData): Promise<void> {
	const supabase = makeBrowserClient();

	const { error } = await supabase.auth.updateUser({
		password: data.newPassword,
	});

	if (error) {
		throw error;
	}
}
