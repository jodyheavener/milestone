import { useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { useForm } from "~/library/hooks";
import { useAuth } from "~/features/authentication";
import { cn } from "~/library/utilities";

type RegisterFormData = {
	name: string;
	email: string;
	password: string;
	confirmPassword: string;
};

export function RegisterForm() {
	const { signUpStandard } = useAuth();
	const navigate = useNavigate();
	const { isLoading, errorMessage, makeSubmitHandler, setFieldError } =
		useForm<RegisterFormData>();

	const handleSubmit = useCallback(
		async (data: RegisterFormData) => {
			setFieldError("name", "");
			setFieldError("email", "");
			setFieldError("password", "");
			setFieldError("confirmPassword", "");

			if (!data.name) {
				setFieldError("name", "Name is required");
				return;
			}

			if (!data.email) {
				setFieldError("email", "Email is required");
				return;
			}

			if (!data.password) {
				setFieldError("password", "Password is required");
				return;
			}

			if (data.password.length < 6) {
				setFieldError("password", "Password must be at least 6 characters");
				return;
			}

			if (data.password !== data.confirmPassword) {
				setFieldError("confirmPassword", "Passwords do not match");
				return;
			}

			await signUpStandard(data.name, data.email, data.password);
			// After registration, redirect to login or show success message
			navigate("/login");
		},
		[signUpStandard, navigate, setFieldError]
	);

	return (
		<div className="flex items-center justify-center min-h-dvh">
			<div className="w-full max-w-md p-8 space-y-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold">Create Account</h1>
					<p className="mt-2 text-muted-foreground">
						Enter your information to create an account
					</p>
				</div>

				<form onSubmit={makeSubmitHandler(handleSubmit)} className="space-y-4">
					{errorMessage && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
							{errorMessage}
						</div>
					)}

					<div className="space-y-2">
						<label
							htmlFor="name"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Name
						</label>
						<input
							id="name"
							name="name"
							type="text"
							autoComplete="name"
							required
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
					</div>

					<div className="space-y-2">
						<label
							htmlFor="email"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Email
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autoComplete="email"
							required
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
					</div>

					<div className="space-y-2">
						<label
							htmlFor="password"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Password
						</label>
						<input
							id="password"
							name="password"
							type="password"
							autoComplete="new-password"
							required
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
					</div>

					<div className="space-y-2">
						<label
							htmlFor="confirmPassword"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Confirm Password
						</label>
						<input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							autoComplete="new-password"
							required
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						/>
					</div>

					<button
						type="submit"
						disabled={isLoading}
						className={cn(
							"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
							"h-10 px-4 py-2 w-full bg-primary text-primary-foreground hover:bg-primary/90"
						)}
					>
						{isLoading ? "Creating account..." : "Create Account"}
					</button>
				</form>

				<div className="text-center text-sm">
					<span className="text-muted-foreground">
						Already have an account?{" "}
					</span>
					<Link to="/login" className="text-primary hover:underline">
						Login
					</Link>
				</div>
			</div>
		</div>
	);
}
