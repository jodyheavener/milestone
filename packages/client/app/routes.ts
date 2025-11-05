import {
	index,
	layout,
	prefix,
	route,
	type RouteConfig,
} from "@react-router/dev/routes";

const routes: RouteConfig = [
	layout("./layouts/application.tsx", [
		index("./modules/home/routes/home.tsx"),
		route("pricing", "./modules/pricing/routes/pricing.tsx"),

		layout("./layouts/unauthenticated.tsx", [
			route("login", "./modules/auth/routes/login.tsx"),
			route("register", "./modules/auth/routes/register.tsx"),
		]),
	]),

	layout("./layouts/authenticated.tsx", [
		...prefix("projects", [
			index("./modules/projects/routes/list.tsx"),
			route("new", "./modules/projects/routes/new.tsx"),
			route(":id", "./modules/projects/routes/view.tsx"),
			route(":id/edit", "./modules/projects/routes/edit.tsx"),

			...prefix(":projectId/conversations", [
				route("new", "./modules/conversations/routes/new.tsx"),
				route(":conversationId", "./modules/conversations/routes/view.tsx"),
			]),
		]),

		...prefix("records", [
			index("./modules/records/routes/list.tsx"),
			route("new", "./modules/records/routes/new.tsx"),
			route(":id", "./modules/records/routes/view.tsx"),
			route(":id/edit", "./modules/records/routes/edit.tsx"),
		]),

		...prefix("tasks", [
			index("./modules/tasks/routes/list.tsx"),
			route("new", "./modules/tasks/routes/new.tsx"),
			route(":id", "./modules/tasks/routes/view.tsx"),
			route(":id/edit", "./modules/tasks/routes/edit.tsx"),
		]),

		...prefix("account", [
			index("./modules/account/routes/account.tsx"),
			route("profile", "./modules/account/routes/profile.tsx"),
			route("billing", "./modules/account/routes/billing.tsx"),
			route("delete", "./modules/account/routes/delete.tsx"),
		]),
	]),
];

export default routes;
