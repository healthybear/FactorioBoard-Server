import { StatusCodes } from "http-status-codes";
import type { Express } from "express";

import type { GameSaveAnalysisResponse, GameSaveUploadResponse } from "@/api/gameSave/gameSaveModel";
import { GameSaveRepository } from "@/api/gameSave/gameSaveRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { analyzeFactorioSave, parseFactorioSave } from "@/gameParser/save.service";
import { logger } from "@/server";

export class GameSaveService {
	private gameSaveRepository: GameSaveRepository;

	constructor(repository: GameSaveRepository = new GameSaveRepository()) {
		this.gameSaveRepository = repository;
	}

	async uploadFile(file: Express.Multer.File): Promise<ServiceResponse<GameSaveUploadResponse | null>> {
		try {
			// 验证文件类型（只允许压缩包）
			const allowedMimeTypes = [
				"application/zip",
				"application/x-zip-compressed",
				"application/x-rar-compressed",
				"application/x-rar",
				"application/x-7z-compressed",
				"application/gzip",
				"application/x-gzip",
				"application/x-tar",
			];

			if (!allowedMimeTypes.includes(file.mimetype)) {
				return ServiceResponse.failure(
					"Invalid file type. Only compressed files (zip, rar, 7z, gz, tar) are allowed.",
					null,
					StatusCodes.BAD_REQUEST,
				);
			}

			// 验证文件大小（最大 200MB）
			const maxSize = 200 * 1024 * 1024; // 200MB
			if (file.size > maxSize) {
				return ServiceResponse.failure("File size exceeds the maximum limit of 100MB.", null, StatusCodes.BAD_REQUEST);
			}

			// 保存文件
			const { filename, path: filePath, originalName } = await this.gameSaveRepository.saveFileAsync(file);

			const gameSaveUploadResponse: GameSaveUploadResponse = {
				filename,
				originalName,
				mimetype: file.mimetype,
				size: file.size,
				path: filePath,
				uploadTime: new Date(),
			};

			return ServiceResponse.success<GameSaveUploadResponse>("File uploaded successfully", gameSaveUploadResponse);
		} catch (ex) {
			const errorMessage = `Error uploading file: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure(
				"An error occurred while uploading the file.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}

	async analyzeGameSave(filename: string): Promise<ServiceResponse<GameSaveAnalysisResponse | null>> {
		logger.info({ filename }, "[game-save analyze] 3. Service 开始处理");
		try {
			// 查找文件
			const filePath = await this.gameSaveRepository.findFileByFilename(filename);
			logger.info({ filename, filePath: filePath ?? null }, "[game-save analyze] 3.1 查找文件结果");
			if (!filePath) {
				logger.warn({ filename }, "[game-save analyze] 文件未找到，返回 404");
				return ServiceResponse.failure(
					`Game save file "${filename}" not found.`,
					null,
					StatusCodes.NOT_FOUND,
				);
			}

			// 解析存档
			let saveData;
			try {
				logger.info({ filePath }, "[game-save analyze] 3.2 开始解析存档");
				saveData = await parseFactorioSave(filePath);
				logger.info("[game-save analyze] 3.3 解析存档完成");
			} catch (parseError) {
				const errorMessage = parseError instanceof Error ? parseError.message : "Unknown parse error";
				logger.error(`Failed to parse game save: ${errorMessage}`);
				return ServiceResponse.failure(
					`Failed to parse game save file: ${errorMessage}`,
					null,
					StatusCodes.BAD_REQUEST,
				);
			}

			// 全维度分析
			let analysisResult;
			try {
				logger.info("[game-save analyze] 3.4 开始全维度分析");
				analysisResult = await analyzeFactorioSave(saveData);
				logger.info("[game-save analyze] 3.5 分析完成，准备返回 200");
			} catch (analysisError) {
				const errorMessage = analysisError instanceof Error ? analysisError.message : "Unknown analysis error";
				logger.error(`Failed to analyze game save: ${errorMessage}`);
				return ServiceResponse.failure(
					`Failed to analyze game save: ${errorMessage}`,
					null,
					StatusCodes.INTERNAL_SERVER_ERROR,
				);
			}

			return ServiceResponse.success<GameSaveAnalysisResponse>(
				"Game save analyzed successfully",
				analysisResult,
			);
		} catch (ex) {
			const errorMessage = `Error analyzing game save: ${(ex as Error).message}`;
			logger.error(errorMessage);
			return ServiceResponse.failure(
				"An error occurred while analyzing the game save.",
				null,
				StatusCodes.INTERNAL_SERVER_ERROR,
			);
		}
	}
}

export const gameSaveService = new GameSaveService();
