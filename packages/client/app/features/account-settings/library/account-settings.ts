import { makeBrowserClient } from "~/library/supabase";

export interface EmailUpdateData {
	newEmail: string;
}

export interface PasswordUpdateData {
	currentPassword: string;
	newPassword: string;
	confirmPassword: string;
}

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

export function validateEmailForm(data: EmailUpdateData): string[] {
	const errors: string[] = [];

	if (!data.newEmail.trim()) {
		errors.push("Email is required");
	} else if (!isValidEmail(data.newEmail)) {
		errors.push("Please enter a valid email address");
	}

	return errors;
}

export function validatePasswordForm(data: PasswordUpdateData): string[] {
	const errors: string[] = [];

	if (!data.currentPassword) {
		errors.push("Current password is required");
	}

	if (!data.newPassword) {
		errors.push("New password is required");
	} else if (data.newPassword.length < 6) {
		errors.push("New password must be at least 6 characters");
	}

	if (data.newPassword !== data.confirmPassword) {
		errors.push("New passwords do not match");
	}

	return errors;
}

function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}
