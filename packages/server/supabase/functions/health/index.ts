import "@supabase/functions-js";
import { ServiceError } from "@m/shared";
import { appEnv, pingKey, serveFunction } from "~/library";

serveFunction({ methods: ["GET"] }, ({ request, respond }) => {
	const pingKeyHeader = request.headers.get("X-Ping-Key");
	if (!pingKeyHeader || pingKeyHeader !== pingKey) {
		throw new ServiceError("UNAUTHORIZED");
	}

	return respond({
		status: "healthy",
		timestamp: new Date().toISOString(),
		environment: appEnv,
	});
});
