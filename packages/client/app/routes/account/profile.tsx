import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "~/features/authentication";
import {
	updateProfile,
	validateProfileForm,
	type ProfileFormData,
} from "~/features/account-profile";

export default function ProfileRoute() {
	const { user } = useAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [formData, setFormData] = useState<ProfileFormData>(() => ({
		name: user?.name || "",
		job_title: user?.job_title || "",
		employer_name: user?.employer_name || "",
		employer_description: user?.employer_description || "",
		employer_website: user?.employer_website || "",
	}));

	// Update form data when user changes
	useEffect(() => {
		if (user) {
			setFormData({
				name: user.name || "",
				job_title: user.job_title || "",
				employer_name: user.employer_name || "",
				employer_description: user.employer_description || "",
				employer_website: user.employer_website || "",
			});
		}
	}, [user]);

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
			await updateProfile(user.id, formData);
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
					Manage your personal information and job details.
				</p>
				<div className="mt-4 flex space-x-4">
					<Link
						to="/account"
						className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
					>
						Account
					</Link>
					<span className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md">
						Profile
					</span>
				</div>
			</div>

			{error && (
				<div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
					<p className="text-destructive text-sm">{error}</p>
				</div>
			)}

			{success && (
				<div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
					<p className="text-green-600 text-sm">{success}</p>
				</div>
			)}

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* General Information Section */}
				<div className="space-y-6">
					<div>
						<h2 className="text-xl font-semibold text-foreground mb-4">
							General Information
						</h2>
					</div>

					<div>
						<label
							htmlFor="name"
							className="block text-sm font-medium text-foreground mb-2"
						>
							Name *
						</label>
						<input
							id="name"
							type="text"
							value={formData.name}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, name: e.target.value }))
							}
							className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
							required
						/>
					</div>
				</div>

				{/* Job Information Section */}
				<div className="space-y-6">
					<div>
						<h2 className="text-xl font-semibold text-foreground mb-4">
							Job Information
						</h2>
					</div>

					<div>
						<label
							htmlFor="job_title"
							className="block text-sm font-medium text-foreground mb-2"
						>
							Job Title
						</label>
						<input
							id="job_title"
							type="text"
							value={formData.job_title}
							onChange={(e) =>
								setFormData((prev) => ({ ...prev, job_title: e.target.value }))
							}
							className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
						/>
					</div>

					<div>
						<label
							htmlFor="employer_name"
							className="block text-sm font-medium text-foreground mb-2"
						>
							Employer Name
						</label>
						<input
							id="employer_name"
							type="text"
							value={formData.employer_name}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									employer_name: e.target.value,
								}))
							}
							className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
						/>
					</div>

					<div>
						<label
							htmlFor="employer_description"
							className="block text-sm font-medium text-foreground mb-2"
						>
							Employer Description
						</label>
						<textarea
							id="employer_description"
							value={formData.employer_description}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									employer_description: e.target.value,
								}))
							}
							rows={3}
							className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-none"
						/>
					</div>

					<div>
						<label
							htmlFor="employer_website"
							className="block text-sm font-medium text-foreground mb-2"
						>
							Employer Website
						</label>
						<input
							id="employer_website"
							type="url"
							value={formData.employer_website}
							onChange={(e) =>
								setFormData((prev) => ({
									...prev,
									employer_website: e.target.value,
								}))
							}
							placeholder="https://example.com"
							className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
						/>
					</div>
				</div>

				<div className="flex justify-end">
					<button
						type="submit"
						disabled={isLoading}
						className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? "Saving..." : "Save Changes"}
					</button>
				</div>
			</form>
		</div>
	);
}
