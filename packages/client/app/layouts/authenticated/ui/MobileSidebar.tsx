import {
	Dialog,
	DialogBackdrop,
	DialogPanel,
	TransitionChild,
} from "@headlessui/react";
import { X } from "lucide-react";
import { Sidebar } from "./Sidebar";

interface MobileSidebarProps {
	sidebarOpen: boolean;
	setSidebarOpen: (open: boolean) => void;
	projects: Array<{ id: string; title: string }>;
}

export function MobileSidebar({
	sidebarOpen,
	setSidebarOpen,
	projects,
}: MobileSidebarProps) {
	return (
		<Dialog
			open={sidebarOpen}
			onClose={setSidebarOpen}
			className="relative z-50 lg:hidden"
		>
			<DialogBackdrop
				transition
				className="fixed inset-0 bg-gray-900/80 transition-opacity duration-300 ease-linear data-closed:opacity-0"
			/>

			<div className="fixed inset-0 flex">
				<DialogPanel
					transition
					className="relative mr-16 flex w-full max-w-xs flex-1 transform transition duration-300 ease-in-out data-closed:-translate-x-full"
				>
					<TransitionChild>
						<div className="absolute top-0 left-full flex w-16 justify-center pt-5 duration-300 ease-in-out data-closed:opacity-0">
							<button
								type="button"
								onClick={() => setSidebarOpen(false)}
								className="-m-2.5 p-2.5"
							>
								<span className="sr-only">Close sidebar</span>
								<X aria-hidden="true" className="size-6 text-white" />
							</button>
						</div>
					</TransitionChild>

					<Sidebar projects={projects} />
				</DialogPanel>
			</div>
		</Dialog>
	);
}
