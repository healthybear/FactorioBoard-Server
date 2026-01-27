import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Express } from "express";

export class GameSaveRepository {
	private readonly uploadDir: string;

	constructor(uploadDir = "game-saves") {
		this.uploadDir = uploadDir;
	}

	async saveFileAsync(file: Express.Multer.File): Promise<{ filename: string; path: string; originalName: string }> {
		// 确保上传目录存在
		await this.ensureUploadDirExists();

		// 尝试正确解码原始文件名（处理可能的编码问题）
		let originalName = this.decodeFileName(file.originalname);

		// 使用 UUID 生成安全的文件名（避免编码问题）
		const ext = path.extname(originalName) || ".zip";
		const safeFilename = `${randomUUID()}${ext}`;
		const filePath = path.join(this.uploadDir, safeFilename);

		// 保存文件
		await fs.writeFile(filePath, file.buffer);

		return { filename: safeFilename, path: filePath, originalName };
	}

	/**
	 * 解码文件名，处理各种编码问题
	 * 常见问题：
	 * 1. URL 编码的文件名（%E6%95%99%E5%AD%A6...）
	 * 2. ISO-8859-1 被误读为 UTF-8（æå¦è¿åº¦）
	 * 3. 双重编码问题
	 */
	private decodeFileName(fileName: string): string {
		if (!fileName) {
			return "unnamed";
		}

		// 尝试 1: URL 解码（如果包含 % 符号）
		if (fileName.includes("%")) {
			try {
				const decoded = decodeURIComponent(fileName);
				// 如果解码后是有效的 UTF-8，使用解码后的值
				if (this.isValidUTF8(decoded)) {
					return decoded;
				}
			} catch {
				// URL 解码失败，继续尝试其他方法
			}
		}

		// 尝试 2: 检查是否是 ISO-8859-1 被误读为 UTF-8
		// 这种情况通常表现为：中文字符显示为类似 "æå¦è¿åº¦" 的乱码
		if (!this.isValidUTF8(fileName)) {
			try {
				// 将字符串视为 latin1 编码，然后转换为 UTF-8
				const buffer = Buffer.from(fileName, "latin1");
				const decoded = buffer.toString("utf8");
				// 检查解码后的字符串是否包含中文字符（基本范围）
				if (this.containsChinese(decoded)) {
					return decoded;
				}
			} catch {
				// 解码失败，继续
			}
		}

		// 尝试 3: 如果文件名看起来已经是乱码，尝试修复常见的编码问题
		// 检查是否包含典型的乱码模式
		if (this.looksLikeGarbled(fileName)) {
			try {
				// 尝试从 latin1 重新编码
				const buffer = Buffer.from(fileName, "latin1");
				return buffer.toString("utf8");
			} catch {
				// 如果都失败，返回原始值
			}
		}

		// 如果所有尝试都失败，返回原始文件名
		return fileName;
	}

	/**
	 * 检查字符串是否为有效的 UTF-8 编码
	 */
	private isValidUTF8(str: string): boolean {
		try {
			// 尝试将字符串编码为 UTF-8，如果成功则说明是有效的 UTF-8
			return Buffer.from(str, "utf8").toString("utf8") === str;
		} catch {
			return false;
		}
	}

	/**
	 * 检查字符串是否包含中文字符
	 */
	private containsChinese(str: string): boolean {
		// 中文字符的 Unicode 范围：\u4e00-\u9fff
		return /[\u4e00-\u9fff]/.test(str);
	}

	/**
	 * 检查字符串是否看起来像乱码
	 * 乱码通常包含很多非 ASCII 字符但不符合常见语言模式
	 */
	private looksLikeGarbled(str: string): boolean {
		// 如果包含很多类似 "æå¦è¿åº¦" 这样的字符组合，可能是乱码
		// 这些是 ISO-8859-1 编码的中文字符被误读为 UTF-8 的结果
		const garbledPattern = /[æåèéêëìíîïðñòóôõöøùúûüýþÿ]/;
		return garbledPattern.test(str) && !this.containsChinese(str);
	}

	/**
	 * 若当前存储目录内文件数超过 maxCount，则按修改时间删除最早的文件，保留最多 maxCount 个
	 * @param maxCount 允许保留的最大文件数
	 */
	async pruneOldFilesIfExceed(maxCount: number): Promise<void> {
		await this.ensureUploadDirExists();
		const entries = await fs.readdir(this.uploadDir, { withFileTypes: true });
		const files = entries.filter((e) => e.isFile()).map((e) => ({ name: e.name, path: path.join(this.uploadDir, e.name) }));
		if (files.length <= maxCount) return;
		const withStat = await Promise.all(
			files.map(async (f) => {
				const stat = await fs.stat(f.path);
				return { ...f, mtimeMs: stat.mtimeMs };
			}),
		);
		withStat.sort((a, b) => a.mtimeMs - b.mtimeMs);
		const toRemove = withStat.slice(0, withStat.length - maxCount);
		for (const f of toRemove) {
			try {
				await fs.unlink(f.path);
			} catch (err) {
				// 记录但继续删除其余
				console.error(`[GameSaveRepository] Failed to prune ${f.path}:`, err);
			}
		}
	}

	/**
	 * 根据文件名查找文件路径
	 * @param filename 文件名（如 "xxx.zip"）
	 * @returns 文件的完整路径，如果文件不存在则返回 null
	 */
	async findFileByFilename(filename: string): Promise<string | null> {
		try {
			const filePath = path.join(this.uploadDir, filename);
			await fs.access(filePath);
			return filePath;
		} catch {
			return null;
		}
	}

	private async ensureUploadDirExists(): Promise<void> {
		try {
			await fs.access(this.uploadDir);
		} catch {
			await fs.mkdir(this.uploadDir, { recursive: true });
		}
	}
}
