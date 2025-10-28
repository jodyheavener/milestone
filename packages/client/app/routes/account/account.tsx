import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "~/features/authentication";
import {
	updateEmail,
	updatePassword,
	validateEmailForm,
	validatePasswordForm,
	type EmailUpdateData,
	type PasswordUpdateData,
} from "~/features/account-settings";

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
				<div className="mt-4 flex space-x-4">
					<span className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md">
						Account
					</span>
					<Link
						to="/account/profile"
						className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						Profile
					</Link>
				</div>
			</div>

			<div className="space-y-8">
				{/* Email Settings */}
				<div className="space-y-6">
					<div>
						<h2 className="text-xl font-semibold text-foreground mb-4">
							Email Address
						</h2>
					</div>

					{emailError && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
							<p className="text-destructive text-sm">{emailError}</p>
						</div>
					)}

					{emailSuccess && (
						<div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
							<p className="text-green-600 text-sm">{emailSuccess}</p>
						</div>
					)}

					<form onSubmit={handleEmailSubmit} className="space-y-4">
						<div>
							<label
								htmlFor="newEmail"
								className="block text-sm font-medium text-foreground mb-2"
							>
								New Email Address
							</label>
							<input
								id="newEmail"
								type="email"
								value={emailData.newEmail}
								onChange={(e) =>
									setEmailData((prev) => ({
										...prev,
										newEmail: e.target.value,
									}))
								}
								className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
								required
							/>
						</div>

						<div className="flex justify-end">
							<button
								type="submit"
								disabled={isEmailLoading}
								className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isEmailLoading ? "Updating..." : "Update Email"}
							</button>
						</div>
					</form>
				</div>

				{/* Password Settings */}
				<div className="space-y-6">
					<div>
						<h2 className="text-xl font-semibold text-foreground mb-4">
							Password
						</h2>
					</div>

					{passwordError && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
							<p className="text-destructive text-sm">{passwordError}</p>
						</div>
					)}

					{passwordSuccess && (
						<div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
							<p className="text-green-600 text-sm">{passwordSuccess}</p>
						</div>
					)}

					<form onSubmit={handlePasswordSubmit} className="space-y-4">
						<div>
							<label
								htmlFor="currentPassword"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Current Password
							</label>
							<input
								id="currentPassword"
								type="password"
								value={passwordData.currentPassword}
								onChange={(e) =>
									setPasswordData((prev) => ({
										...prev,
										currentPassword: e.target.value,
									}))
								}
								className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
								required
							/>
						</div>

						<div>
							<label
								htmlFor="newPassword"
								className="block text-sm font-medium text-foreground mb-2"
							>
								New Password
							</label>
							<input
								id="newPassword"
								type="password"
								value={passwordData.newPassword}
								onChange={(e) =>
									setPasswordData((prev) => ({
										...prev,
										newPassword: e.target.value,
									}))
								}
								className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
								required
							/>
						</div>

						<div>
							<label
								htmlFor="confirmPassword"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Confirm New Password
							</label>
							<input
								id="confirmPassword"
								type="password"
								value={passwordData.confirmPassword}
								onChange={(e) =>
									setPasswordData((prev) => ({
										...prev,
										confirmPassword: e.target.value,
									}))
								}
								className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
								required
							/>
						</div>

						<div className="flex justify-end">
							<button
								type="submit"
								disabled={isPasswordLoading}
								className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isPasswordLoading ? "Updating..." : "Update Password"}
							</button>
						</div>
					</form>
				</div>

				{/* Danger Zone */}
				<div className="space-y-6">
					<div>
						<h2 className="text-xl font-semibold text-foreground mb-4">
							Danger Zone
						</h2>
					</div>

					<div className="p-6 border border-destructive/20 rounded-lg bg-destructive/5">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-lg font-medium text-foreground">
									Delete Account
								</h3>
								<p className="text-muted-foreground mt-1">
									Permanently delete your account and all associated data. This
									action cannot be undone.
								</p>
							</div>
							<Link
								to="/account/delete"
								className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2"
							>
								Delete Account
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
