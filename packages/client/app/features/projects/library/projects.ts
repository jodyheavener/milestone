import type { SupabaseClient } from "~/library/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@m/shared";
import type { User } from "@supabase/supabase-js";

export type Project = Tables<"project">;
export type ProjectInsert = TablesInsert<"project">;
export type ProjectUpdate = TablesUpdate<"project">;

/**
 * Create a new project
 */
export async function createProject(
	supabase: SupabaseClient,
	user: User,
	data: { title: string; goal: string }
): Promise<Project> {
	const { data: project, error } = await supabase
		.from("project")
		.insert({
			title: data.title,
			goal: data.goal,
			user_id: user.id,
		})
		.select()
		.single();

	if (error) {
		throw error;
	}

	return project;
}

/**
 * Get all projects for the current user
 */
export async function getProjects(
	supabase: SupabaseClient
): Promise<Project[]> {
	const { data: projects, error } = await supabase
		.from("project")
		.select("*")
		.order("created_at", {
			ascending: false,
		});

	if (error) {
		throw error;
	}

	return projects;
}

/**
 * Get a project by ID
 */
export async function getProject(
	supabase: SupabaseClient,
	id: string
): Promise<Project | null> {
	const { data: project, error } = await supabase
		.from("project")
		.select("*")
		.eq("id", id)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// Not found
			return null;
		}
		throw error;
	}

	return project;
}

/**
 * Update a project
 */
export async function updateProject(
	supabase: SupabaseClient,
	id: string,
	data: { title?: string; goal?: string }
): Promise<Project> {
	const { data: project, error } = await supabase
		.from("project")
		.update(data)
		.eq("id", id)
		.select()
		.single();

	if (error) {
		throw error;
	}

	return project;
}

/**
 * Delete a project
 */
export async function deleteProject(
	supabase: SupabaseClient,
	id: string
): Promise<void> {
	const { error } = await supabase.from("project").delete().eq("id", id);

	if (error) {
		throw error;
	}
}
