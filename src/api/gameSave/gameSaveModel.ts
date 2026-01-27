import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export type GameSaveUploadResponse = z.infer<typeof GameSaveUploadResponseSchema>;
export const GameSaveUploadResponseSchema = z.object({
	filename: z.string(),
	originalName: z.string(),
	mimetype: z.string(),
	size: z.number(),
	path: z.string(),
	uploadTime: z.date(),
});

// 分析请求 Schema
export const AnalyzeGameSaveSchema = z.object({
	params: z.object({
		filename: z.string().min(1, "Filename is required"),
	}),
});
export type AnalyzeGameSaveRequest = z.infer<typeof AnalyzeGameSaveSchema>;

// 分析响应 Schema
export const GameSaveAnalysisResponseSchema = z.object({
	/** 是否为基于完整 level.dat 的全维度分析；false 表示仅根据存档头信息生成基础信息 */
	fullAnalysisAvailable: z.boolean().optional(),
	basic: z.object({
		saveName: z.string(),
		gameTimeHour: z.string(),
		gameVersion: z.string(),
	}),
	develop: z.object({
		stage: z.enum(["前期（手动/半自动化）", "中期（全自动化）", "后期（规模化）", "末期（无限升级）"]),
		score: z.number(),
		techStatus: z.object({
			researchedCount: z.number(),
			totalTechCount: z.number(),
			techRate: z.string(),
		}),
		mainPowerType: z.enum(["热能", "蒸汽", "太阳能", "核能"]),
	}),
	resource: z.object({
		mined: z.record(z.string(), z.number()),
		remaining: z.record(z.string(), z.number()),
		storage: z.record(z.string(), z.number()),
		coreResAlert: z.array(z.string()),
	}),
	production: z.object({
		machines: z.record(z.string(), z.number()),
		efficiencyRate: z.string(),
		efficiencyAlert: z.array(z.string()),
	}),
	power: z.object({
		totalProduction: z.number(),
		totalConsumption: z.number(),
		powerRatio: z.string(),
		powerStatus: z.enum(["充足", "紧张", "不足"]),
	}),
	enemy: z.object({
		totalCount: z.number(),
		nestCount: z.number(),
		threatLevel: z.enum(["低", "中", "高", "极高"]),
		threatAlert: z.array(z.string()),
	}),
	optimizeSuggestions: z.object({
		urgent: z.array(z.string()),
		important: z.array(z.string()),
		suggest: z.array(z.string()),
	}),
});
export type GameSaveAnalysisResponse = z.infer<typeof GameSaveAnalysisResponseSchema>;
