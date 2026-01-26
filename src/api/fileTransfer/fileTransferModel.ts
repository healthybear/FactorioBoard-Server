import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export const FileUploadResponseSchema = z.object({
	filename: z.string(),
	originalName: z.string(),
	mimetype: z.string(),
	size: z.number(),
	path: z.string(),
	uploadedAt: z.date(),
});
