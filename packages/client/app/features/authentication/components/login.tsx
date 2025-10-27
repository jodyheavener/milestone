import { useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useForm } from "~/library/hooks";
import { useAuth } from "~/features/authentication";
import { cn } from "~/library/utilities";

type LoginFormData = {
	email: string;
	password: string;
};

export function LoginForm() {
	const { signInStandard } = useAuth();
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { isLoading, errorMessage, makeSubmitHandler, setFieldError } =
		useForm<LoginFormData>();

	const handleSubmit = useCallback(
		async (data: LoginFormData) => {
			setFieldError("email", "");
			setFieldError("password", "");

			if (!data.email) {
				setFieldError("email", "Email is required");
				return;
			}

			if (!data.password) {
				setFieldError("password", "Password is required");
				return;
			}

			await signInStandard(data.email, data.password);

			// Check for redirect parameter
			const redirectTo = searchParams.get("redirect");
			navigate(redirectTo ? decodeURIComponent(redirectTo) : "/projects");
		},
		[signInStandard, navigate, searchParams, setFieldError]
	);

	return (
		<div className="flex items-center justify-center min-h-dvh">
			<div className="w-full max-w-md p-8 space-y-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold">Sign In</h1>
					<p className="mt-2 text-muted-foreground">
						Enter your credentials to access your account
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
							autoComplete="current-password"
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
						{isLoading ? "Signing in..." : "Sign In"}
					</button>
				</form>

				<div className="text-center text-sm">
					<span className="text-muted-foreground">Don't have an account? </span>
					<Link to="/register" className="text-primary hover:underline">
						Register
					</Link>
				</div>
			</div>
		</div>
	);
}
