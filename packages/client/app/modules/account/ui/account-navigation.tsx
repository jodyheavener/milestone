import { Link } from "react-router";

interface AccountNavigationProps {
	activeTab: "account" | "profile" | "billing";
}

export function AccountNavigation({ activeTab }: AccountNavigationProps) {
	return (
		<div className="mt-4 flex space-x-4">
			{activeTab === "account" ? (
				<span className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md">
					Account
				</span>
			) : (
				<Link
					to="/account"
					className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					Account
				</Link>
			)}
			{activeTab === "profile" ? (
				<span className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md">
					Profile
				</span>
			) : (
				<Link
					to="/account/profile"
					className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					Profile
				</Link>
			)}
			{activeTab === "billing" ? (
				<span className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md">
					Billing
				</span>
			) : (
				<Link
					to="/account/billing"
					className="px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
				>
					Billing
				</Link>
			)}
		</div>
	);
}
