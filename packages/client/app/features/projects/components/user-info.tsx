import React, { useCallback } from "react";
import { useAuth } from "~/features/authentication";
import { cn } from "~/library/utilities";

export function UserInfo() {
	const { user, signOut } = useAuth();
	const [isSigningOut, setIsSigningOut] = React.useState(false);

	const handleSignOut = useCallback(async () => {
		setIsSigningOut(true);
		try {
			await signOut();
			window.location.href = "/";
		} catch (error) {
			console.error("Error signing out:", error);
			setIsSigningOut(false);
		}
	}, [signOut]);

	if (!user) {
		return null;
	}

	return (
		<div className="flex items-center gap-4">
			<div className="flex flex-col">
				<span className="text-sm font-medium">{user.email}</span>
			</div>
			<button
				onClick={handleSignOut}
				disabled={isSigningOut}
				className={cn(
					"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
					"h-9 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
				)}
			>
				{isSigningOut ? "Signing out..." : "Sign Out"}
			</button>
		</div>
	);
}
