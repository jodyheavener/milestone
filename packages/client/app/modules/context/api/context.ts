import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@/lib/supabase";
import type {
	ContextEntry,
	ContextEntryWithProjects,
	CreateContextEntryData,
	UpdateContextEntryData,
} from "../model/types";

/**
 * Create a new context entry
 */
export async function createContextEntry(
	supabase: SupabaseClient,
	user: User,
	data: CreateContextEntryData
): Promise<ContextEntry> {
	const { data: contextEntry, error } = await supabase
		.from("context_entry")
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
		const contextEntryProjectInserts = data.projectIds.map((projectId) => ({
			context_entry_id: contextEntry.id,
			project_id: projectId,
		}));

		const { error: linkError } = await supabase
			.from("context_entry_project")
			.insert(contextEntryProjectInserts);

		if (linkError) {
			throw linkError;
		}
	}

	// Handle attachment if provided
	if (data.attachment) {
		if (
			data.attachment.type === "file" &&
			(data.attachment.file || data.attachment.fileMetadata)
		) {
			// Get the storage path from parsed data (file was already uploaded)
			const fileName =
				data.attachment.fileMetadata?.name ||
				data.attachment.file?.name ||
				"unknown";
			const storagePath =
				data.attachment.parsedData?.storagePath ||
				`${contextEntry.id}/${fileName}`;

			// Create file attachment context entry with parsed data
			const { error: fileError } = await supabase.from("file").insert({
				context_entry_id: contextEntry.id,
				mime_type:
					data.attachment.fileMetadata?.type ||
					data.attachment.file?.type ||
					"unknown",
				file_size:
					data.attachment.fileMetadata?.size || data.attachment.file?.size || 0,
				storage_path: storagePath,
				parser: data.attachment.parsedData?.parser || null,
				extracted_text: data.attachment.parsedData?.extractedText || null,
			});

			if (fileError) {
				throw fileError;
			}

			// If file wasn't uploaded yet, upload it now
			if (!data.attachment.parsedData?.storagePath && data.attachment.file) {
				const { error: uploadError } = await supabase.storage
					.from("attachments")
					.upload(storagePath, data.attachment.file);

				if (uploadError) {
					// If upload fails, clean up the database context entry
					await supabase
						.from("file")
						.delete()
						.eq("context_entry_id", contextEntry.id);
					throw uploadError;
				}
			}
		} else if (
			data.attachment.type === "website" &&
			data.attachment.websiteUrl
		) {
			// Create website attachment context entry with scanned data
			const { error: websiteError } = await supabase.from("website").insert({
				context_entry_id: contextEntry.id,
				address: data.attachment.websiteUrl,
				page_title: data.attachment.websiteData?.pageTitle || "Untitled",
				extracted_content: data.attachment.websiteData?.extractedContent || "",
			});

			if (websiteError) {
				throw websiteError;
			}
		}
	}

	return contextEntry;
}

/**
 * Get all context entries for the current user
 */
export async function getContextEntries(
	supabase: SupabaseClient
): Promise<ContextEntryWithProjects[]> {
	const { data: contextEntries, error } = await supabase
		.from("context_entry")
		.select(
			`
			*,
			context_entry_project (
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
	return contextEntries.map((contextEntry) => ({
		...contextEntry,
		projects:
			contextEntry.context_entry_project
				?.map((cep) => cep.project)
				.filter(Boolean) || [],
		file: contextEntry.file?.[0] || undefined,
		website: contextEntry.website?.[0] || undefined,
	}));
}

/**
 * Get context entries for a specific project
 */
export async function getContextEntriesForProject(
	supabase: SupabaseClient,
	projectId: string
): Promise<ContextEntryWithProjects[]> {
	// Get context entries that are either:
	// 1. Linked to this specific project
	// 2. Not linked to any project (available to all projects)
	const { data: contextEntries, error } = await supabase
		.from("context_entry")
		.select(
			`
			*,
			context_entry_project!inner (
				project_id,
				project:project_id (
					id,
					title
				)
			)
		`
		)
		.eq("context_entry_project.project_id", projectId)
		.order("created_at", {
			ascending: false,
		});

	if (error) {
		throw error;
	}

	// Also get context entries that are not linked to any project (available to all)
	const { data: unlinkedContextEntries, error: unlinkedError } = await supabase
		.from("context_entry")
		.select(
			`
			*,
			context_entry_project (
				project_id,
				project:project_id (
					id,
					title
				)
			)
		`
		)
		.is("context_entry_project", null)
		.order("created_at", {
			ascending: false,
		});

	if (unlinkedError) {
		throw unlinkedError;
	}

	// Combine and transform the data
	const allContextEntries = [
		...contextEntries.map((contextEntry) => ({
			...contextEntry,
			projects:
				contextEntry.context_entry_project
					?.map((cep) => cep.project)
					.filter(Boolean) || [],
		})),
		...unlinkedContextEntries.map((contextEntry) => ({
			...contextEntry,
			projects: [],
		})),
	];

	return allContextEntries;
}

/**
 * Get a context entry by ID
 */
export async function getContextEntry(
	supabase: SupabaseClient,
	id: string
): Promise<ContextEntryWithProjects | null> {
	const { data: contextEntry, error } = await supabase
		.from("context_entry")
		.select(
			`
			*,
			context_entry_project (
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
		...contextEntry,
		projects:
			contextEntry.context_entry_project
				?.map((cep) => cep.project)
				.filter(Boolean) || [],
		file: contextEntry.file?.[0] || undefined,
		website: contextEntry.website?.[0] || undefined,
	};
}

/**
 * Update a context entry
 */
export async function updateContextEntry(
	supabase: SupabaseClient,
	id: string,
	data: UpdateContextEntryData
): Promise<ContextEntryWithProjects> {
	// Update the context entry content if provided
	if (data.content !== undefined) {
		const { error } = await supabase
			.from("context_entry")
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
			.from("context_entry_project")
			.delete()
			.eq("context_entry_id", id);

		if (deleteError) {
			throw deleteError;
		}

		// Then create new associations if project IDs are provided
		if (data.projectIds.length > 0) {
			const contextEntryProjectInserts = data.projectIds.map((projectId) => ({
				context_entry_id: id,
				project_id: projectId,
			}));

			const { error: insertError } = await supabase
				.from("context_entry_project")
				.insert(contextEntryProjectInserts);

			if (insertError) {
				throw insertError;
			}
		}
	}

	// Return the updated context entry with projects
	return getContextEntry(supabase, id) as Promise<ContextEntryWithProjects>;
}

/**
 * Delete a context entry
 */
export async function deleteContextEntry(
	supabase: SupabaseClient,
	id: string
): Promise<void> {
	const { error } = await supabase.from("context_entry").delete().eq("id", id);

	if (error) {
		throw error;
	}
}
