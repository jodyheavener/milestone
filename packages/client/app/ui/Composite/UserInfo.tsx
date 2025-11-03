import { useCallback } from "react";
import { Link } from "react-router";
import { cn } from "@/lib";
import { useAuth } from "@/lib/auth";

export function UserInfo() {
	const { user, signOut, isLoading } = useAuth();

	const handleSignOut = useCallback(async () => {
		await signOut();
		window.location.href = "/";
	}, [signOut]);

	if (!user) {
		return null;
	}

	return (
		<div className="flex items-center gap-4">
			<div className="flex flex-col">
				<Link className="text-sm font-medium" to="/account/profile">
					{user.name}
				</Link>
			</div>
			<button
				onClick={handleSignOut}
				disabled={isLoading}
				className={cn(
					"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
					"h-9 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
				)}
			>
				{isLoading ? "One moment..." : "Sign Out"}
			</button>
		</div>
	);
}
