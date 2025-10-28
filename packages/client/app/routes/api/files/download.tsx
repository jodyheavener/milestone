import { AuthContext } from "~/library/supabase/auth";
import type { Route } from "./+types/download";

export async function loader({ context, params }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);

	// Get the file record to verify it exists and user has access
	const { data: file, error } = await supabase
		.from("file")
		.select(
			`
			*,
			record!inner (
				user_id
			)
		`
		)
		.eq("id", params.id)
		.single();

	if (error || !file) {
		throw new Response("File not found", { status: 404 });
	}

	// Download the actual file from Supabase Storage
	const { data: fileData, error: downloadError } = await supabase.storage
		.from("attachments")
		.download(file.storage_path);

	if (downloadError || !fileData) {
		throw new Response("File download failed", { status: 500 });
	}

	// Convert blob to array buffer for proper handling
	const arrayBuffer = await fileData.arrayBuffer();

	// Determine content type based on file kind
	const contentType = file.file_kind || "application/octet-stream";

	// Extract filename from storage path
	const filename = file.storage_path.split("/").pop() || "download";

	return new Response(arrayBuffer, {
		headers: {
			"Content-Type": contentType,
			"Content-Disposition": `attachment; filename="${filename}"`,
			"Content-Length": arrayBuffer.byteLength.toString(),
		},
	});
}
