import {
	index,
	layout,
	route,
	type RouteConfig,
} from "@react-router/dev/routes";

const routes: RouteConfig = [
	layout("./layouts/application.tsx", [
		index("./routes/home.tsx"),

		layout("./layouts/unauthenticated.tsx", [
			route("login", "./routes/authentication/login.tsx"),
			route("register", "./routes/authentication/register.tsx"),
		]),
	]),

	layout("./layouts/authenticated.tsx", [
		route("projects", "./routes/projects/list.tsx"),
		route("projects/new", "./routes/projects/new.tsx"),
		route("projects/:id", "./routes/projects/view.tsx"),
	]),
];

export default routes;
