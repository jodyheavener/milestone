import { index, layout, type RouteConfig } from "@react-router/dev/routes";

const routes: RouteConfig = [
	layout("./layouts/application.tsx", [index("./routes/home.tsx")]),

	// layout("./layouts/authenticated.tsx", []),
];

export default routes;
