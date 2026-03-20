console.log("✅ engine.js loaded (strict real scoring)");

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Track 画像加载（v3.1 向量匹配基础）—— 仅新增，不影响现有逻辑
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let _TRACKS_CACHE = null;

async function loadTracksDB() {
  if (_TRACKS_CACHE) return _TRACKS_CACHE;
  try {
    const res = await fetch('data/tracks-database.json');
    if (!res.ok) throw new Error('tracks-database.json load failed');
    const data = await res.json();
    _TRACKS_CACHE = {};
    (data.tracks || []).forEach(track => {
      if (track.track_id) {
        _TRACKS_CACHE[track.track_id] = track;
      }
    });
  } catch (e) {
    console.warn('[TalentAI] loadTracksDB error:', e);
    _TRACKS_CACHE = {};
  }
  return _TRACKS_CACHE;
}

function normalizeUserT(userT) {
  if (!userT) return {
    T1: 0, T2: 0, T3: 0, T4: 0,
    T5: 0, T6: 0, T7: 0, T8: 0
  };
  if (userT.T1 !== undefined) {
    return userT;
  }
  return {
    T1: userT.T1_language || 0,
    T2: userT.T2_logic || 0,
    T3: userT.T3_spatial || 0,
    T4: userT.T4_music || 0,
    T5: userT.T5_body || 0,
    T6: userT.T6_social || 0,
    T7: userT.T7_creativity || 0,
    T8: userT.T8_nature || 0
  };
}

function computeT_VectorMatch(userT, requiredT) {
  if (!requiredT || !Object.keys(requiredT).length) return 50;
  const t = normalizeUserT(userT);
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [dim, weight] of Object.entries(requiredT)) {
    if (!weight) continue;
    const score = (t[dim] || 0) * 10; // 0-10 → 0-100
    weightedSum += score * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

function computeP_VectorMatch(userP, requiredP) {
  if (!requiredP || !Object.keys(requiredP).length) return 50;
  const p = userP || {};
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [dim, weight] of Object.entries(requiredP)) {
    if (!weight) continue;
    const score = p[dim] || 50;
    const absW = Math.abs(weight);
    weightedSum += (weight < 0 ? (100 - score) : score) * absW;
    totalWeight += absW;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

function computeM_VectorMatch(userM, requiredM) {
  if (!requiredM || !Object.keys(requiredM).length) return 50;
  const m = userM || {};
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [dim, weight] of Object.entries(requiredM)) {
    if (!weight) continue;
    const score = m[dim] || 50;
    weightedSum += score * weight;
    totalWeight += weight;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 维度配置（保持你原来的）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const DIMENSIONS = {
  T1_language: { name: "语言智能", desc: "理解、使用语言的能力" },
  T2_logic: { name: "逻辑数学智能", desc: "逻辑推理、数学运算的能力" },
  T3_spatial: { name: "空间智能", desc: "感知视觉空间的能力" },
  T4_music: { name: "音乐智能", desc: "感受、创作音乐的能力" },
  T5_bodily: { name: "身体动觉智能", desc: "运用身体的能力" },
  T6_interpersonal: { name: "人际智能", desc: "理解、与他人互动的能力" },
  T7_intrapersonal: { name: "内省智能", desc: "认识、理解自己的能力" },
  T8_naturalist: { name: "自然观察智能", desc: "观察、理解自然的能力" }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 职业家族（保持你原来的）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CAREER_FAMILIES = {
  creator: {
    name: "创造者", icon: "🎨",
    weights: { T1_language: 0.25, T3_spatial: 0.35, T4_music: 0.25, T7_intrapersonal: 0.15 },
    migrateTip: "把创意变成作品：练“输出”，做作品集。"
  },
  solver: {
    name: "解决者", icon: "🔍",
    weights: { T2_logic: 0.5, T7_intrapersonal: 0.2, T1_language: 0.15, T3_spatial: 0.15 },
    migrateTip: "把问题拆成模块：练“建模”，练结构化表达。"
  },
  helper: {
    name: "帮助者", icon: "🤝",
    weights: { T6_interpersonal: 0.45, T1_language: 0.2, T7_intrapersonal: 0.2, T5_bodily: 0.15 },
    migrateTip: "练共情+边界：既能帮助人，也不被耗尽。"
  },
  organizer: {
    name: "组织者", icon: "📊",
    weights: { T2_logic: 0.35, T6_interpersonal: 0.25, T7_intrapersonal: 0.25, T1_language: 0.15 },
    migrateTip: "练项目拆解与复盘：把“混乱”变成“流程”。"
  },
  influencer: {
    name: "影响者", icon: "💬",
    weights: { T1_language: 0.35, T6_interpersonal: 0.35, T2_logic: 0.2, T7_intrapersonal: 0.1 },
    migrateTip: "练说服与叙事：把价值讲清楚，影响决策。"
  },
  explorer: {
    name: "探索者", icon: "🔬",
    weights: { T8_naturalist: 0.3, T2_logic: 0.25, T3_spatial: 0.25, T7_intrapersonal: 0.2 },
    migrateTip: "练实验与记录：用数据/日志驱动迭代。"
  },
  guardian: {
    name: "守护者", icon: "🛡️",
    weights: { T2_logic: 0.4, T6_interpersonal: 0.2, T7_intrapersonal: 0.25, T1_language: 0.15 },
    migrateTip: "练规则化思维：适合合规、审计、风控类路径。"
  },
  operator: {
    name: "操作者", icon: "🔧",
    weights: { T5_bodily: 0.4, T3_spatial: 0.3, T2_logic: 0.2, T7_intrapersonal: 0.1 },
    migrateTip: "练标准化动作：把技能打磨到“稳定输出”。"
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 总入口：生成完整结果（你原来的结构保留）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function generateCompleteResult(userAnswers, timings, questionsData, careersDataRaw) {
  const qBank = normalizeQuestions(questionsData);

  // ✅ 严格真实算分（不做任何额外加成）
  const scores = calcAllDimensionsStrict(userAnswers, qBank, { debug: false });

  const radarData = Object.keys(DIMENSIONS).map(k => ({
    dimensionKey: k,
    dimension: DIMENSIONS[k].name,
    description: DIMENSIONS[k].desc,
    displayScore: scores[k].displayScore,
    percentage: scores[k].percentage
  }));

  const top3Talents = pickTop3(scores).map((t, idx) => enrichTopTalent(t, idx, scores));

  const combinationAnalysis = buildCombination(top3Talents, scores);
  const conflictWarnings = buildConflicts(scores);

  const familyScores = calcFamilyScores(scores);
  const topFamilies = rankFamilies(familyScores);

  const careers = normalizeCareers(careersDataRaw);
  const top5Careers = matchTop5Careers(scores, familyScores, careers);

  const label = buildTalentLabel(top3Talents);
  const nickname = buildTalentNickname(top3Talents, topFamilies);

  return {
    metadata: {
      version: "T-Layer-Result-2026.2-STRICT",
      generatedAt: new Date().toISOString(),
      talentLabel: label,
      talentNickname: nickname
    },
    scores,
    radarData,
    top3Talents,
    combinationAnalysis,
    conflictWarnings,
    familyScores,
    topFamilies,
    careerRecommendations: top5Careers
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 题库/职业库归一化
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function normalizeQuestions(questionsData) {
  return questionsData || {};
}

function normalizeCareers(careersDataRaw) {
  const c = careersDataRaw?.careers ? careersDataRaw.careers : careersDataRaw;
  if (Array.isArray(c)) return c;
  if (c && typeof c === "object") return Object.values(c);
  return [];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ 取答案：兼容你当前多种存储方式
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getAnswerForQuestion(userAnswers, dimensionKey, q, index) {
  const dimAns = userAnswers?.[dimensionKey];

  // 1) 数组按顺序存
  if (Array.isArray(dimAns)) return dimAns[index];

  // 2) 对象按题目id存 或按index存
  if (dimAns && typeof dimAns === "object") {
    if (q?.id != null && dimAns[q.id] != null) return dimAns[q.id];
    if (dimAns[index] != null) return dimAns[index];
  }

  // 3) 全局对象按题目id存
  if (q?.id != null && userAnswers?.[q.id] != null) return userAnswers[q.id];

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ 取某选项在该维度的真实得分（兼容 T1_language 或 T1）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function getOptionScore(option, dimensionKey) {
  if (!option || !option.scoring) return 0;

  // 1) scoring 用维度全名
  if (option.scoring[dimensionKey] != null) return Number(option.scoring[dimensionKey]);

  // 2) scoring 用短key（T1/T2...）
  const shortKey = dimensionKey.slice(0, 2);
  if (option.scoring[shortKey] != null) return Number(option.scoring[shortKey]);

  return 0;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ 严格真实算分：
// - 每题满分 = 该题该维度选项中的最大 scoring
// - 维度总满分 = 各题满分累加
// - 最终 10分制 = raw/max * 10
// - 不加任何时间奖励/估算
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function calcAllDimensionsStrict(userAnswers, qBank, { debug = false } = {}) {
  const scores = {};

  Object.keys(DIMENSIONS).forEach(dim => {
    const questions = qBank?.[dim] || [];

    let maxScore = 0;
    let total = 0;

    questions.forEach((q, idx) => {
      // 本题真实满分
      let qMax = 0;
      (q.options || []).forEach(opt => {
        const s = getOptionScore(opt, dim);
        if (Number.isFinite(s) && s > qMax) qMax = s;
      });
      maxScore += qMax;

      // 用户选择
      const selectedId = getAnswerForQuestion(userAnswers, dim, q, idx);
      if (selectedId == null) {
        if (debug) console.log("[MISS]", dim, q?.id, "no selection");
        return;
      }

      // 选项匹配（防止 A vs "A"）
      const sel = String(selectedId);
      const opt = (q.options || []).find(o => String(o.id) === sel);
      if (!opt) {
        if (debug) console.log("[MISS]", dim, q?.id, "selected=", selectedId, "option not found");
        return;
      }

      const add = getOptionScore(opt, dim);
      if (Number.isFinite(add)) total += add;

      if (debug) console.log("[ADD]", dim, q?.id, "selected=", sel, "add=", add, "qMax=", qMax);
    });

    const raw = maxScore > 0 ? Math.min(total, maxScore) : 0;
    const displayScore = maxScore > 0 ? (raw / maxScore) * 10 : 0;
    const pct = maxScore > 0 ? (raw / maxScore) * 100 : 0;

    scores[dim] = {
      raw: round2(raw),
      max: round2(maxScore),
      displayScore: round1(displayScore),
      percentage: Math.round(pct)
    };
  });

  return scores;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Top3 & 解读（你原来的结构基本保留）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function pickTop3(scores) {
  return Object.keys(scores)
    .map(k => ({ dimensionKey: k, ...scores[k] }))
    .sort((a, b) => b.displayScore - a.displayScore)
    .slice(0, 3);
}

function enrichTopTalent(t, rankIndex, allScores) {
  const dim = t.dimensionKey;
  const name = DIMENSIONS[dim]?.name || dim;
  const lvl = relativeBand(t.displayScore);
  const meaning = meaningText(dim, t.displayScore);
  const how = howToUse(dim, allScores);
  const careers = careerDirections(dim);

  return {
    rank: rankIndex + 1,
    medal: ["🥇", "🥈", "🥉"][rankIndex] || "🏅",
    dimensionKey: dim,
    dimensionName: name,
    score: t.displayScore,
    relativeLevel: lvl,
    meaning,
    how,
    careers
  };
}

function buildCombination(top3, scores) {
  const keys = top3.map(x => x.dimensionKey);
  let type = "多元发展型";
  let desc = "你的天赋分布较均衡，具有跨领域整合潜力，可塑性强。";
  let fit = [];
  let migrate = "建议在团队里寻找互补伙伴（策略/执行/表达），形成更强组合。";

  if (keys.includes("T2_logic") && keys.includes("T1_language") && keys.includes("T6_interpersonal")) {
    type = "理性沟通者";
    desc = `例如：逻辑 ${scores.T2_logic.displayScore} + 语言 ${scores.T1_language.displayScore} + 人际 ${scores.T6_interpersonal.displayScore}，你擅长把复杂问题讲清楚，并推动协作。`;
    fit = ["需要将复杂技术讲给非技术人员听的岗位", "技术管理、产品经理、咨询顾问等角色", "在技术与商业之间搭建桥梁"];
    migrate = "建议与“操作者”型伙伴合作，形成“策略+执行”组合。";
  } else if (keys.includes("T2_logic") && keys.includes("T3_spatial")) {
    type = "系统构建者";
    desc = "你擅长在结构与空间中推理与搭建，适合系统设计、工程与产品架构。";
    fit = ["系统架构/工程设计", "产品结构设计", "游戏/三维/仿真相关"];
  } else if (keys.includes("T6_interpersonal") && keys.includes("T7_intrapersonal")) {
    type = "共情洞察者";
    desc = "你能理解自己与他人的情绪模式，适合咨询、教育、管理与人相关的路径。";
    fit = ["心理/咨询/教练", "教育培训", "组织发展/HR"];
  }

  return {
    combinationType: type,
    description: desc,
    fit,
    migrateTip: migrate
  };
}

function buildConflicts(scores) {
  const warnings = [];
  const sorted = Object.keys(scores)
    .map(k => ({ k, name: DIMENSIONS[k].name, s: scores[k].displayScore }))
    .sort((a, b) => b.s - a.s);

  const high = sorted[0];
  const low = sorted[sorted.length - 1];
  const gap = high.s - low.s;

  if (gap >= 5) {
    warnings.push(`你的${high.name}（${high.s}分）与${low.name}（${low.s}分）差距较大：建议选能放大优势的岗位，低分维度可用“伙伴互补”。`);
  }

  const logic = scores.T2_logic?.displayScore ?? 0;
  const inter = scores.T6_interpersonal?.displayScore ?? 0;
  if (logic >= 8 && inter <= 5) warnings.push("你可能更偏理性决策，容易忽视情感因素：建议刻意练“沟通温度”和团队氛围管理。");

  const intra = scores.T7_intrapersonal?.displayScore ?? 0;
  if (inter >= 8 && intra <= 4) warnings.push("你偏好社交环境，但自我觉察偏弱：注意边界管理，避免过度消耗。");

  return warnings;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 家族匹配
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function calcFamilyScores(scores) {
  const out = {};
  Object.keys(CAREER_FAMILIES).forEach(k => {
    const fam = CAREER_FAMILIES[k];
    let sum = 0;
    let w = 0;
    Object.keys(fam.weights).forEach(dim => {
      sum += (scores[dim]?.displayScore ?? 0) * fam.weights[dim];
      w += fam.weights[dim];
    });
    const score = w > 0 ? (sum / w) : 0;
    out[k] = {
      familyKey: k,
      familyName: fam.name,
      icon: fam.icon,
      matchScore: Math.round((score / 10) * 100),
      migrateTip: fam.migrateTip
    };
  });
  return out;
}

function rankFamilies(familyScores) {
  return Object.values(familyScores).sort((a, b) => b.matchScore - a.matchScore);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Top5职业匹配（保留你原逻辑）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function matchTop5Careers(scores, familyScores, careersList) {
  if (!careersList || careersList.length === 0) return [];

  // 找出用户最强的3个维度（用于天才加成）
  const allDims = Object.keys(DIMENSIONS).map(k => ({
    key: k, val: scores[k]?.displayScore ?? 0
  })).sort((a, b) => b.val - a.val);
  const topUserDims = new Set(allDims.slice(0, 3).map(d => d.key));

  const matches = careersList.map(c => {
    const req = c.requiredAbilities || {};
    const keys = Object.keys(req);

    // ── 1. 能力匹配（区分超额/不足，非线性惩罚）──
    let abilityMatch = 0;
    let count = 0;
    keys.forEach(k => {
      const dimKey = DIMENSIONS[k] ? k : mapShortToDim(k);
      const user = scores[dimKey]?.displayScore ?? 0;
      const target = Number(req[k]) || 0;
      if (target <= 0) return;
      if (user >= target) {
        // 超额完成：适度奖励（最多+10分），避免扎堆满分
        abilityMatch += Math.min(110, 100 + (user - target) * 3);
      } else {
        // 不足：1.5次方惩罚（比线性更重但比平方温和）
        const ratio = user / target;
        abilityMatch += Math.pow(ratio, 1.5) * 100;
      }
      count++;
    });
    const abilityPct = count > 0 ? (abilityMatch / count) : 50;

    // ── 2. 家族匹配 ──
    const famKey = c.family || c.careerFamily || "";
    const famPct = familyScores[famKey]?.matchScore ?? 50;

    // ── 3. 结构匹配（加权：关键维度权重更高）──
    const structurePct = structureMatchWeighted(scores, req);

    // ── 4. 天才加成：用户最强维度与职业最高要求维度重合 ──
    let geniusBonus = 0;
    if (keys.length > 0) {
      const topReqDim = keys.reduce((a, b) =>
        (Number(req[a]) || 0) > (Number(req[b]) || 0) ? a : b
      );
      const topReqDimKey = DIMENSIONS[topReqDim] ? topReqDim : mapShortToDim(topReqDim);
      if (topUserDims.has(topReqDimKey)) geniusBonus = 8;
    }

    const final = abilityPct * 0.40 + famPct * 0.25 + structurePct * 0.35 + geniusBonus;

    return {
      id: c.id || "",
      name: c.name || c.title || "未命名职业",
      description: c.description || "",
      family: famKey,
      matchScore: clampInt(Math.round(final), 1, 99),  // 临时值，后面归一化
      aiImpact: c.aiImpact || {},
      whyNewbieCanWin: c.whyNewbieCanWin || "",
      keySkills: c.keySkills || [],
      entryBarrier: c.entryBarrier || "",
      careerPath: c.careerPath || "",
      realWorldExample: c.realWorldExample || ""
    };
  });

  // ── 后处理归一化：让分数更真实，避免扎堆99 ──
  const sorted = matches.sort((a, b) => b.matchScore - a.matchScore);
  const top5 = sorted.slice(0, 5);

  if (top5.length > 0) {
    const maxRaw = top5[0].matchScore;
    const minRaw = top5[top5.length - 1].matchScore;
    const range = maxRaw - minRaw || 1;

    // 第1名：88-95之间（随实际得分定），依次递减
    const targetMax = Math.min(95, Math.max(88, Math.round(maxRaw * 0.97)));
    const targetMin = Math.max(targetMax - 18, 55);

    top5.forEach((c, i) => {
      const normalized = targetMax - Math.round(((maxRaw - c.matchScore) / range) * (targetMax - targetMin));
      c.matchScore = clampInt(normalized, targetMin, targetMax - i);
    });
  }

  return top5;
}

// 加权结构匹配：高要求维度权重更大，区分度更高
function structureMatchWeighted(scores, req) {
  const keys = Object.keys(req || {});
  if (keys.length === 0) return 60;

  let weightedSum = 0;
  let totalWeight = 0;

  keys.forEach(k => {
    const dimKey = DIMENSIONS[k] ? k : mapShortToDim(k);
    const user = scores[dimKey]?.displayScore ?? 0;
    const target = Number(req[k]) || 0;
    // 高要求维度权重更高（按要求值加权）
    const w = target > 0 ? target : 5;
    weightedSum += (user / 10) * 100 * w;
    totalWeight += w;
  });

  const weighted = totalWeight > 0 ? (weightedSum / totalWeight) : 60;
  return clampInt(Math.round(weighted), 20, 98);
}

function structureMatch(scores, req) {
  return structureMatchWeighted(scores, req);
}

function mapShortToDim(k) {
  if (k === "T1") return "T1_language";
  if (k === "T2") return "T2_logic";
  if (k === "T3") return "T3_spatial";
  if (k === "T4") return "T4_music";
  if (k === "T5") return "T5_bodily";
  if (k === "T6") return "T6_interpersonal";
  if (k === "T7") return "T7_intrapersonal";
  if (k === "T8") return "T8_naturalist";
  return "T2_logic";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 标签 & 昵称
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildTalentLabel(top3) {
  return top3.map(t => t.dimensionName.replace("智能", "")).join("·");
}

function buildTalentNickname(top3, topFamilies) {
  const fam = topFamilies?.[0]?.familyName || "探索者";
  const a = top3?.[0]?.dimensionName?.replace("智能", "") || "多维";
  const b = top3?.[1]?.dimensionName?.replace("智能", "") || "成长";
  const style = ["理性", "共情", "系统", "创意", "敏锐", "稳健"][Math.floor(Math.random() * 6)];
  return `${style}${a}的${fam}（兼具${b}）`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 文案工具（保留原来的）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function relativeBand(score) {
  if (score >= 8.5) return "Top 15%（高优势区间）";
  if (score >= 7.2) return "Top 30%（优势区间）";
  if (score >= 6.0) return "Top 50%（可提升区间）";
  return "需要刻意练习（潜力区间）";
}

function meaningText(dim, score) {
  const s = score;
  if (dim === "T2_logic") {
    return `你拥有出色的逻辑推理能力（${s}/10）。面对复杂问题时，你能快速抓住关键、理清因果并提出可执行方案。`;
  }
  if (dim === "T1_language") {
    return `你的语言表达与理解能力突出（${s}/10）。你能把复杂内容讲清楚、写明白，也更容易通过表达影响他人决策。`;
  }
  if (dim === "T6_interpersonal") {
    return `你对他人的情绪与动机更敏感（${s}/10）。你更擅长建立信任、推动协作。`;
  }
  if (dim === "T3_spatial") {
    return `你的空间感知与视觉构建能力较强（${s}/10）。你更容易在结构、布局、形态中思考。`;
  }
  if (dim === "T7_intrapersonal") {
    return `你更擅长自我觉察与独立反思（${s}/10）。你能更清晰地理解自己的节奏、边界与目标。`;
  }
  return `该维度表现突出（${s}/10），建议作为核心优势发展。`;
}

function howToUse(dim, allScores) {
  if (dim === "T2_logic") return [
    "选择需要深度思考的工作，而非重复性任务",
    "多参与问题分析、系统设计类项目",
    "培养结构化表达能力（配合语言智能）"
  ];
  if (dim === "T1_language") return [
    "用写作/表达做外显成果：文章、方案、课程、演讲",
    "练结构化表达：结论先行、要点分层",
    "与逻辑结合：把观点变成可验证的论证"
  ];
  if (dim === "T6_interpersonal") return [
    "选择强协作场景：团队项目、客户沟通、组织管理",
    "练“同理心+边界”：既能连接也不被消耗",
    "把沟通变成能力资产：复盘、谈判、冲突调解"
  ];
  return [
    "把优势转成作品或项目成果",
    "在真实任务中刻意练习",
    "与互补伙伴协作，放大整体产出"
  ];
}

function careerDirections(dim) {
  if (dim === "T2_logic") return ["程序员", "数据科学家", "战略咨询", "产品经理", "系统架构师"];
  if (dim === "T1_language") return ["内容策略", "法律/合规", "教师/培训", "市场/品牌", "产品运营"];
  if (dim === "T6_interpersonal") return ["销售", "HR/组织发展", "心理咨询", "管理者", "客户成功"];
  if (dim === "T3_spatial") return ["UI/UX设计师", "建筑/工业设计", "游戏开发", "三维/影视", "工程设计"];
  if (dim === "T4_music") return ["音乐制作人", "声音设计师", "音乐治疗师", "游戏音效", "内容配乐"];
  if (dim === "T5_bodily") return ["运动教练", "物理治疗师", "舞蹈/表演", "手工艺/工匠", "外科医生"];
  if (dim === "T7_intrapersonal") return ["作家/创作者", "心理咨询师", "战略规划", "研究员", "独立创业"];
  if (dim === "T8_naturalist") return ["环境科学家", "生态研究员", "农业科技", "动物行为学", "可持续发展顾问"];
  return ["多维度发展", "跨界整合", "AI时代新职业"];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 工具函数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }
function clampInt(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(n))); }

