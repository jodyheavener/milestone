import { Navigation } from "./navigation";
import { UserInfo } from "./user-info";

export function HeaderAuthenticated() {
	return (
		<div className="border-b border-border bg-background">
			<div className="max-w-6xl mx-auto px-8">
				<div className="flex items-center justify-between h-16">
					<Navigation />
					<UserInfo />
				</div>
			</div>
		</div>
	);
}
