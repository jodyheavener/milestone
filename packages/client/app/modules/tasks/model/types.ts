import type { Tables, TablesInsert, TablesUpdate } from "@milestone/shared";

export type Task = Tables<"task">;
export type TaskInsert = TablesInsert<"task">;
export type TaskUpdate = TablesUpdate<"task">;

export interface CreateTaskData {
	description: string;
	projectId: string;
}

export interface UpdateTaskData {
	description?: string;
	completedAt?: string | null;
}
