import { FileText, Folder } from "lucide-react";
import { Link, useLocation } from "react-router";
import { cn } from "@/lib";
import { useAuth } from "@/lib/auth";
import { UserMenu } from "./UserMenu";

interface Project {
	id: string;
	title: string;
}

interface SidebarProps {
	projects: Project[];
}

export function Sidebar({ projects }: SidebarProps) {
	const location = useLocation();

	const navigation = [
		{ path: "/projects", label: "Projects", icon: Folder },
		{ path: "/records", label: "Records", icon: FileText },
	];

	const { user } = useAuth();

	return (
		<div className="flex grow flex-col border-r border-gray-200 bg-white dark:border-white/10 dark:bg-zinc-900 dark:ring dark:ring-white/10 dark:before:pointer-events-none dark:before:absolute dark:before:inset-0 dark:before:bg-black/10">
			<div className="flex h-16 shrink-0 items-center px-6">
				<Link
					to="/"
					className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
				>
					Milestone
				</Link>
			</div>
			<nav className="flex flex-1 flex-col gap-y-5 overflow-y-auto px-6 pb-2">
				<ul role="list" className="flex flex-1 flex-col gap-y-7">
					<li>
						<ul role="list" className="-mx-2 space-y-1">
							{navigation.map((item) => {
								const isActive = location.pathname.startsWith(item.path);
								return (
									<li key={item.path}>
										<Link
											to={item.path}
											className={cn(
												isActive
													? "bg-gray-50 text-indigo-600 dark:bg-white/5 dark:text-white"
													: "text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white",
												"group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
											)}
										>
											<item.icon
												aria-hidden="true"
												className={cn(
													isActive
														? "text-indigo-600 dark:text-white"
														: "text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-white",
													"size-6 shrink-0"
												)}
											/>
											{item.label}
										</Link>
									</li>
								);
							})}
						</ul>
					</li>
					<li>
						<div className="text-xs/6 font-semibold text-gray-400">
							Your projects
						</div>
						<ul role="list" className="-mx-2 mt-2 space-y-1">
							{projects.length === 0 ? (
								<li className="px-2 py-1.5 text-sm text-gray-500 dark:text-gray-400">
									No projects yet
								</li>
							) : (
								projects.map((project) => {
									const isActive =
										location.pathname === `/projects/${project.id}` ||
										location.pathname.startsWith(`/projects/${project.id}/`);
									return (
										<li key={project.id}>
											<Link
												to={`/projects/${project.id}`}
												className={cn(
													isActive
														? "bg-gray-50 text-indigo-600 dark:bg-white/5 dark:text-white"
														: "text-gray-700 hover:bg-gray-50 hover:text-indigo-600 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white",
													"group flex gap-x-3 rounded-md p-2 text-sm/6 font-semibold"
												)}
											>
												<span
													className={cn(
														isActive
															? "border-indigo-600 text-indigo-600 dark:border-white/20 dark:text-white"
															: "border-gray-200 text-gray-400 group-hover:border-indigo-600 group-hover:text-indigo-600 dark:border-white/10 dark:group-hover:border-white/20 dark:group-hover:text-white",
														"flex size-6 shrink-0 items-center justify-center rounded-lg border bg-white text-[0.625rem] font-medium dark:bg-white/5"
													)}
												>
													{project.title.charAt(0).toUpperCase()}
												</span>
												<span className="truncate">{project.title}</span>
											</Link>
										</li>
									);
								})
							)}
						</ul>
					</li>
				</ul>
			</nav>
			{user && (
				<div className="hidden shrink-0 border-t border-gray-200 px-6 py-2 lg:block dark:border-white/10">
					<UserMenu user={user} />
				</div>
			)}
		</div>
	);
}
