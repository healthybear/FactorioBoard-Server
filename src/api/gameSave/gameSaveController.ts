import type { Request, RequestHandler, Response } from "express";

import { gameSaveService } from "@/api/gameSave/gameSaveService";
import { logger } from "@/server";

class GameSaveController {
	public uploadFile: RequestHandler = async (req: Request, res: Response) => {
		const file = req.file;
		if (!file) {
			return res.status(400).send({
				success: false,
				message: "No file uploaded",
				responseObject: null,
				statusCode: 400,
			});
		}

		const serviceResponse = await gameSaveService.uploadFile(file);
		res.status(serviceResponse.statusCode).send(serviceResponse);
	};

	public analyzeGameSave: RequestHandler = async (req: Request, res: Response) => {
		const { filename } = req.params;
		logger.info({ filename }, "[game-save analyze] 2. 进入 Controller，调用 Service");
		const serviceResponse = await gameSaveService.analyzeGameSave(filename);
		logger.info(
			{ filename, statusCode: serviceResponse.statusCode, success: serviceResponse.success },
			"[game-save analyze] 5. Controller 准备返回响应",
		);
		res.status(serviceResponse.statusCode).send(serviceResponse);
		logger.info({ filename, statusCode: serviceResponse.statusCode }, "[game-save analyze] 6. res.send 已调用");
	};
}

export const gameSaveController = new GameSaveController();
