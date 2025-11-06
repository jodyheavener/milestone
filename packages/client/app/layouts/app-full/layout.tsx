import { useState } from "react";
import { Outlet } from "react-router";
import { AuthContext } from "@/lib/supabase";
import type { Route } from "./+types/layout";
import { getProjectsForSidebar } from "./lib/projects";
import { MobileHeader } from "./ui/MobileHeader";
import { MobileSidebar } from "./ui/MobileSidebar";
import { Sidebar } from "./ui/Sidebar";

export async function loader({ context }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const projects = await getProjectsForSidebar(supabase);
	return { projects };
}

export default function Layout({ loaderData }: Route.ComponentProps) {
	const { projects } = loaderData;
	const [sidebarOpen, setSidebarOpen] = useState(false);

	return (
		<div className="min-h-dvh bg-background">
			<MobileSidebar
				sidebarOpen={sidebarOpen}
				setSidebarOpen={setSidebarOpen}
				projects={projects}
			/>

			<div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
				<Sidebar projects={projects} />
			</div>

			<MobileHeader sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

			<main className="py-10 lg:pl-72">
				<div className="px-4 sm:px-6 lg:px-8">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
