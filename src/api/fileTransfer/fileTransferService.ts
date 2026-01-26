import { StatusCodes } from "http-status-codes";
import type { File } from "multer";

import type { FileUploadResponse } from "@/api/fileTransfer/fileTransferModel";
import { FileTransferRepository } from "@/api/fileTransfer/fileTransferRepository";
import { ServiceResponse } from "@/common/models/serviceResponse";
import { logger } from "@/server";

export class FileTransferService {
	private fileTransferRepository: FileTransferRepository;

	constructor(repository: FileTransferRepository = new FileTransferRepository()) {
		this.fileTransferRepository = repository;
	}

	async uploadFile(file: File): Promise<ServiceResponse<FileUploadResponse | null>> {
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

			// 验证文件大小（最大 100MB）
			const maxSize = 100 * 1024 * 1024; // 100MB
			if (file.size > maxSize) {
				return ServiceResponse.failure("File size exceeds the maximum limit of 100MB.", null, StatusCodes.BAD_REQUEST);
			}

			// 保存文件
			const { filename, path: filePath } = await this.fileTransferRepository.saveFileAsync(file);

			const fileUploadResponse: FileUploadResponse = {
				filename,
				originalName: file.originalname,
				mimetype: file.mimetype,
				size: file.size,
				path: filePath,
				uploadedAt: new Date(),
			};

			return ServiceResponse.success<FileUploadResponse>("File uploaded successfully", fileUploadResponse);
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
}

export const fileTransferService = new FileTransferService();
