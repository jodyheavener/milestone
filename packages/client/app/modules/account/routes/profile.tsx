import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { updateProfileWithBrowser } from "../api/profile";
import { type ProfileFormData, validateProfileForm } from "../lib/validation";
import type { UpdateProfileData } from "../model/types";
import { ProfileForm } from "../ui/profile-form";

export default function ProfileRoute() {
	const { user } = useAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [formData, setFormData] = useState<ProfileFormData>({
		name: user?.name || "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);

		if (!user) return;

		const validationErrors = validateProfileForm(formData);
		if (validationErrors.length > 0) {
			setError(validationErrors.join(", "));
			return;
		}

		setIsLoading(true);

		try {
			const updateData: UpdateProfileData = {
				name: formData.name,
			};
			await updateProfileWithBrowser(user.id, updateData);
			setSuccess("Profile updated successfully!");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to update profile");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="max-w-2xl mx-auto p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground">Profile</h1>
				<p className="text-muted-foreground mt-2">
					Manage your personal information.
				</p>
			</div>

			<ProfileForm
				data={formData}
				onChange={setFormData}
				onSubmit={handleSubmit}
				isLoading={isLoading}
				error={error}
				success={success}
			/>
		</div>
	);
}
