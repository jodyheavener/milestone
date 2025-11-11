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
			title: data.title || null,
			content: data.content || null,
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
			data.attachment.parsedData?.storagePath
		) {
			// Link existing file record to context entry
			const storagePath = data.attachment.parsedData?.storagePath;
			if (!storagePath) {
				throw new Error("Storage path is required for file attachments");
			}
			// First check if file exists and get its current state
			// Retry a few times in case of timing issues (file might be updating)
			let existingFile = null;
			for (let attempt = 0; attempt < 3; attempt++) {
				const { data, error } = await supabase
					.from("file")
					.select("id, context_entry_id")
					.eq("storage_path", storagePath)
					.maybeSingle();

				if (error) {
					console.error("Error looking up file:", error);
					break;
				}

				if (data) {
					existingFile = data;
					break;
				}

				// Wait a bit before retrying (only if not found)
				if (attempt < 2) {
					await new Promise((resolve) => setTimeout(resolve, 200));
				}
			}

			if (!existingFile) {
				console.warn(
					"File not found for storage path after retries:",
					storagePath
				);
				// Continue without linking - file might not exist yet or storage_path mismatch
			} else {
				// Update file.context_entry_id to point to this context entry
				// Note: This means the file will visually appear in the latest context entry
				// but records ensure the file is accessible from all context entries
				const { error: fileError } = await supabase
					.from("file")
					.update({ context_entry_id: contextEntry.id })
					.eq("id", existingFile.id);

				if (fileError) {
					console.error("Error updating file context_entry_id:", fileError);
					// Continue - we'll still create the record
				}

				// Always create a new record for this context entry
				// This allows the same file to be linked to multiple context entries
				// Each context entry gets its own record
				const { data: existingRecord } = await supabase
					.from("record")
					.select("id")
					.eq("file_id", existingFile.id)
					.eq("context_entry_id", contextEntry.id)
					.maybeSingle();

				if (!existingRecord) {
					// Get any existing record's content to reuse it (from any context entry or unlinked)
					const { data: originalRecord } = await supabase
						.from("record")
						.select("content, model_name, prompt_hash")
						.eq("file_id", existingFile.id)
						.order("created_at", { ascending: false })
						.limit(1)
						.maybeSingle();

					// Create new record linking this file to this context entry
					const { error: recordInsertError } = await supabase
						.from("record")
						.insert({
							user_id: user.id,
							file_id: existingFile.id,
							context_entry_id: contextEntry.id,
							content: originalRecord?.content || {
								tldr: "",
								key_takeaways: [],
							},
							projects: data.projectIds || [],
							model_name: originalRecord?.model_name || "gpt-4o-mini",
							prompt_hash: originalRecord?.prompt_hash || "\\x00",
							tokens_in: 0,
							tokens_out: 0,
						});

					if (recordInsertError) {
						console.error("Error creating record:", recordInsertError);
						// Don't throw - continue even if record creation fails
					} else {
						console.log("Successfully linked file to context entry", {
							fileId: existingFile.id,
							contextEntryId: contextEntry.id,
						});
					}
				} else {
					// Update existing record with new project associations
					await supabase
						.from("record")
						.update({
							projects: data.projectIds || [],
						})
						.eq("id", existingRecord.id);
				}
			}
		} else if (
			data.attachment.type === "website" &&
			data.attachment.websiteUrl
		) {
			// Link existing website record to context entry
			const { data: website, error: websiteError } = await supabase
				.from("website")
				.update({ context_entry_id: contextEntry.id })
				.eq("address", data.attachment.websiteUrl)
				.select("id")
				.maybeSingle();

			if (websiteError) {
				throw websiteError;
			}

			// Update record to link to context entry and projects
			if (website?.id) {
				await supabase
					.from("record")
					.update({
						context_entry_id: contextEntry.id,
						projects: data.projectIds || [],
					})
					.eq("website_id", website.id)
					.is("context_entry_id", null); // Only update if not already linked
			} else {
				console.warn("Website not found for URL:", data.attachment.websiteUrl);
			}
		}
	}

	// For manual entries, generate summary server-side
	if (!data.attachment && data.content) {
		// Call edge function to generate summary for manual entry
		const {
			data: { session },
		} = await supabase.auth.getSession();
		if (session) {
			try {
				await supabase.functions.invoke("generate-context-summary", {
					body: {
						contextEntryId: contextEntry.id,
						title: data.title || "",
						content: data.content,
						projectIds: data.projectIds || [],
					},
					headers: {
						Authorization: `Bearer ${session.access_token}`,
					},
				});
			} catch (error) {
				// Don't fail if summary generation fails
				console.error("Failed to generate summary for manual entry:", error);
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
	// Update the context entry title and/or content if provided
	const updateData: { title?: string | null; content?: string | null } = {};
	if (data.title !== undefined) {
		updateData.title = data.title || null;
	}
	if (data.content !== undefined) {
		updateData.content = data.content || null;
	}

	if (Object.keys(updateData).length > 0) {
		const { error } = await supabase
			.from("context_entry")
			.update(updateData)
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
