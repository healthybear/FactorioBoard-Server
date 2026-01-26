import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import multer from "multer";
import { z } from "zod";
import { FileUploadResponseSchema } from "@/api/fileTransfer/fileTransferModel";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { fileTransferController } from "./fileTransferController";

export const fileTransferRegistry = new OpenAPIRegistry();
export const fileTransferRouter: Router = express.Router();

// 配置 multer 内存存储
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 200 * 1024 * 1024, // 200MB
	},
});

// 注册 Schema
fileTransferRegistry.register("FileUploadResponse", FileUploadResponseSchema);

// 注册路由到 OpenAPI
fileTransferRegistry.registerPath({
	method: "post",
	path: "/file-transfer/upload",
	tags: ["File Transfer"],
	request: {
		body: {
			content: {
				"multipart/form-data": {
					schema: z.object({
						file: z.any().describe("压缩包文件 (zip, rar, 7z, gz, tar)"),
					}),
				},
			},
		},
	},
	responses: createApiResponse(FileUploadResponseSchema, "File uploaded successfully"),
});

// 注册路由处理器
fileTransferRouter.post("/upload", upload.single("file"), fileTransferController.uploadFile);
