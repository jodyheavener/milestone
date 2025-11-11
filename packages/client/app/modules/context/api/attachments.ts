import type { SupabaseClient } from "@/lib/supabase";

export interface ParsedFileData {
	title: string;
	parser: string;
	storagePath?: string;
}

export interface ScannedWebsiteData {
	url: string;
	pageTitle: string;
	suggestedTitle: string;
}

/**
 * Upload and parse a file
 */
export async function uploadAndParseFile(
	supabase: SupabaseClient,
	file: File
): Promise<{ storagePath: string; parsedData: ParsedFileData }> {
	// Get current user
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw new Error("User not authenticated");
	}

	// Upload file to storage with user-scoped path
	const fileName = `${Date.now()}-${file.name}`;
	const storagePath = `${user.id}/${fileName}`;

	const { data: uploadData, error: uploadError } = await supabase.storage
		.from("attachments")
		.upload(storagePath, file);

	if (uploadError) {
		throw uploadError;
	}

	// Get session for authorization
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) {
		throw new Error("No active session");
	}

	// Call parse-file function
	const { data: parseData, error: parseError } =
		await supabase.functions.invoke("parse-file", {
			body: { storagePath: uploadData.path },
			headers: {
				Authorization: `Bearer ${session.access_token}`,
			},
		});

	if (parseError) {
		throw parseError;
	}

	return {
		storagePath: uploadData.path,
		parsedData: {
			...parseData,
			storagePath: uploadData.path,
		},
	};
}

/**
 * Remove an uploaded file from storage
 */
export async function removeFile(
	supabase: SupabaseClient,
	storagePath: string
): Promise<void> {
	const { error } = await supabase.storage
		.from("attachments")
		.remove([storagePath]);

	if (error) {
		throw error;
	}
}

/**
 * Scan and parse a website
 */
export async function scanWebsite(
	supabase: SupabaseClient,
	url: string
): Promise<ScannedWebsiteData> {
	// Get session for authorization
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) {
		throw new Error("No active session");
	}

	// Call parse-website function
	const { data: scanData, error: scanError } = await supabase.functions.invoke(
		"parse-website",
		{
			body: { url: url.trim() },
			headers: {
				Authorization: `Bearer ${session.access_token}`,
			},
		}
	);

	if (scanError) {
		throw scanError;
	}

	return {
		url: url.trim(),
		pageTitle: scanData.pageTitle,
		suggestedTitle: scanData.suggestedTitle || scanData.pageTitle,
	};
}
