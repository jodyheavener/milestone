import type {
	AccountDeletionData,
	EmailUpdateData,
	PasswordUpdateData,
} from "../model/types";

export interface ProfileFormData {
	name: string;
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

export function validateDeletionForm(data: AccountDeletionData): string[] {
	const errors: string[] = [];

	if (data.confirmationText !== "DELETE") {
		errors.push("Please type DELETE to confirm account deletion");
	}

	return errors;
}

export function validateProfileForm(data: ProfileFormData): string[] {
	const errors: string[] = [];

	if (!data.name.trim()) {
		errors.push("Name is required");
	}

	return errors;
}

function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}
