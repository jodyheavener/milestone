import { Link, useLocation } from "react-router";
import { cn } from "~/library/utilities";

export function Navigation() {
	const location = useLocation();

	const navItems = [
		{ path: "/projects", label: "Projects" },
		{ path: "/records", label: "Records" },
		{ path: "/account", label: "Account" },
	];

	return (
		<nav className="flex items-center space-x-8">
			<Link
				to="/"
				className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
			>
				Milestone
			</Link>
			<div className="flex items-center space-x-1">
				{navItems.map((item) => (
					<Link
						key={item.path}
						to={item.path}
						className={cn(
							"px-3 py-2 rounded-md text-sm font-medium transition-colors",
							location.pathname.startsWith(item.path)
								? "bg-primary text-primary-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-accent"
						)}
					>
						{item.label}
					</Link>
				))}
			</div>
		</nav>
	);
}
