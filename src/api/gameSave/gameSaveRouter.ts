import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import express, { type Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
	AnalyzeGameSaveSchema,
	GameSaveAnalysisResponseSchema,
	GameSaveUploadResponseSchema,
} from "@/api/gameSave/gameSaveModel";
import { createApiResponse } from "@/api-docs/openAPIResponseBuilders";
import { validateRequest } from "@/common/utils/httpHandlers";
import { logger } from "@/server";
import { gameSaveController } from "./gameSaveController";

export const gameSaveRegistry = new OpenAPIRegistry();
export const gameSaveRouter: Router = express.Router();

// 配置 multer 内存存储
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 200 * 1024 * 1024, // 200MB
	},
});

// 注册 Schema
gameSaveRegistry.register("GameSaveUploadResponse", GameSaveUploadResponseSchema);
gameSaveRegistry.register("GameSaveAnalysisResponse", GameSaveAnalysisResponseSchema);

// 注册路由到 OpenAPI
gameSaveRegistry.registerPath({
	method: "post",
	path: "/game-save/upload",
	tags: ["Game Save"],
	request: {
		body: {
			content: {
				"multipart/form-data": {
					schema: z.object({
						file: z.any().describe("游戏存档压缩包文件 (zip, rar, 7z, gz, tar)"),
					}),
				},
			},
		},
	},
	responses: createApiResponse(GameSaveUploadResponseSchema, "Game save file uploaded successfully"),
});

// 注册路由到 OpenAPI - 分析存档
gameSaveRegistry.registerPath({
	method: "post",
	path: "/game-save/analyze/{filename}",
	tags: ["Game Save"],
	request: { params: AnalyzeGameSaveSchema.shape.params },
	responses: createApiResponse(GameSaveAnalysisResponseSchema, "Game save analyzed successfully"),
});

// 禁止分析接口被缓存，避免返回 304 Not Modified
const noCache = (req: express.Request, res: express.Response, next: express.NextFunction) => {
	logger.info({ filename: req.params.filename }, "[game-save analyze] 1. 进入路由，设置 no-cache 头");
	res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
	res.set("Pragma", "no-cache");
	res.set("Expires", "0");
	next();
};

// 注册路由处理器
gameSaveRouter.post("/upload", upload.single("file"), gameSaveController.uploadFile);
gameSaveRouter.post(
	"/analyze/:filename",
	noCache,
	validateRequest(AnalyzeGameSaveSchema),
	gameSaveController.analyzeGameSave,
);
