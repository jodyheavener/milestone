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
		route("pricing", "./routes/pricing.tsx"),

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
		...prefix("tasks", [
			index("./routes/tasks/list.tsx"),
			route("new", "./routes/tasks/new.tsx"),
			route(":id", "./routes/tasks/view.tsx"),
			route(":id/edit", "./routes/tasks/edit.tsx"),
		]),
		...prefix("api/files", [
			route(":id/download", "./routes/api/files/download.tsx"),
		]),
		...prefix("account", [
			index("./routes/account/account.tsx"),
			route("profile", "./routes/account/profile.tsx"),
			route("billing", "./routes/account/billing.tsx"),
			route("delete", "./routes/account/delete.tsx"),
		]),
	]),
];

export default routes;
