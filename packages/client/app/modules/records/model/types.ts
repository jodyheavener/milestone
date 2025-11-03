import type { Tables, TablesInsert, TablesUpdate } from "@milestone/shared";

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

export interface UpdateRecordData {
	content?: string;
	projectIds?: string[];
}
