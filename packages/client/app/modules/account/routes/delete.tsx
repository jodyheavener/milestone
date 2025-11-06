import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { deleteAccount } from "../api/deletion";
import { validateDeletionForm } from "../lib/validation";
import type { AccountDeletionData } from "../model/types";
import { DeleteAccountForm } from "../ui/delete-account-form";

export default function DeleteAccountRoute() {
	const { signOut } = useAuth();
	const [error, setError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	const [formData, setFormData] = useState<AccountDeletionData>({
		confirmationText: "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		const validationErrors = validateDeletionForm(formData);
		if (validationErrors.length > 0) {
			setError(validationErrors.join(", "));
			return;
		}

		setIsLoading(true);

		try {
			await deleteAccount();
			await signOut();
			window.location.href = "/";
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete account");
			setIsLoading(false);
		}
	};

	return (
		<div className="max-w-2xl mx-auto p-6">
			<div className="mb-8">
				<h1 className="text-3xl font-bold text-foreground">Delete Account</h1>
				<p className="text-muted-foreground mt-2">
					Permanently delete your account and all associated data.
				</p>
			</div>

			<DeleteAccountForm
				data={formData}
				onChange={setFormData}
				onSubmit={handleSubmit}
				isLoading={isLoading}
				error={error}
			/>
		</div>
	);
}
