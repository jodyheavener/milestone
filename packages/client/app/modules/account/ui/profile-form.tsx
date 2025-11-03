import type { ProfileFormData } from "../lib/validation";

interface ProfileFormProps {
	data: ProfileFormData;
	onChange: (data: ProfileFormData) => void;
	onSubmit: (e: React.FormEvent) => void;
	isLoading: boolean;
	error: string | null;
	success: string | null;
}

export function ProfileForm({
	data,
	onChange,
	onSubmit,
	isLoading,
	error,
	success,
}: ProfileFormProps) {
	return (
		<>
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

			<form onSubmit={onSubmit} className="space-y-8">
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
							value={data.name}
							onChange={(e) =>
								onChange({
									...data,
									name: e.target.value,
								})
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
							value={data.job_title}
							onChange={(e) =>
								onChange({
									...data,
									job_title: e.target.value,
								})
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
							value={data.employer_name}
							onChange={(e) =>
								onChange({
									...data,
									employer_name: e.target.value,
								})
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
							value={data.employer_description}
							onChange={(e) =>
								onChange({
									...data,
									employer_description: e.target.value,
								})
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
							value={data.employer_website}
							onChange={(e) =>
								onChange({
									...data,
									employer_website: e.target.value,
								})
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
		</>
	);
}
