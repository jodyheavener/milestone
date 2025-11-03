import { useEffect } from "react";
import { href, Link } from "react-router";
import type { ErrorContentProps } from "@/lib/errors";
import { createPageTitle } from "@/lib/page-title";

export function ErrorContent({
	title,
	status,
	message,
	stack,
}: ErrorContentProps) {
	useEffect(() => {
		document.title = createPageTitle(title);
	}, [title, status]);

	return (
		<main className="flex min-h-dvh flex-col p-2 items-center gap-3">
			<header className="flex items-center gap-3 mt-2">
				<p className="flex gap-1 text-lg font-medium opacity-70">{status}</p>
			</header>
			<div className="flex grow flex-col justify-center items-center text-center">
				<h2 className="text-xl font-semibold">{title}</h2>
				<p className="max-w-96 text-secondary">{message}</p>
				{stack ? (
					<pre className="mt-3 max-w-[80vw] max-h-96 bg-zinc-100 p-2 rounded overflow-scroll text-start">
						{stack}
					</pre>
				) : (
					<p className="mt-3">
						<Link
							to={href("/")}
							className="rounded-full inline-block bg-zinc-950 dark:bg-zinc-50 px-3 py-0.5 text-sm/6 font-medium text-white dark:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
						>
							Return Home
						</Link>
					</p>
				)}
			</div>
		</main>
	);
}
