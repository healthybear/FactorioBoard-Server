// src/service/save.service.ts
import path from "node:path";
import { parseLevelInitData } from "factorio-save-parser";
import unzipper from "unzipper";

/** zip 内 level-init.dat 的路径可能在不同子目录（由游戏内存档名决定），不依赖 zip 文件名 */
const LEVEL_INIT_NAME = "level-init.dat";

function findLevelInitInZip(
	files: Array<{ path: string; buffer: (password?: string) => Promise<Buffer> }>,
): { path: string; buffer: (password?: string) => Promise<Buffer> } | undefined {
	return files.find((f) => {
		const p = (f.path ?? "").replace(/\\/g, "/");
		return p.endsWith(LEVEL_INIT_NAME) || p === LEVEL_INIT_NAME;
	});
}

/**
 * 解析异星工厂存档文件（仅解析 level-init.dat 头信息）
 * 会在 zip 内任意子目录中查找 level-init.dat，不要求 zip 内目录名与 zip 文件名一致。
 * @param source 存档源：本地 zip 路径（string）| 上传的 zip Buffer
 * @returns 解析后的头信息（name、version、mods 等）
 */
export async function parseFactorioSave(source: string | Buffer) {
	try {
		const directory =
			typeof source === "string"
				? await unzipper.Open.file(path.resolve(source))
				: await unzipper.Open.buffer(Buffer.from(source));

		const levelInitEntry = findLevelInitInZip(directory.files);
		if (!levelInitEntry) {
			const names = directory.files.map((f) => f.path).slice(0, 10).join(", ");
			throw new Error(
				`ZIP 中未找到 ${LEVEL_INIT_NAME}。请确认是异星工厂原生存档（ZIP 内应含 xxx/${LEVEL_INIT_NAME}）。当前 ZIP 内前几项：${names}${directory.files.length > 10 ? "..." : ""}`,
			);
		}

		const buf = await levelInitEntry.buffer();
		if (!buf || buf.length === 0) {
			throw new Error(`${LEVEL_INIT_NAME} 为空或读取失败`);
		}
		const dataView = new DataView(
			buf.buffer,
			buf.byteOffset,
			buf.byteLength,
		);
		const saveData = parseLevelInitData(dataView);
		return saveData as unknown;
	} catch (err) {
		throw new Error(
			`存档解析失败：${(err as Error).message}，请确认存档为异星工厂原生 ZIP 存档`,
		);
	}
}

// 定义分析结果TS类型（保证类型安全，前端可直接复用该类型）
export interface FactorioAnalysisResult {
	/** 是否为全维度分析（true=有 game/map 数据；false=仅头信息） */
	fullAnalysisAvailable?: boolean;
	// 基础信息
	basic: {
      saveName: string;
      gameTimeHour: string; // 游戏时间（小时，原tick转换：60tick=1秒）
      gameVersion: string; // 游戏版本
    };
    // 1. 发展阶段分析
    develop: {
      stage: '前期（手动/半自动化）' | '中期（全自动化）' | '后期（规模化）' | '末期（无限升级）';
      score: number; // 发展评分（0-100）
      techStatus: {
        researchedCount: number; // 已解锁科技数
        totalTechCount: number; // 总科技数
        techRate: string; // 科技解锁率
      };
      mainPowerType: '热能' | '蒸汽' | '太阳能' | '核能'; // 主要发电类型
    };
    // 2. 资源分布分析
    resource: {
      mined: Record<string, number>; // 已开采资源（铁矿/铜矿/煤/石油等）
      remaining: Record<string, number>; // 剩余矿脉资源量
      storage: Record<string, number>; // 仓库存储资源量
      coreResAlert: string[]; // 核心资源预警（不足/枯竭）
    };
    // 3. 产能效率分析
    production: {
      machines: Record<string, number>; // 生产设备数量（石炉/钢炉/组装机/研究中心等）
      efficiencyRate: string; // 产能效率（有效设备占比）
      efficiencyAlert: string[]; // 效率问题预警（石炉未升级/设备闲置等）
    };
    // 4. 电力供需分析
    power: {
      totalProduction: number; // 总发电量（kW）
      totalConsumption: number; // 总耗电量（kW）
      powerRatio: string; // 供电比（发电量/耗电量）
      powerStatus: '充足' | '紧张' | '不足'; // 供电状态
    };
    // 5. 敌人威胁分析
    enemy: {
      totalCount: number; // 敌人总数量（虫子/蠕虫/巢穴）
      nestCount: number; // 虫巢数量
      threatLevel: '低' | '中' | '高' | '极高'; // 威胁等级
      threatAlert: string[]; // 威胁预警（虫巢靠近基地等）
    };
    // 整体优化建议（分优先级）
    optimizeSuggestions: {
      urgent: string[]; // 紧急（供电不足/资源枯竭/高威胁）
      important: string[]; // 重要（效率低/设备配比不合理）
      suggest: string[]; // 建议（科技慢/储备不足）
    };
  }
  
  /** 仅带头信息时生成的分析结果（无 game/map 数据） */
  function buildHeaderOnlyAnalysis(header: {
    name?: string;
    factorioVersion?: { asString?: string };
  }): FactorioAnalysisResult {
    const result: FactorioAnalysisResult = {
      fullAnalysisAvailable: false,
      basic: {
        saveName: header.name ?? "未命名基地",
        gameTimeHour: "—",
        gameVersion: header.factorioVersion?.asString ?? "未知版本",
      },
      develop: {
        stage: "前期（手动/半自动化）",
        score: 0,
        techStatus: { researchedCount: 0, totalTechCount: 0, techRate: "0.00%" },
        mainPowerType: "热能",
      },
      resource: { mined: {}, remaining: {}, storage: {}, coreResAlert: [] },
      production: { machines: {}, efficiencyRate: "—", efficiencyAlert: [] },
      power: { totalProduction: 0, totalConsumption: 0, powerRatio: "—", powerStatus: "充足" },
      enemy: { totalCount: 0, nestCount: 0, threatLevel: "低", threatAlert: [] },
      optimizeSuggestions: { urgent: [], important: [], suggest: [] },
    };
    result.optimizeSuggestions.suggest.push(
      "当前仅解析了存档头信息；全维度分析（资源/电力/敌人等）需要完整 level.dat 解析支持，暂无可用库。"
    );
    return result;
  }

  /**
   * 异星工厂存档分析：有 game/map 时做全维度分析，仅头信息时返回基础信息 + 占位
   * @param saveData 解析后的存档数据（parseFactorioSave 返回值，可为头信息或完整数据）
   * @returns 结构化分析结果
   */
  export async function analyzeFactorioSave(saveData: any): Promise<FactorioAnalysisResult> {
    if (!saveData?.game || !saveData?.map?.surfaces?.[0]) {
      return buildHeaderOnlyAnalysis(saveData ?? {});
    }
    // 提取核心分析数据（过滤无用数据，提升分析效率）
    const gameData = saveData.game;
    const mapData = saveData.map.surfaces[0]; // 主地图表面（核心游戏区域）
    const playerForce = gameData.forces.player; // 玩家势力（包含科技、生产、电力统计）
    const gameTick = gameData.tick; // 游戏最小时间单位（60tick=1秒，3600tick=1小时）
    const entities = Object.values(mapData.entities) as Array<{ name?: string; amount?: number }>; // 地图所有实体（建筑/资源/敌人/虫巢）
  
    // 初始化分析结果（全维度）
    const analysis: FactorioAnalysisResult = {
      fullAnalysisAvailable: true,
      basic: {
        saveName: saveData.map.name || '未命名基地',
        gameTimeHour: (gameTick / 60 / 60).toFixed(2),
        gameVersion: saveData.game_version || '未知版本'
      },
      develop: { stage: '前期（手动/半自动化）', score: 0, techStatus: { researchedCount: 0, totalTechCount: 0, techRate: '0.00%' }, mainPowerType: '热能' },
      resource: { mined: {}, remaining: {}, storage: {}, coreResAlert: [] },
      production: { machines: {}, efficiencyRate: '0.00%', efficiencyAlert: [] },
      power: { totalProduction: 0, totalConsumption: 0, powerRatio: '0.00', powerStatus: '充足' },
      enemy: { totalCount: 0, nestCount: 0, threatLevel: '低', threatAlert: [] },
      optimizeSuggestions: { urgent: [], important: [], suggest: [] }
    };
  
    // ========== 维度1：发展阶段分析（核心：游戏时间+科技解锁+发电类型） ==========
    const techAll = Object.keys(playerForce.technologies);
    const techResearched = techAll.filter(tech => playerForce.technologies[tech].researched);
    analysis.develop.techStatus = {
      researchedCount: techResearched.length,
      totalTechCount: techAll.length,
      techRate: ((techResearched.length / techAll.length) * 100).toFixed(2) + '%'
    };
    // 判断主要发电类型
    const powerProduction = playerForce.electric_network_statistics.production;
    if (powerProduction.nuclear) analysis.develop.mainPowerType = '核能';
    else if (powerProduction.solar) analysis.develop.mainPowerType = '太阳能';
    else if (powerProduction.steam) analysis.develop.mainPowerType = '蒸汽';
    else analysis.develop.mainPowerType = '热能';
    // 量化判断发展阶段（贴合游戏实际玩法）
    const gameTime = Number(analysis.basic.gameTimeHour);
    const techCount = techResearched.length;
    if (gameTime < 10 && techCount < 30) analysis.develop.stage = '前期（手动/半自动化）';
    else if (gameTime < 50 && techCount < 80) analysis.develop.stage = '中期（全自动化）';
    else if (gameTime < 200 && techCount < 150) analysis.develop.stage = '后期（规模化）';
    else analysis.develop.stage = '末期（无限升级）';
    // 发展评分（0-100：科技解锁率50% + 游戏阶段50%）
    const techScore = Math.min(50, (techResearched.length / techAll.length) * 50);
    const stageScore = gameTime < 10 ? gameTime / 10 * 50 : 50;
    analysis.develop.score = Math.min(100, Math.round(techScore + stageScore));
  
    // ========== 维度2：资源分布分析（核心：已开采+剩余矿脉+仓库存储，聚焦核心资源） ==========
    const coreResources = ['iron-ore', 'copper-ore', 'coal', 'crude-oil'] as const; // 核心资源
    const resourceMap: Record<string, string> = { 'iron-ore': '铁矿', 'copper-ore': '铜矿', 'coal': '煤', 'crude-oil': '原油' };
    // 统计已开采资源（游戏内置生产统计）
    analysis.resource.mined = {
      铁矿: playerForce.item_production_statistics.output_counts['iron-ore'] || 0,
      铜矿: playerForce.item_production_statistics.output_counts['copper-ore'] || 0,
      煤: playerForce.item_production_statistics.output_counts['coal'] || 0,
      原油: playerForce.item_production_statistics.output_counts['crude-oil'] || 0
    };
    // 统计剩余矿脉资源（地图实体中未开采的资源节点）
    coreResources.forEach(res => {
      analysis.resource.remaining[resourceMap[res]] = entities
        .filter((e) => e.name === res)
        .reduce((sum, e) => sum + (e.amount ?? 0), 0);
    });
    // 统计仓库存储资源（玩家势力所有仓库的存储量）
    analysis.resource.storage = {
      铁板: playerForce.items['iron-plate'] || 0,
      铜板: playerForce.items['copper-plate'] || 0,
      铁齿轮: playerForce.items['iron-gear-wheel'] || 0,
      铜缆: playerForce.items['copper-cable'] || 0
    };
    // 核心资源预警（剩余量＜已开采量的10% 判定为枯竭风险）
    coreResources.forEach(res => {
      const resCn = resourceMap[res];
      const mined = analysis.resource.mined[resCn];
      const remaining = analysis.resource.remaining[resCn];
      if (mined > 0 && remaining / mined < 0.1) {
        analysis.resource.coreResAlert.push(`${resCn}剩余量不足已开采的10%，存在枯竭风险`);
      }
    });
  
    // ========== 维度3：产能效率分析（核心：生产设备数量+效率判定） ==========
    // 统计核心生产设备数量（地图实体中的生产建筑）
    analysis.production.machines = {
      石炉: entities.filter(e => e.name === 'stone-furnace').length,
      钢炉: entities.filter(e => e.name === 'steel-furnace').length,
      组装机1: entities.filter(e => e.name === 'assembling-machine-1').length,
      组装机2: entities.filter(e => e.name === 'assembling-machine-2').length,
      组装机3: entities.filter(e => e.name === 'assembling-machine-3').length,
      研究中心: entities.filter(e => e.name === 'lab').length,
      电力采矿机: entities.filter(e => e.name === 'electric-mining-drill').length,
      热能采矿机: entities.filter(e => e.name === 'burner-mining-drill').length
    };
    // 计算产能效率（有效设备占比：钢炉/电力设备为有效，石炉/热能设备为低效）
    const totalFurnace = analysis.production.machines.石炉 + analysis.production.machines.钢炉;
    const effectiveFurnace = analysis.production.machines.钢炉;
    const totalMining = analysis.production.machines.电力采矿机 + analysis.production.machines.热能采矿机;
    const effectiveMining = analysis.production.machines.电力采矿机;
    const totalEffective = effectiveFurnace + effectiveMining;
    const totalMachine = totalFurnace + totalMining;
    analysis.production.efficiencyRate = totalMachine > 0 ? ((totalEffective / totalMachine) * 100).toFixed(2) + '%' : '100%';
    // 效率问题预警
    if (analysis.production.machines.石炉 > 0) {
      analysis.production.efficiencyAlert.push(`仍有${analysis.production.machines.石炉}个石炉，建议升级为钢炉（冶炼效率翻倍，耗煤不变）`);
    }
    if (analysis.production.machines.热能采矿机 > 0) {
      analysis.production.efficiencyAlert.push(`仍有${analysis.production.machines.热能采矿机}个热能采矿机，建议升级为电力采矿机（采矿效率提升50%）`);
    }
    if (analysis.production.machines.研究中心 < 5 && analysis.develop.stage.includes('前期')) {
      analysis.production.efficiencyAlert.push(`研究中心数量不足（当前${analysis.production.machines.研究中心}个），科技解锁速度慢`);
    }
  
    // ========== 维度4：电力供需分析（核心：发电量+耗电量+供电比） ==========
    // 统计总发电量/耗电量（游戏内置电力统计，单位：kW）
    analysis.power.totalProduction = Math.round(powerProduction.total || 0);
    analysis.power.totalConsumption = Math.round(playerForce.electric_network_statistics.consumption.total || 1); // 避免除0
    // 计算供电比（发电量/耗电量）
    analysis.power.powerRatio = (analysis.power.totalProduction / analysis.power.totalConsumption).toFixed(2);
    // 判断供电状态
    const powerRatio = Number(analysis.power.powerRatio);
    if (powerRatio >= 1.1) analysis.power.powerStatus = '充足';
    else if (powerRatio >= 0.9) analysis.power.powerStatus = '紧张';
    else analysis.power.powerStatus = '不足';
  
    // ========== 维度5：敌人威胁分析（核心：敌人数量+虫巢数量+威胁等级） ==========
    // 统计敌人和虫巢数量（地图实体中的敌对单位）
    const enemyTypes = ['small-biter', 'medium-biter', 'big-biter', 'behemoth-biter', 'small-spitter', 'medium-spitter', 'big-spitter', 'behemoth-spitter'];
    analysis.enemy.totalCount = entities.filter((e) => e.name != null && enemyTypes.includes(e.name)).length;
    analysis.enemy.nestCount = entities.filter((e) => e.name === 'biter-nest' || e.name === 'spitter-nest').length;
    // 量化判断威胁等级
    if (analysis.enemy.nestCount === 0) analysis.enemy.threatLevel = '低';
    else if (analysis.enemy.nestCount < 10) analysis.enemy.threatLevel = '中';
    else if (analysis.enemy.nestCount < 30) analysis.enemy.threatLevel = '高';
    else analysis.enemy.threatLevel = '极高';
    // 威胁预警（虫巢数量多+靠近基地）
    if (analysis.enemy.threatLevel === '高' || analysis.enemy.threatLevel === '极高') {
      analysis.enemy.threatAlert.push(`当前虫巢${analysis.enemy.nestCount}个，敌人${analysis.enemy.totalCount}只，威胁等级${analysis.enemy.threatLevel}，建议加强基地防御`);
    }
  
    // ========== 整体优化建议（按优先级整合所有预警） ==========
    // 紧急建议（供电不足/资源枯竭/极高威胁）
    if (analysis.power.powerStatus === '不足') {
      analysis.optimizeSuggestions.urgent.push(`供电不足（供电比${analysis.power.powerRatio}），${analysis.develop.mainPowerType === '蒸汽' ? '请按1泵:20锅炉:40蒸汽机补充发电设备' : '建议增加太阳能板/储能箱/核能反应堆'}`);
    }
    analysis.resource.coreResAlert.forEach(alert => {
      analysis.optimizeSuggestions.urgent.push(alert);
    });
    if (analysis.enemy.threatLevel === '极高') {
      analysis.optimizeSuggestions.urgent.push(analysis.enemy.threatAlert[0]);
    }
    // 重要建议（效率低/供电紧张/中高威胁）
    if (analysis.power.powerStatus === '紧张') {
      analysis.optimizeSuggestions.important.push(`供电紧张（供电比${analysis.power.powerRatio}），建议适当增加发电设备，避免设备停机`);
    }
    analysis.production.efficiencyAlert.forEach(alert => {
      analysis.optimizeSuggestions.important.push(alert);
    });
    if (analysis.enemy.threatLevel === '高') {
      analysis.optimizeSuggestions.important.push(analysis.enemy.threatAlert[0]);
    }
    // 建议（科技解锁率低/资源储备不足）
    if (Number(analysis.develop.techStatus.techRate.replace('%', '')) < 50) {
      analysis.optimizeSuggestions.suggest.push(`科技解锁率仅${analysis.develop.techStatus.techRate}，建议优化科技包生产线，增加研究中心数量`);
    }
    const coreStorage = analysis.resource.storage.铁板 + analysis.resource.storage.铜板;
    if (coreStorage < 1000) {
      analysis.optimizeSuggestions.suggest.push(`核心基础材料（铁板+铜板）储备不足1000，建议提升冶炼产能`);
    }
  
    return analysis;
  }