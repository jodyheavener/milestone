import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { updateEmail, updatePassword } from "../api/settings";
import { validateEmailForm, validatePasswordForm } from "../lib/validation";
import type { EmailUpdateData, PasswordUpdateData } from "../model/types";
import { DangerZone } from "../ui/danger-zone";
import { EmailForm } from "../ui/email-form";
import { PasswordForm } from "../ui/password-form";

export default function SettingsRoute() {
	const { user } = useAuth();
	const [emailError, setEmailError] = useState<string | null>(null);
	const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
	const [passwordError, setPasswordError] = useState<string | null>(null);
	const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
	const [isEmailLoading, setIsEmailLoading] = useState(false);
	const [isPasswordLoading, setIsPasswordLoading] = useState(false);

	const [emailData, setEmailData] = useState<EmailUpdateData>({
		newEmail: user?.email || "",
	});

	const [passwordData, setPasswordData] = useState<PasswordUpdateData>({
		currentPassword: "",
		newPassword: "",
		confirmPassword: "",
	});

	const handleEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setEmailError(null);
		setEmailSuccess(null);

		const validationErrors = validateEmailForm(emailData);
		if (validationErrors.length > 0) {
			setEmailError(validationErrors.join(", "));
			return;
		}

		setIsEmailLoading(true);

		try {
			await updateEmail(emailData);
			setEmailSuccess(
				"Email updated successfully! Please check your new email for verification."
			);
		} catch (err) {
			setEmailError(
				err instanceof Error ? err.message : "Failed to update email"
			);
		} finally {
			setIsEmailLoading(false);
		}
	};

	const handlePasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setPasswordError(null);
		setPasswordSuccess(null);

		const validationErrors = validatePasswordForm(passwordData);
		if (validationErrors.length > 0) {
			setPasswordError(validationErrors.join(", "));
			return;
		}

		setIsPasswordLoading(true);

		try {
			await updatePassword(passwordData);
			setPasswordSuccess("Password updated successfully!");
			setPasswordData({
				currentPassword: "",
				newPassword: "",
				confirmPassword: "",
			});
		} catch (err) {
			setPasswordError(
				err instanceof Error ? err.message : "Failed to update password"
			);
		} finally {
			setIsPasswordLoading(false);
		}
	};

	return (
		<div className="max-w-2xl mx-auto p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground">Account</h1>
				<p className="text-muted-foreground mt-2">Manage your account.</p>
			</div>

			<div className="space-y-8">
				<EmailForm
					data={emailData}
					onChange={setEmailData}
					onSubmit={handleEmailSubmit}
					isLoading={isEmailLoading}
					error={emailError}
					success={emailSuccess}
				/>

				<PasswordForm
					data={passwordData}
					onChange={setPasswordData}
					onSubmit={handlePasswordSubmit}
					isLoading={isPasswordLoading}
					error={passwordError}
					success={passwordSuccess}
				/>

				<DangerZone />
			</div>
		</div>
	);
}
