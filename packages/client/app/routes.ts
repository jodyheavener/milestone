import {
	index,
	layout,
	route,
	type RouteConfig,
} from "@react-router/dev/routes";

const routes: RouteConfig = [
	layout("./layouts/application.tsx", [
		index("./routes/home.tsx"),
		route("login", "./routes/authentication/login.tsx"),
		route("register", "./routes/authentication/register.tsx"),
	]),

	layout("./layouts/authenticated.tsx", [
		route("projects", "./routes/projects.tsx"),
	]),
];

export default routes;
