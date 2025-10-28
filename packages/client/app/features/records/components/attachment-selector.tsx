import { useState } from "react";
import { cn } from "~/library/utilities";

interface AttachmentSelectorProps {
	onAttachmentChange: (
		attachment: {
			type: "file" | "website";
			file?: File;
			websiteUrl?: string;
		} | null
	) => void;
}

export function AttachmentSelector({
	onAttachmentChange,
}: AttachmentSelectorProps) {
	const [attachmentType, setAttachmentType] = useState<
		"file" | "website" | null
	>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [websiteUrl, setWebsiteUrl] = useState("");

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			// Validate file type
			const validTypes = [
				"application/pdf",
				"text/csv",
				"image/jpeg",
				"image/jpg",
				"image/png",
				"image/gif",
				"image/webp",
			];

			if (!validTypes.includes(file.type)) {
				alert("Please select a valid file type (PDF, CSV, or image)");
				return;
			}

			setSelectedFile(file);
			onAttachmentChange({
				type: "file",
				file,
			});
		}
	};

	const handleWebsiteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const url = event.target.value;
		setWebsiteUrl(url);
		onAttachmentChange({
			type: "website",
			websiteUrl: url,
		});
	};

	const removeAttachment = () => {
		setAttachmentType(null);
		setSelectedFile(null);
		setWebsiteUrl("");
		onAttachmentChange(null);
	};

	const formatFileSize = (bytes: number) => {
		if (bytes === 0) return "0 Bytes";
		const k = 1024;
		const sizes = ["Bytes", "KB", "MB", "GB"];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
	};

	return (
		<div className="space-y-3">
			<div>
				<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
					Attachment (Optional)
				</label>
				<p className="text-xs text-muted-foreground mt-1">
					Add a file or website reference to your record
				</p>
			</div>

			{!attachmentType ? (
				<div className="space-y-2">
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => setAttachmentType("file")}
							className={cn(
								"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
								"h-9 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
							)}
						>
							+ Add File
						</button>
						<button
							type="button"
							onClick={() => setAttachmentType("website")}
							className={cn(
								"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
								"h-9 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
							)}
						>
							+ Add Website
						</button>
					</div>
				</div>
			) : (
				<div className="space-y-3 p-4 border border-border rounded-lg bg-card">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">
							{attachmentType === "file"
								? "File Attachment"
								: "Website Attachment"}
						</span>
						<button
							type="button"
							onClick={removeAttachment}
							className="text-sm text-muted-foreground hover:text-foreground"
						>
							Remove
						</button>
					</div>

					{attachmentType === "file" ? (
						<div className="space-y-2">
							<input
								type="file"
								name="attachmentFile"
								accept=".pdf,.csv,.jpg,.jpeg,.png,.gif,.webp"
								onChange={handleFileChange}
								className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"
							/>
							{selectedFile && (
								<div className="text-xs text-muted-foreground">
									{selectedFile.name} ({formatFileSize(selectedFile.size)})
								</div>
							)}
						</div>
					) : (
						<div className="space-y-2">
							<input
								type="url"
								name="attachmentWebsiteUrl"
								placeholder="https://example.com"
								value={websiteUrl}
								onChange={handleWebsiteChange}
								className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
