import type { SupabaseClient } from "~/library/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@m/shared";

export type Task = Tables<"task">;
export type TaskInsert = TablesInsert<"task">;
export type TaskUpdate = TablesUpdate<"task">;

export interface CreateTaskData {
	description: string;
	projectId: string;
}

export interface UpdateTaskData {
	description?: string;
	completedAt?: Date | null;
}

/**
 * Create a new task
 */
export async function createTask(
	supabase: SupabaseClient,
	data: CreateTaskData
): Promise<Task> {
	const { data: task, error } = await supabase
		.from("task")
		.insert({
			description: data.description,
			project_id: data.projectId,
		})
		.select()
		.single();

	if (error) {
		throw error;
	}

	return task;
}

/**
 * Get all tasks for a specific project
 */
export async function getTasksForProject(
	supabase: SupabaseClient,
	projectId: string
): Promise<Task[]> {
	const { data: tasks, error } = await supabase
		.from("task")
		.select("*")
		.eq("project_id", projectId)
		.order("created_at", {
			ascending: false,
		});

	if (error) {
		throw error;
	}

	return tasks;
}

/**
 * Get a task by ID
 */
export async function getTask(
	supabase: SupabaseClient,
	id: string
): Promise<Task | null> {
	const { data: task, error } = await supabase
		.from("task")
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

	return task;
}

/**
 * Update a task
 */
export async function updateTask(
	supabase: SupabaseClient,
	id: string,
	data: UpdateTaskData
): Promise<Task> {
	const updateData: any = {};

	if (data.description !== undefined) {
		updateData.description = data.description;
	}

	if (data.completedAt !== undefined) {
		updateData.completed_at = data.completedAt;
	}

	const { data: task, error } = await supabase
		.from("task")
		.update(updateData)
		.eq("id", id)
		.select()
		.single();

	if (error) {
		throw error;
	}

	return task;
}

/**
 * Delete a task
 */
export async function deleteTask(
	supabase: SupabaseClient,
	id: string
): Promise<void> {
	const { error } = await supabase.from("task").delete().eq("id", id);

	if (error) {
		throw error;
	}
}

/**
 * Toggle task completion status
 */
export async function toggleTaskCompletion(
	supabase: SupabaseClient,
	id: string,
	isCompleted: boolean
): Promise<Task> {
	const completedAt = isCompleted ? new Date().toISOString() : null;

	return updateTask(supabase, id, { completedAt });
}
