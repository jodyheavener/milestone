import type { SupabaseClient } from "~/library/supabase";
import type { Tables, TablesInsert, TablesUpdate } from "@m/shared";
import type { User } from "@supabase/supabase-js";

export type Record = Tables<"record">;
export type RecordInsert = TablesInsert<"record">;
export type RecordUpdate = TablesUpdate<"record">;
export type RecordProject = Tables<"record_project">;
export type FileAttachment = Tables<"file">;
export type WebsiteAttachment = Tables<"website">;

export interface RecordWithProjects extends Record {
	projects?: Array<{
		id: string;
		title: string;
	}>;
	file?: FileAttachment;
	website?: WebsiteAttachment;
}

export interface CreateRecordData {
	content: string;
	projectIds?: string[];
	attachment?: {
		type: "file" | "website";
		file?: File;
		websiteUrl?: string;
	};
}

export interface UpdateRecordData {
	content?: string;
	projectIds?: string[];
}

/**
 * Create a new record
 */
export async function createRecord(
	supabase: SupabaseClient,
	user: User,
	data: CreateRecordData
): Promise<Record> {
	const { data: record, error } = await supabase
		.from("record")
		.insert({
			content: data.content,
			user_id: user.id,
		})
		.select()
		.single();

	if (error) {
		throw error;
	}

	// If project IDs are provided, create the associations
	if (data.projectIds && data.projectIds.length > 0) {
		const recordProjectInserts = data.projectIds.map((projectId) => ({
			record_id: record.id,
			project_id: projectId,
		}));

		const { error: linkError } = await supabase
			.from("record_project")
			.insert(recordProjectInserts);

		if (linkError) {
			throw linkError;
		}
	}

	// Handle attachment if provided
	if (data.attachment) {
		if (data.attachment.type === "file" && data.attachment.file) {
			// Create file attachment record first (with placeholder storage path)
			const fileName = `${record.id}/${data.attachment.file.name}`;
			const { error: fileError } = await supabase.from("file").insert({
				record_id: record.id,
				file_kind: data.attachment.file.type || "unknown",
				file_size: data.attachment.file.size,
				storage_path: fileName,
				extracted_content: "", // Empty as requested
			});

			if (fileError) {
				throw fileError;
			}

			// Then upload file to Supabase Storage
			const { error: uploadError } = await supabase.storage
				.from("attachments")
				.upload(fileName, data.attachment.file);

			if (uploadError) {
				// If upload fails, clean up the database record
				await supabase.from("file").delete().eq("record_id", record.id);
				throw uploadError;
			}
		} else if (
			data.attachment.type === "website" &&
			data.attachment.websiteUrl
		) {
			// Create website attachment record with placeholder data
			const { error: websiteError } = await supabase.from("website").insert({
				record_id: record.id,
				address: data.attachment.websiteUrl,
				page_title: "Foo", // As requested
				extracted_content: "", // Empty as requested
			});

			if (websiteError) {
				throw websiteError;
			}
		}
	}

	return record;
}

/**
 * Get all records for the current user
 */
export async function getRecords(
	supabase: SupabaseClient
): Promise<RecordWithProjects[]> {
	const { data: records, error } = await supabase
		.from("record")
		.select(
			`
			*,
			record_project (
				project_id,
				project:project_id (
					id,
					title
				)
			),
			file (*),
			website (*)
		`
		)
		.order("created_at", {
			ascending: false,
		});

	if (error) {
		throw error;
	}

	// Transform the data to flatten the project information
	return records.map((record) => ({
		...record,
		projects:
			record.record_project?.map((rp) => rp.project).filter(Boolean) || [],
		file: record.file?.[0] || undefined,
		website: record.website?.[0] || undefined,
	}));
}

/**
 * Get records for a specific project
 */
export async function getRecordsForProject(
	supabase: SupabaseClient,
	projectId: string
): Promise<RecordWithProjects[]> {
	// Get records that are either:
	// 1. Linked to this specific project
	// 2. Not linked to any project (available to all projects)
	const { data: records, error } = await supabase
		.from("record")
		.select(
			`
			*,
			record_project!inner (
				project_id,
				project:project_id (
					id,
					title
				)
			)
		`
		)
		.eq("record_project.project_id", projectId)
		.order("created_at", {
			ascending: false,
		});

	if (error) {
		throw error;
	}

	// Also get records that are not linked to any project (available to all)
	const { data: unlinkedRecords, error: unlinkedError } = await supabase
		.from("record")
		.select(
			`
			*,
			record_project (
				project_id,
				project:project_id (
					id,
					title
				)
			)
		`
		)
		.is("record_project", null)
		.order("created_at", {
			ascending: false,
		});

	if (unlinkedError) {
		throw unlinkedError;
	}

	// Combine and transform the data
	const allRecords = [
		...records.map((record) => ({
			...record,
			projects:
				record.record_project?.map((rp) => rp.project).filter(Boolean) || [],
		})),
		...unlinkedRecords.map((record) => ({
			...record,
			projects: [],
		})),
	];

	return allRecords;
}

/**
 * Get a record by ID
 */
export async function getRecord(
	supabase: SupabaseClient,
	id: string
): Promise<RecordWithProjects | null> {
	const { data: record, error } = await supabase
		.from("record")
		.select(
			`
			*,
			record_project (
				project_id,
				project:project_id (
					id,
					title
				)
			),
			file (*),
			website (*)
		`
		)
		.eq("id", id)
		.single();

	if (error) {
		if (error.code === "PGRST116") {
			// Not found
			return null;
		}
		throw error;
	}

	return {
		...record,
		projects:
			record.record_project?.map((rp) => rp.project).filter(Boolean) || [],
		file: record.file?.[0] || undefined,
		website: record.website?.[0] || undefined,
	};
}

/**
 * Update a record
 */
export async function updateRecord(
	supabase: SupabaseClient,
	id: string,
	data: UpdateRecordData
): Promise<RecordWithProjects> {
	// Update the record content if provided
	if (data.content !== undefined) {
		const { error } = await supabase
			.from("record")
			.update({ content: data.content })
			.eq("id", id)
			.select()
			.single();

		if (error) {
			throw error;
		}
	}

	// Update project associations if provided
	if (data.projectIds !== undefined) {
		// First, delete all existing associations
		const { error: deleteError } = await supabase
			.from("record_project")
			.delete()
			.eq("record_id", id);

		if (deleteError) {
			throw deleteError;
		}

		// Then create new associations if project IDs are provided
		if (data.projectIds.length > 0) {
			const recordProjectInserts = data.projectIds.map((projectId) => ({
				record_id: id,
				project_id: projectId,
			}));

			const { error: insertError } = await supabase
				.from("record_project")
				.insert(recordProjectInserts);

			if (insertError) {
				throw insertError;
			}
		}
	}

	// Return the updated record with projects
	return getRecord(supabase, id) as Promise<RecordWithProjects>;
}

/**
 * Delete a record
 */
export async function deleteRecord(
	supabase: SupabaseClient,
	id: string
): Promise<void> {
	const { error } = await supabase.from("record").delete().eq("id", id);

	if (error) {
		throw error;
	}
}
