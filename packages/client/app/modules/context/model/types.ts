import type { Tables, TablesInsert, TablesUpdate } from "@milestone/shared";

export type ContextEntry = Tables<"context_entry">;
export type ContextEntryInsert = TablesInsert<"context_entry">;
export type ContextEntryUpdate = TablesUpdate<"context_entry">;
export type ContextEntryProject = Tables<"context_entry_project">;
export type FileAttachment = Tables<"file">;
export type WebsiteAttachment = Tables<"website">;

export interface ContextEntryWithProjects extends ContextEntry {
	projects?: Array<{
		id: string;
		title: string;
	}>;
	file?: FileAttachment;
	website?: WebsiteAttachment;
}

export interface CreateContextEntryData {
	content: string;
	projectIds?: string[];
	attachment?: {
		type: "file" | "website";
		file?: File;
		websiteUrl?: string;
		websiteData?: {
			pageTitle: string;
			extractedContent: string;
		};
		parsedData?: {
			extractedText: string;
			summary: string;
			parser: string;
			storagePath?: string;
		};
		fileMetadata?: {
			name: string;
			size: number;
			type: string;
		};
	};
}

export interface UpdateContextEntryData {
	content?: string;
	projectIds?: string[];
}
