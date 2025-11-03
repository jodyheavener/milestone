import { Navigation } from "./Navigation";
import { UserInfo } from "./UserInfo";

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
