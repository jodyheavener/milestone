import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import type { Tables } from "@milestone/shared";
import type { User as AuthUser } from "@supabase/supabase-js";
import {
	ChevronsUpDown,
	Cog,
	LogOut,
	Monitor,
	Moon,
	ReceiptText,
	Sun,
	User,
} from "lucide-react";
import { useCallback } from "react";
import { Link } from "react-router";
import { cn } from "@/lib";
import { useAuth } from "@/lib/auth";
import { availableThemes, type ThemeMode, useTheme } from "@/ui/ThemeProvider";

type ProfileUser = AuthUser & Tables<"profile">;

interface UserMenuProps {
	user: ProfileUser;
	compact?: boolean;
}

export function UserMenu({ user, compact = false }: UserMenuProps) {
	const { signOut, isLoading } = useAuth();
	const { themeMode, setThemeMode } = useTheme();

	const handleSignOut = useCallback(async () => {
		await signOut();
		window.location.href = "/";
	}, [signOut]);

	const handleThemeChange = useCallback(
		(newTheme: ThemeMode) => {
			setThemeMode(newTheme);
		},
		[setThemeMode]
	);

	return (
		<Menu as="div" className="relative">
			<MenuButton
				className={cn(
					"flex items-center gap-x-4 text-sm/6 font-semibold text-gray-900 hover:bg-gray-50 dark:text-white dark:hover:bg-white/5",
					compact ? "px-2 py-2" : "w-full px-6 py-3"
				)}
			>
				<div className="flex size-8 items-center justify-center rounded-full bg-gray-50 outline -outline-offset-1 outline-black/5 dark:bg-gray-800 dark:outline-white/10">
					<span className="text-xs font-medium text-gray-600 dark:text-gray-300">
						{user.name?.charAt(0).toUpperCase() || "U"}
					</span>
				</div>
				{!compact && (
					<>
						<span className="flex-1 truncate text-left">
							{user.name || "User"}
						</span>
						<ChevronsUpDown
							aria-hidden="true"
							className="size-4 text-gray-400"
						/>
					</>
				)}
			</MenuButton>
			<MenuItems
				anchor={compact ? "bottom end" : "top end"}
				transition
				className="z-50 w-56 rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-gray-800 dark:ring-white/10 data-closed:opacity-0 data-closed:scale-95 data-open:opacity-100 data-open:scale-100"
			>
				<div className="py-1">
					<MenuItem>
						{({ focus }) => (
							<Link
								to="/account"
								className={cn(
									focus
										? "bg-gray-100 dark:bg-white/10"
										: "text-gray-900 dark:text-gray-100",
									"flex items-center gap-x-3 px-4 py-2 text-sm"
								)}
							>
								<Cog className="size-4 text-gray-400" />
								Account
							</Link>
						)}
					</MenuItem>
					<MenuItem>
						{({ focus }) => (
							<Link
								to="/account/profile"
								className={cn(
									focus
										? "bg-gray-100 dark:bg-white/10"
										: "text-gray-900 dark:text-gray-100",
									"flex items-center gap-x-3 px-4 py-2 text-sm"
								)}
							>
								<User className="size-4 text-gray-400" />
								Profile
							</Link>
						)}
					</MenuItem>
					<MenuItem>
						{({ focus }) => (
							<Link
								to="/account/subscription"
								className={cn(
									focus
										? "bg-gray-100 dark:bg-white/10"
										: "text-gray-900 dark:text-gray-100",
									"flex items-center gap-x-3 px-4 py-2 text-sm"
								)}
							>
								<ReceiptText className="size-4 text-gray-400" />
								Subscription
							</Link>
						)}
					</MenuItem>
					<div className="border-t border-gray-200 dark:border-white/10" />
					<div className="px-4 py-2">
						<div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
							Theme
						</div>
						<div className="flex gap-1">
							{(Object.keys(availableThemes) as ThemeMode[]).map((theme) => {
								const Icon = {
									system: Monitor,
									light: Sun,
									dark: Moon,
								}[theme];
								const isSelected = themeMode === theme;
								return (
									<MenuItem key={theme}>
										{({ focus }) => (
											<button
												onClick={() => handleThemeChange(theme)}
												className={cn(
													focus
														? "bg-gray-100 dark:bg-white/10"
														: "text-gray-900 dark:text-gray-100",
													isSelected &&
														"bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400",
													"flex flex-1 items-center justify-center gap-x-2 rounded-md px-3 py-2 text-sm"
												)}
												title={availableThemes[theme]}
											>
												<Icon
													className={cn(
														"size-4",
														isSelected
															? "text-indigo-600 dark:text-indigo-400"
															: "text-gray-400"
													)}
												/>
												<span className="sr-only">
													{availableThemes[theme]}
												</span>
											</button>
										)}
									</MenuItem>
								);
							})}
						</div>
					</div>
					<div className="border-t border-gray-200 dark:border-white/10" />
					<MenuItem>
						{({ focus }) => (
							<button
								onClick={handleSignOut}
								disabled={isLoading}
								className={cn(
									focus
										? "bg-gray-100 dark:bg-white/10"
										: "text-gray-900 dark:text-gray-100",
									"flex w-full items-center gap-x-3 px-4 py-2 text-sm disabled:opacity-50"
								)}
							>
								<LogOut className="size-4 text-gray-400" />
								{isLoading ? "Signing out..." : "Sign Out"}
							</button>
						)}
					</MenuItem>
				</div>
			</MenuItems>
		</Menu>
	);
}
