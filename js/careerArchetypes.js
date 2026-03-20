// TalentAI V2 - 职业原型定义（平行试运行版）

const archetypes = {
  A: {
    id: "A",
    name: "创造构建型",
    tier1: { 空间智能: 8.0, 逻辑智能: 7.5 },
    tier2: { 内省智能: 7.5, 语言智能: 7.0 },
    tier3: { 人际智能: 7.0 },
  },
  B: {
    id: "B",
    name: "影响领导型",
    tier1: { 人际智能: 8.5, 语言智能: 8.0 },
    tier2: { 内省智能: 7.5, 逻辑智能: 7.0 },
    tier3: { 空间智能: 7.0 },
  },
  C: {
    id: "C",
    name: "分析决策型",
    tier1: { 逻辑智能: 8.5, 内省智能: 8.0 },
    tier2: { 空间智能: 7.5, 语言智能: 7.0 },
    tier3: { 人际智能: 7.0 },
  },
  D: {
    id: "D",
    name: "内容表达型",
    tier1: { 语言智能: 8.5, 内省智能: 7.5 },
    tier2: { 空间智能: 7.5, 人际智能: 7.0 },
    tier3: { 逻辑智能: 7.0 },
  },
  E: {
    id: "E",
    name: "系统技术型",
    tier1: { 逻辑智能: 8.0, 空间智能: 8.0 },
    tier2: { 内省智能: 7.5 },
    tier3: { 语言智能: 7.0 },
  },
  F: {
    id: "F",
    name: "服务支持型",
    tier1: { 人际智能: 8.5, 内省智能: 8.0 },
    tier2: { 语言智能: 7.5 },
    tier3: { 逻辑智能: 7.0 },
  },
  G: {
    id: "G",
    name: "执行运营型",
    tier1: { 逻辑智能: 8.0, 人际智能: 7.5 },
    tier2: { 空间智能: 7.5 },
    tier3: { 语言智能: 7.0 },
  },
  H: {
    id: "H",
    name: "艺术创意型",
    tier1: { 音乐智能: 8.5, 空间智能: 8.0 },
    tier2: { 内省智能: 7.5, 语言智能: 7.5 },
    tier3: { 人际智能: 7.0 },
  },
};

const tierWeights = {
  tier1: 1.0,
  tier2: 0.6,
  tier3: 0.3,
};

// 简单工具：给某个原型算一份“理想匹配度”，方便 Debug
function scoreArchetype(userT, archetypeId) {
  const at = archetypes[archetypeId];
  if (!at) return 0;
  const t = (dim) => Number(userT[dim] ?? 0);

  let score = 0;
  Object.entries(at.tier1).forEach(([dim, thr]) => {
    score += (t(dim) - thr) * tierWeights.tier1;
  });
  Object.entries(at.tier2).forEach(([dim, thr]) => {
    score += (t(dim) - thr) * tierWeights.tier2;
  });
  Object.entries(at.tier3 || {}).forEach(([dim, thr]) => {
    score += (t(dim) - thr) * tierWeights.tier3;
  });
  return score;
}

if (typeof window !== "undefined") {
  window.TalentAI = window.TalentAI || {};
  window.TalentAI.V2 = window.TalentAI.V2 || {};
  window.TalentAI.V2.archetypes = archetypes;
  window.TalentAI.V2.tierWeights = tierWeights;
  window.TalentAI.V2.scoreArchetype = scoreArchetype;
}

