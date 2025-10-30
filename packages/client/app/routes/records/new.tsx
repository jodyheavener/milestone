import { useState } from "react";
import {
	Link,
	redirect,
	Form,
	useNavigation,
	useSearchParams,
} from "react-router";
import { createPageTitle } from "~/library/utilities";
import { AuthContext } from "~/library/supabase/auth";
import { createRecord } from "~/features/records";
import { getProjects } from "~/features/projects";
import { ProjectSelector } from "~/features/records";
import { cn } from "~/library/utilities";
import { makeBrowserClient } from "~/library/supabase/clients";
import type { Route } from "./+types/new";

export async function loader({ context }: Route.LoaderArgs) {
	const { supabase } = context.get(AuthContext);
	const projects = await getProjects(supabase);
	return { projects };
}

export async function action({ request, context }: Route.ActionArgs) {
	const { supabase, user } = context.get(AuthContext);

	if (!user) {
		return { error: "User not authenticated" };
	}

	const formData = await request.formData();
	const content = formData.get("content");
	const projectIds = formData.getAll("projectIds") as string[];
	const attachmentType = formData.get("attachmentType") as string;
	const attachmentFile = formData.get("attachmentFile") as File | null;
	const attachmentWebsiteUrl = formData.get("attachmentWebsiteUrl") as string;
	const websitePageTitle = formData.get("websitePageTitle") as string;
	const websiteExtractedContent = formData.get(
		"websiteExtractedContent"
	) as string;
	const parsedFileData = formData.get("parsedFileData") as string;
	const fileSize = formData.get("fileSize") as string;
	const fileName = formData.get("fileName") as string;
	const fileType = formData.get("fileType") as string;

	if (!content) {
		return {
			error: "Content is required",
		};
	}

	try {
		const attachmentData = attachmentType
			? {
					type: attachmentType as "file" | "website",
					file: attachmentFile || undefined,
					websiteUrl: attachmentWebsiteUrl || undefined,
					websiteData:
						attachmentType === "website"
							? {
									pageTitle: websitePageTitle,
									extractedContent: websiteExtractedContent,
								}
							: undefined,
					parsedData: parsedFileData ? JSON.parse(parsedFileData) : undefined,
					fileMetadata:
						attachmentType === "file"
							? {
									name: fileName,
									size: fileSize ? parseInt(fileSize) : 0,
									type: fileType,
								}
							: undefined,
				}
			: undefined;

		await createRecord(supabase, user, {
			content: content.toString().trim(),
			projectIds: projectIds.filter(Boolean),
			attachment: attachmentData,
		});

		throw redirect("/records");
	} catch (error) {
		console.error("Error creating record:", error);
		if (error instanceof Response) {
			throw error;
		}

		// Log more details about the error for debugging
		if (error instanceof Error) {
			console.error("Error details:", {
				message: error.message,
				stack: error.stack,
				name: error.name,
			});
		}

		return {
			error: error instanceof Error ? error.message : "Failed to create record",
		};
	}
}

export function meta({}: Route.MetaArgs) {
	return [
		{
			title: createPageTitle("New Record"),
		},
	];
}

export default function Component({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const { projects } = loaderData;
	const supabase = makeBrowserClient();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";
	const [searchParams] = useSearchParams();

	// Initialize with pre-selected project from URL params
	const projectParam = searchParams.get("project");
	const initialProjectIds =
		projectParam && projects.some((p) => p.id === projectParam)
			? [projectParam]
			: [];
	const [selectedProjectIds, setSelectedProjectIds] =
		useState<string[]>(initialProjectIds);

	// New state for record creation method
	const [creationMethod, setCreationMethod] = useState<
		"file" | "website" | "manual" | null
	>(null);
	const [content, setContent] = useState("");
	const [websiteUrl, setWebsiteUrl] = useState("");
	const [scannedWebsite, setScannedWebsite] = useState<{
		url: string;
		pageTitle: string;
		extractedContent: string;
		summary: string;
	} | null>(null);
	const [uploadedFile, setUploadedFile] = useState<{
		file: File;
		storagePath: string;
		parsedData: {
			extractedText: string;
			summary: string;
			parser: string;
			storagePath?: string;
		};
	} | null>(null);
	const [isParsing, setIsParsing] = useState(false);
	const [isScanningWebsite, setIsScanningWebsite] = useState(false);

	const handleFileUpload = async (file: File) => {
		setIsParsing(true);
		try {
			// Get current user
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				throw new Error("User not authenticated");
			}

			// Upload file to storage with user-scoped path
			const fileName = `${Date.now()}-${file.name}`;
			const storagePath = `${user.id}/${fileName}`;

			const { data: uploadData, error: uploadError } = await supabase.storage
				.from("attachments")
				.upload(storagePath, file);

			if (uploadError) {
				throw uploadError;
			}

			// Get session for authorization
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session) {
				throw new Error("No active session");
			}

			// Call parse-file function
			const { data: parseData, error: parseError } =
				await supabase.functions.invoke("parse-file", {
					body: { storagePath: uploadData.path },
					headers: {
						Authorization: `Bearer ${session.access_token}`,
					},
				});

			if (parseError) {
				throw parseError;
			}

			setUploadedFile({
				file,
				storagePath: uploadData.path,
				parsedData: {
					...parseData,
					storagePath: uploadData.path,
				},
			});

			// Set content to the summary
			setContent(parseData.summary);
		} catch (error) {
			console.error("File upload/parsing error:", error);
			alert("Failed to upload and parse file. Please try again.");
		} finally {
			setIsParsing(false);
		}
	};

	const removeUploadedFile = async () => {
		if (uploadedFile) {
			// Delete from storage
			await supabase.storage
				.from("attachments")
				.remove([uploadedFile.storagePath]);

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
			// Get session for authorization
			const {
				data: { session },
			} = await supabase.auth.getSession();
			if (!session) {
				throw new Error("No active session");
			}

			// Call parse-website function
			const { data: scanData, error: scanError } =
				await supabase.functions.invoke("parse-website", {
					body: { url: websiteUrl.trim() },
					headers: {
						Authorization: `Bearer ${session.access_token}`,
					},
				});

			if (scanError) {
				throw scanError;
			}

			setScannedWebsite({
				url: websiteUrl.trim(),
				pageTitle: scanData.pageTitle,
				extractedContent: scanData.extractedContent,
				summary: scanData.summary,
			});

			// Set content to the summary
			setContent(scanData.summary);
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
					<h1 className="text-2xl font-bold">New Record</h1>
					<p className="mt-2 text-muted-foreground">
						Create a new record to track your milestones
					</p>
				</div>

				<Form method="post" encType="multipart/form-data" className="space-y-4">
					{actionData?.error && (
						<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
							{actionData.error}
						</div>
					)}

					{/* Record Creation Method Selection */}
					{!creationMethod && (
						<div className="space-y-3">
							<label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
								How would you like to create this record?
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
										Add a website URL as a reference to your record
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
										Write your record content manually
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
								placeholder="Enter your record content here..."
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
								{isSubmitting ? "Creating..." : "Create Record"}
							</button>
							<Link
								to="/records"
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
