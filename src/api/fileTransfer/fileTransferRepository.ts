import { promises as fs } from "node:fs";
import path from "node:path";
import type { File } from "multer";

export class FileTransferRepository {
	private readonly uploadDir: string;

	constructor(uploadDir = "uploads") {
		this.uploadDir = uploadDir;
	}

	async saveFileAsync(file: File): Promise<{ filename: string; path: string }> {
		// 确保上传目录存在
		await this.ensureUploadDirExists();

		// 生成唯一文件名（时间戳 + 原始文件名）
		const timestamp = Date.now();
		const ext = path.extname(file.originalname);
		const basename = path.basename(file.originalname, ext);
		const filename = `${basename}_${timestamp}${ext}`;
		const filePath = path.join(this.uploadDir, filename);

		// 保存文件
		await fs.writeFile(filePath, file.buffer);

		return { filename, path: filePath };
	}

	private async ensureUploadDirExists(): Promise<void> {
		try {
			await fs.access(this.uploadDir);
		} catch {
			await fs.mkdir(this.uploadDir, { recursive: true });
		}
	}
}
