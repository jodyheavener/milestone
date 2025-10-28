import {
	index,
	layout,
	prefix,
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
		...prefix("projects", [
			index("./routes/projects/list.tsx"),
			route("new", "./routes/projects/new.tsx"),
			route(":id", "./routes/projects/view.tsx"),
			route(":id/edit", "./routes/projects/edit.tsx"),
		]),
		...prefix("records", [
			index("./routes/records/list.tsx"),
			route("new", "./routes/records/new.tsx"),
			route(":id", "./routes/records/view.tsx"),
			route(":id/edit", "./routes/records/edit.tsx"),
		]),
	]),
];

export default routes;
