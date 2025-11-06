import type { SupabaseClient } from "@/lib/supabase";
import { getProjects } from "@/modules/projects/api/projects";

/**
 * Get projects for sidebar display (limited to 10)
 */
export async function getProjectsForSidebar(
	supabase: SupabaseClient
): Promise<Array<{ id: string; title: string }>> {
	const projects = await getProjects(supabase);
	return projects.slice(0, 10).map((project) => ({
		id: project.id,
		title: project.title,
	}));
}
