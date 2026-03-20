console.log("[V2] calcCareerMatch.js loaded");
 
// TalentAI V2 - 职业匹配核心（平行试运行版）
// 只在 Console 中输出，不影响现有 UI 与引擎

// 依赖由 careerEcosystems.js 与 careerArchetypes.js 挂载到 window.TalentAI.V2
const V2 = (typeof window !== "undefined" && window.TalentAI && window.TalentAI.V2) || {};
const archetypes = V2.archetypes || {};
const tierWeights = V2.tierWeights || {};
const pickActiveEcosystems = V2.pickActiveEcosystems || function () { return []; };

function calcDimensionScore(userScore, threshold, tierWeight) {
  const diff = userScore - threshold;
  if (diff >= 0) {
    return diff * 0.5 * tierWeight; // 超标加分收益递减
  } else {
    return diff * 1.5 * tierWeight; // 不达标惩罚更重
  }
}

function normalize(rawScore) {
  // 简单线性映射：假设 -40 ~ +40 区间 → 0~100
  const clipped = Math.max(-40, Math.min(40, rawScore));
  const pct = ((clipped + 40) / 80) * 100;
  return Math.round(Math.max(0, Math.min(100, pct)));
}

function getMotivationFactor(wScores, requirements = {}) {
  // requirements: { 维度名: 阈值 }
  if (!requirements || !Object.keys(requirements).length) return 1.0;
  let hit = 0;
  let total = 0;
  Object.entries(requirements).forEach(([dim, thr]) => {
    total += 1;
    const v = Number(wScores[dim] ?? 0);
    if (v >= thr) hit += 1;
  });
  const match = total > 0 ? (hit / total) * 10 : 5; // 0-10 近似匹配度
  if (match >= 7.5) return 1.2;
  if (match >= 6.0) return 1.0;
  return 0.6;
}

function calcCareerScoreV2(userT, wScores, career) {
  let abilityScore = 0;
  const dimensionMap = {
    语言智能: "语言智能",
    逻辑智能: "逻辑智能",
    空间智能: "空间智能",
    音乐智能: "音乐智能",
    身体智能: "身体智能",
    人际智能: "人际智能",
    内省智能: "内省智能",
    自然智能: "自然智能",
  };
  const t = (dim) => Number(userT[dim] ?? 0);

  const topDimContrib = [];

  (career.archetypes || []).forEach(({ archetypeId, weight }) => {
    const at = archetypes[archetypeId];
    if (!at || !weight) return;
    let archetypeScore = 0;

    Object.entries(at.tier1).forEach(([dim, thr]) => {
      const s = t(dim);
      const c = calcDimensionScore(s, thr, tierWeights.tier1);
      archetypeScore += c;
      topDimContrib.push({ name: dim, userScore: s, threshold: thr, tierWeight: tierWeights.tier1, contribution: c });
    });
    Object.entries(at.tier2).forEach(([dim, thr]) => {
      const s = t(dim);
      const c = calcDimensionScore(s, thr, tierWeights.tier2);
      archetypeScore += c;
      topDimContrib.push({ name: dim, userScore: s, threshold: thr, tierWeight: tierWeights.tier2, contribution: c });
    });
    Object.entries(at.tier3 || {}).forEach(([dim, thr]) => {
      const s = t(dim);
      const c = calcDimensionScore(s, thr, tierWeights.tier3);
      archetypeScore += c;
      topDimContrib.push({ name: dim, userScore: s, threshold: thr, tierWeight: tierWeights.tier3, contribution: c });
    });

    abilityScore += archetypeScore * weight;
  });

  const motivationFactor = getMotivationFactor(wScores, career.W_requirements || {});
  const risk = career.aiRisk || "medium";
  const riskFactor = risk === "low" ? 1.05 : risk === "high" ? 0.85 : 1.0;

  const finalRaw = abilityScore * motivationFactor * riskFactor;
  const normalizedScore = normalize(finalRaw);

  // Top 2 维度贡献
  const topDimensions = topDimContrib
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 2);

  return {
    career: career.name,
    finalScore: normalizedScore,
    abilityScore,
    motivationFactor,
    riskFactor,
    topDimensions,
    W_triggered: Object.keys(career.W_requirements || {}).filter((k) => (wScores[k] ?? 0) >= (career.W_requirements?.[k] ?? 0)),
  };
}

// 简单内置几个职业样本（阶段1仅用于 Console 验证）
const SAMPLE_CAREERS = [
  {
    name: "创业者",
    archetypes: [
      { archetypeId: "B", weight: 0.6 },
      { archetypeId: "A", weight: 0.4 },
    ],
    ecosystem: "creation",
    aiRisk: "low",
    W_requirements: { 自主驱动: 7.5, 成长导向: 7.5 },
  },
  {
    name: "AI课程设计师",
    archetypes: [
      { archetypeId: "D", weight: 0.5 },
      { archetypeId: "E", weight: 0.5 },
    ],
    ecosystem: "influence",
    aiRisk: "medium",
    W_requirements: { 影响力驱动: 7.0, 创造倾向: 7.0 },
  },
  {
    name: "数据科学家",
    archetypes: [
      { archetypeId: "C", weight: 0.7 },
      { archetypeId: "E", weight: 0.3 },
    ],
    ecosystem: "creation",
    aiRisk: "medium",
    W_requirements: { 成长导向: 7.0 },
  },
];

function calcCareerMatchV2(profile) {
  const userT = profile.T || {};
  const w = profile.W || {};

  const activeEcos = pickActiveEcosystems(w);
  console.log("[V2] 开始计算，激活生态：", activeEcos);

  const allResults = SAMPLE_CAREERS.map((c) =>
    calcCareerScoreV2(userT, w, c)
  );
  const entrepreneurScore = allResults.find((r) => r.career === "创业者");
  console.log("[V2] 创业者得分：", entrepreneurScore);

  const sorted = [...allResults].sort(
    (a, b) => b.finalScore - a.finalScore
  );

  // Top3 原型规则：第三个分数需 >= Top1 的 60%
  const top1 = sorted[0]?.finalScore ?? 0;
  let top = sorted.slice(0, 3);
  if (top.length === 3 && top[2].finalScore < top1 * 0.6) {
    top = top.slice(0, 2);
  }

  console.log("[V2] 最终排序结果：", sorted);
  console.group("[V2] Career Match Debug");
  console.log("Active ecosystems:", activeEcos);
  sorted.forEach((r) => {
    console.log({
      career: r.career,
      finalScore: r.finalScore,
      abilityScore: r.abilityScore,
      motivationFactor: r.motivationFactor,
      riskFactor: r.riskFactor,
      topDimensions: r.topDimensions,
      W_triggered: r.W_triggered,
    });
  });
  console.log("Top careers by V2:", top.map((t) => t.career));
  console.groupEnd();

  return { ecosystems: activeEcos, careers: sorted, top };
}

if (typeof window !== "undefined") {
  window.TalentAI = window.TalentAI || {};
  window.TalentAI.Debug = window.TalentAI.Debug || {};
  window.TalentAI.Debug.calcCareerMatchV2 = calcCareerMatchV2;
}

