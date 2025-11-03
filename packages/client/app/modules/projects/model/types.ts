import type { Tables, TablesInsert, TablesUpdate } from "@milestone/shared";

export type Project = Tables<"project">;
export type ProjectInsert = TablesInsert<"project">;
export type ProjectUpdate = TablesUpdate<"project">;

export interface CreateProjectData {
	title: string;
	goal: string;
}

export interface UpdateProjectData {
	title?: string;
	goal?: string;
}
