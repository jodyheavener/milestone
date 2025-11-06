import { Menu } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { UserMenu } from "./UserMenu";

interface MobileHeaderProps {
	sidebarOpen: boolean;
	setSidebarOpen: (open: boolean) => void;
}

export function MobileHeader({ setSidebarOpen }: MobileHeaderProps) {
	const { user } = useAuth();

	return (
		<div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-xs sm:px-6 lg:hidden dark:bg-zinc-900 dark:shadow-none dark:after:pointer-events-none dark:after:absolute dark:after:inset-0 dark:after:border-b dark:after:border-white/10 dark:after:bg-black/10">
			<button
				type="button"
				onClick={() => setSidebarOpen(true)}
				className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden dark:text-gray-400 dark:hover:text-white"
			>
				<span className="sr-only">Open sidebar</span>
				<Menu aria-hidden="true" className="size-6" />
			</button>
			<div className="flex-1 text-sm/6 font-semibold text-gray-900 dark:text-white">
				Milestone
			</div>
			{user && (
				<div className="lg:hidden">
					<UserMenu user={user} compact />
				</div>
			)}
		</div>
	);
}
