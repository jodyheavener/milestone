// import { createPath, href, Outlet, redirect } from "react-router";
// import type { Route } from "./+types/authenticated";
// import { makeServerClient } from "~/library/supabase";

// export async function loader({ request }: Route.LoaderArgs) {
// 	const supabase = makeServerClient(request);
// 	const {
// 		data: { session },
// 		error,
// 	} = await supabase.auth.getSession();

// 	if (!session || error) {
// 		const url = new URL(request.url);
// 		const redirectTo = url.pathname + url.search;
// 		throw redirect(
// 			createPath({
// 				pathname: href("/"),
// 				search: `redirect=${encodeURIComponent(redirectTo)}`,
// 			})
// 		);
// 	}
// }

// export default function LayoutAuthenticated() {
// 	return <Outlet />;
// }
