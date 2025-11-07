import { useState } from "react";
import { Form, Link, useNavigation } from "react-router";
import { cn } from "@/lib";
import { makeBrowserClient } from "@/lib/supabase";
import type { Project } from "@/modules/projects/model/types";
import {
	type ParsedFileData,
	removeFile,
	type ScannedWebsiteData,
	scanWebsite,
	uploadAndParseFile,
} from "../api/attachments";
import { ProjectSelector } from "./project-selector";

interface NewContextEntryFormProps {
	projects: Project[];
	initialProjectIds?: string[];
	error?: string;
}

export function NewContextEntryForm({
	projects,
	initialProjectIds = [],
	error,
}: NewContextEntryFormProps) {
	const supabase = makeBrowserClient();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	// Context entry creation method
	const [creationMethod, setCreationMethod] = useState<
		"file" | "website" | "manual" | null
	>(null);
	const [content, setContent] = useState("");
	const [websiteUrl, setWebsiteUrl] = useState("");
	const [scannedWebsite, setScannedWebsite] =
		useState<ScannedWebsiteData | null>(null);
	const [uploadedFile, setUploadedFile] = useState<{
		file: File;
		storagePath: string;
		parsedData: ParsedFileData;
	} | null>(null);
	const [isParsing, setIsParsing] = useState(false);
	const [isScanningWebsite, setIsScanningWebsite] = useState(false);
	const [selectedProjectIds, setSelectedProjectIds] =
		useState<string[]>(initialProjectIds);

	const handleFileUpload = async (file: File) => {
		setIsParsing(true);
		try {
			const result = await uploadAndParseFile(supabase, file);
			setUploadedFile({
				file,
				storagePath: result.storagePath,
				parsedData: result.parsedData,
			});
			setContent(result.parsedData.summary);
		} catch (error) {
			console.error("File upload/parsing error:", error);
			alert("Failed to upload and parse file. Please try again.");
		} finally {
			setIsParsing(false);
		}
	};

	const removeUploadedFile = async () => {
		if (uploadedFile) {
			try {
				await removeFile(supabase, uploadedFile.storagePath);
			} catch (error) {
				console.error("Failed to remove file:", error);
			}
			setUploadedFile(null);
			setContent("");
		}
	};

	const handleWebsiteScan = async () => {
		if (!websiteUrl.trim()) {
			alert("Please enter a website URL");
			return;
		}

		setIsScanningWebsite(true);
		try {
			const scanned = await scanWebsite(supabase, websiteUrl);
			setScannedWebsite(scanned);
			setContent(scanned.summary);
		} catch (error) {
			console.error("Website scanning error:", error);
			alert("Failed to scan website. Please try again.");
		} finally {
			setIsScanningWebsite(false);
		}
	};

	const removeScannedWebsite = () => {
		setScannedWebsite(null);
		setContent("");
	};

	return (
		<div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
			<div className="w-full max-w-2xl p-8 space-y-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold">New Context Entry</h1>
					<p className="mt-2 text-muted-foreground">
						Create a new context entry to track your milestones
					</p>
				</div>

				<Form method="post" encType="multipart/form-data" className="space-y-4">
					{error && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
							{error}
						</div>
					)}

					{/* Context Entry Creation Method Selection */}
					{!creationMethod && (
						<div className="space-y-3">
							<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								How would you like to create this context entry?
							</label>
							<div className="grid grid-cols-1 gap-3">
								<button
									type="button"
									onClick={() => setCreationMethod("file")}
									className={cn(
										"p-4 text-left rounded-lg border border-border bg-card hover:bg-accent transition-colors"
									)}
								>
									<div className="font-medium">📎 Upload File</div>
									<div className="text-sm text-muted-foreground mt-1">
										Upload a PDF, image, or CSV file and we'll extract and
										summarize the content
									</div>
								</button>
								<button
									type="button"
									onClick={() => setCreationMethod("website")}
									className={cn(
										"p-4 text-left rounded-lg border border-border bg-card hover:bg-accent transition-colors"
									)}
								>
									<div className="font-medium">🌐 Website Reference</div>
									<div className="text-sm text-muted-foreground mt-1">
										Add a website URL as a reference to your context entry
									</div>
								</button>
								<button
									type="button"
									onClick={() => setCreationMethod("manual")}
									className={cn(
										"p-4 text-left rounded-lg border border-border bg-card hover:bg-accent transition-colors"
									)}
								>
									<div className="font-medium">✍️ Manual Entry</div>
									<div className="text-sm text-muted-foreground mt-1">
										Write your context entry content manually
									</div>
								</button>
							</div>
						</div>
					)}

					{/* File Upload Section */}
					{creationMethod === "file" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
									File Upload
								</label>
								<button
									type="button"
									onClick={() => setCreationMethod(null)}
									className="text-sm text-muted-foreground hover:text-foreground"
								>
									Change Method
								</button>
							</div>

							{!uploadedFile ? (
								<div className="space-y-2">
									<input
										type="file"
										accept=".pdf,.csv,.jpg,.jpeg,.png,.gif,.webp"
										onChange={(e) => {
											const file = e.target.files?.[0];
											if (file) {
												handleFileUpload(file);
											}
										}}
										disabled={isParsing}
										className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80"
									/>
									{isParsing && (
										<div className="text-sm text-muted-foreground">
											Uploading and parsing file...
										</div>
									)}
								</div>
							) : (
								<div className="p-4 border border-border rounded-lg bg-card">
									<div className="flex items-center justify-between">
										<div>
											<div className="font-medium">
												{uploadedFile.file.name}
											</div>
											<div className="text-sm text-muted-foreground">
												Parsed with {uploadedFile.parsedData.parser}
											</div>
										</div>
										<button
											type="button"
											onClick={removeUploadedFile}
											className="text-sm text-muted-foreground hover:text-foreground"
										>
											Remove
										</button>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Website URL Section */}
					{creationMethod === "website" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
									Website URL
								</label>
								<button
									type="button"
									onClick={() => setCreationMethod(null)}
									className="text-sm text-muted-foreground hover:text-foreground"
								>
									Change Method
								</button>
							</div>

							{!scannedWebsite ? (
								<div className="space-y-2">
									<input
										type="url"
										value={websiteUrl}
										onChange={(e) => setWebsiteUrl(e.target.value)}
										placeholder="https://example.com"
										disabled={isScanningWebsite}
										className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
									/>
									<button
										type="button"
										onClick={handleWebsiteScan}
										disabled={isScanningWebsite || !websiteUrl.trim()}
										className={cn(
											"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
											"h-10 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90"
										)}
									>
										{isScanningWebsite ? "Scanning..." : "Scan Website"}
									</button>
									{isScanningWebsite && (
										<div className="text-sm text-muted-foreground">
											Scanning website content...
										</div>
									)}
								</div>
							) : (
								<div className="p-4 border border-border rounded-lg bg-card">
									<div className="flex items-center justify-between">
										<div>
											<div className="font-medium">
												{scannedWebsite.pageTitle}
											</div>
											<div className="text-sm text-muted-foreground">
												{scannedWebsite.url}
											</div>
										</div>
										<button
											type="button"
											onClick={removeScannedWebsite}
											className="text-sm text-muted-foreground hover:text-foreground"
										>
											Remove
										</button>
									</div>
								</div>
							)}
						</div>
					)}

					{/* Manual Entry Section */}
					{creationMethod === "manual" && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
									Manual Entry
								</label>
								<button
									type="button"
									onClick={() => setCreationMethod(null)}
									className="text-sm text-muted-foreground hover:text-foreground"
								>
									Change Method
								</button>
							</div>
						</div>
					)}

					{/* Content Text Area - Show for all methods */}
					{(creationMethod === "file" && uploadedFile) ||
					(creationMethod === "website" && scannedWebsite) ||
					creationMethod === "manual" ? (
						<div className="space-y-2">
							<label
								htmlFor="content"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								Content
							</label>
							<textarea
								id="content"
								name="content"
								required
								rows={8}
								value={content}
								onChange={(e) => setContent(e.target.value)}
								className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[120px] resize-none"
								placeholder="Enter your context entry content here..."
							/>
						</div>
					) : null}

					<ProjectSelector
						projects={projects}
						selectedProjectIds={selectedProjectIds}
						onSelectionChange={setSelectedProjectIds}
					/>

					{/* Hidden inputs for selected project IDs */}
					{selectedProjectIds.map((projectId) => (
						<input
							key={projectId}
							type="hidden"
							name="projectIds"
							value={projectId}
						/>
					))}

					{/* Hidden inputs for attachment data */}
					{creationMethod && (
						<>
							<input
								type="hidden"
								name="attachmentType"
								value={creationMethod === "manual" ? "" : creationMethod}
							/>
							{creationMethod === "website" && scannedWebsite && (
								<>
									<input
										type="hidden"
										name="attachmentWebsiteUrl"
										value={scannedWebsite.url}
									/>
									<input
										type="hidden"
										name="websitePageTitle"
										value={scannedWebsite.pageTitle}
									/>
									<input
										type="hidden"
										name="websiteExtractedContent"
										value={scannedWebsite.extractedContent}
									/>
								</>
							)}
							{creationMethod === "file" && uploadedFile && (
								<>
									<input
										type="hidden"
										name="attachmentFile"
										value={uploadedFile.file.name}
									/>
									<input
										type="hidden"
										name="parsedFileData"
										value={JSON.stringify(uploadedFile.parsedData)}
									/>
									<input
										type="hidden"
										name="fileSize"
										value={uploadedFile.file.size.toString()}
									/>
									<input
										type="hidden"
										name="fileName"
										value={uploadedFile.file.name}
									/>
									<input
										type="hidden"
										name="fileType"
										value={uploadedFile.file.type}
									/>
								</>
							)}
						</>
					)}

					{/* Submit Button - Show when content is ready */}
					{(creationMethod === "file" && uploadedFile) ||
					(creationMethod === "website" && scannedWebsite) ||
					creationMethod === "manual" ? (
						<div className="flex gap-4">
							<button
								type="submit"
								disabled={isSubmitting || !content.trim()}
								className={cn(
									"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
									"h-10 px-4 py-2 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
								)}
							>
								{isSubmitting ? "Creating..." : "Create Context Entry"}
							</button>
							<Link
								to="/context entrys"
								className={cn(
									"inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
									"h-10 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
								)}
							>
								Cancel
							</Link>
						</div>
					) : null}
				</Form>
			</div>
		</div>
	);
}
