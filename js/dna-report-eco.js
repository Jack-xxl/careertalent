/**
 * TalentAI 生态得分计算器 科学最终版
 *
 * 核心原则：
 * T层决定方向（能力基础，上限80，不虚高）
 * P层决定表现（行为修正，0.90-1.12）
 * W层决定持续性（动力修正，0.90-1.12）
 * W层数据已归一化为0-10，HIGH=5，LOW=3
 *
 * 展示层用 mapToDisplayScore 映射到 70-95
 * 算法内部用 rawScore 保证准确性；排序与生态归属用 rawScore
 */
'use strict';

const HIGH = 5;
const LOW = 3;

const ECO_DEFS = {
  Creator: {
    id: 'Creator', nameZh: '创造生态', nameEn: 'Creator',
    tagline: '用创意与表达，把内在想法变成可见作品。',
    representatives: ['Steve Jobs', 'J.K. Rowling'],
    fields: ['内容创作', '产品设计', '品牌表达'],
    t: { T1: 0.20, T3: 0.20, T7: 0.10 }
  },
  Explorer: {
    id: 'Explorer', nameZh: '探索生态', nameEn: 'Explorer',
    tagline: '在未知边界中持续提问、验证与进化。',
    representatives: ['Albert Einstein', 'Marie Curie'],
    fields: ['科学研究', '战略分析', '前沿探索'],
    t: { T2: 0.25, T7: 0.15, T8: 0.10 }
  },
  Solver: {
    id: 'Solver', nameZh: '解决生态', nameEn: 'Solver',
    tagline: '拆解复杂问题，构建清晰可行的解决路径。',
    representatives: ['Elon Musk', 'Grace Hopper'],
    fields: ['系统架构', '工程方案', '技术攻坚'],
    t: { T2: 0.25, T3: 0.25 }
  },
  Influencer: {
    id: 'Influencer', nameZh: '影响生态', nameEn: 'Influencer',
    tagline: '通过表达与连接，影响他人并整合资源。',
    representatives: ['Barack Obama', 'Oprah Winfrey'],
    fields: ['公众表达', '社群运营', '传播策略'],
    t: { T1: 0.25, T6: 0.25 }
  },
  Organizer: {
    id: 'Organizer', nameZh: '组织生态', nameEn: 'Organizer',
    tagline: '搭建秩序与流程，推动团队稳定高效交付。',
    representatives: ['Tim Cook', 'Indra Nooyi'],
    fields: ['项目管理', '运营协调', '组织建设'],
    t: { T2: 0.25, T6: 0.25 }
  },
  Guardian: {
    id: 'Guardian', nameZh: '守护生态', nameEn: 'Guardian',
    tagline: '在规则、责任与稳定中守护长期价值。',
    representatives: ['Ruth Bader Ginsburg', 'Warren Buffett'],
    fields: ['合规治理', '风险管理', '制度守护'],
    t: { T2: 0.25, T6: 0.25 }
  },
  Helper: {
    id: 'Helper', nameZh: '助人生态', nameEn: 'Helper',
    tagline: '在陪伴与支持中，为他人创造真实价值。',
    representatives: ['Mother Teresa', 'Fred Rogers'],
    fields: ['教育辅导', '心理支持', '客户成功'],
    t: { T6: 0.25, T7: 0.25 }
  },
  Builder: {
    id: 'Builder', nameZh: '实践生态', nameEn: 'Builder',
    tagline: '用双手与工具，把构想落地成可见成果。',
    representatives: ['James Dyson', 'Li Shufu'],
    fields: ['制造工程', '现场实施', '产品落地'],
    t: { T5: 0.20, T3: 0.20, T8: 0.10 }
  }
};

const ECO_ORDER = [
  'Creator', 'Explorer', 'Solver', 'Influencer',
  'Organizer', 'Guardian', 'Helper', 'Builder'
];

const FAMILY_P = {
  Creator: { O: 0.30, E: 0.18, C: 0.14, A: 0.10, NINV: 0.12 },
  Solver: { O: 0.18, C: 0.24, E: 0.10, A: 0.08, NINV: 0.20 },
  Organizer: { O: 0.10, C: 0.28, E: 0.12, A: 0.16, NINV: 0.18 },
  Influencer: { O: 0.18, C: 0.10, E: 0.28, A: 0.16, NINV: 0.08 },
  Explorer: { O: 0.30, C: 0.14, E: 0.10, A: 0.08, NINV: 0.12 },
  Builder: { O: 0.10, C: 0.24, E: 0.12, A: 0.10, NINV: 0.22 },
  Guardian: { O: 0.08, C: 0.32, E: 0.08, A: 0.18, NINV: 0.22 },
  Helper: { O: 0.10, C: 0.14, E: 0.18, A: 0.26, NINV: 0.12 }
};

const ECOLOGY_W_RULES = {
  Helper: [
    { field: 'belonging', op: '>=', val: HIGH, effect: 0.18 },
    { field: 'meaning', op: '>=', val: HIGH, effect: 0.12 },
    { field: 'belonging', op: '<=', val: LOW, effect: -0.20 },
    { field: 'meaning', op: '<=', val: LOW, effect: -0.10 }
  ],
  Organizer: [
    { field: 'competence', op: '>=', val: HIGH, effect: 0.15 },
    { field: 'belonging', op: '>=', val: HIGH, effect: 0.08 },
    { field: 'autonomy', op: '>=', val: HIGH, effect: 0.05 },
    { field: 'meaning', op: '>=', val: HIGH, effect: 0.05 }
  ],
  Creator: [
    { field: 'autonomy', op: '>=', val: HIGH, effect: 0.15 },
    { field: 'exploration', op: '>=', val: HIGH, effect: 0.10 },
    { field: 'meaning', op: '>=', val: HIGH, effect: 0.05 }
  ],
  Explorer: [
    { field: 'exploration', op: '>=', val: HIGH, effect: 0.20 },
    { field: 'autonomy', op: '>=', val: HIGH, effect: 0.08 },
    { field: 'meaning', op: '>=', val: HIGH, effect: 0.05 }
  ],
  Solver: [
    { field: 'competence', op: '>=', val: HIGH, effect: 0.18 },
    { field: 'exploration', op: '>=', val: HIGH, effect: 0.08 }
  ],
  Influencer: [
    { field: 'belonging', op: '>=', val: HIGH, effect: 0.12 },
    { field: 'meaning', op: '>=', val: HIGH, effect: 0.08 },
    { field: 'autonomy', op: '>=', val: HIGH, effect: 0.05 }
  ],
  Guardian: [
    { field: 'competence', op: '>=', val: HIGH, effect: 0.12 },
    { field: 'meaning', op: '>=', val: HIGH, effect: 0.08 },
    { field: 'autonomy', op: '>=', val: 8, effect: -0.15 },
    { field: 'belonging', op: '<=', val: LOW, effect: -0.10 }
  ],
  Builder: [
    { field: 'competence', op: '>=', val: HIGH, effect: 0.15 },
    { field: 'autonomy', op: '>=', val: HIGH, effect: 0.08 }
  ]
};

/** T 层基础上限（满分归一化后映射到此分值，不虚高） */
const T_BASE_CAP = 80;

/** 按各生态 T 权重之和 × 10 计算理论满分 rawT（权重和为 0.5 时 tMax=5） */
function computeEcologyTMax(tWeights) {
  const weightSum = Object.values(tWeights || {}).reduce((sum, wt) => sum + wt, 0);
  return weightSum * 10;
}

const ECOLOGY_T_MAX = Object.fromEntries(
  ECO_ORDER.map((id) => [id, computeEcologyTMax(ECO_DEFS[id].t)])
);

const TALENT_TYPES = {
  Creator: {
    name: '创意内容型',
    definition: '当前数据结构显示，更倾向通过创意表达与内容创作呈现想法。',
    directions: ['数字内容创作', '视觉表达设计', '品牌叙事传播']
  },
  Explorer: {
    name: '科学研究型',
    definition: '当前数据结构显示，更倾向在未知领域持续探索与验证。',
    directions: ['基础研究', '战略分析', '前沿探索']
  },
  Solver: {
    name: '技术创新型',
    definition: '当前数据结构显示，更倾向拆解复杂问题并构建解决路径。',
    directions: ['系统架构', '工程实现', '技术攻坚']
  },
  Influencer: {
    name: '商业领导型',
    definition: '当前数据结构显示，更倾向通过表达与连接整合资源。',
    directions: ['商业表达', '社群连接', '传播策略']
  },
  Organizer: {
    name: '组织管理型',
    definition: '当前数据结构显示，更倾向搭建秩序与流程推动协作交付。',
    directions: ['项目协调', '运营管理', '组织建设']
  },
  Guardian: {
    name: '规则守护型',
    definition: '当前数据结构显示，更倾向在规则与责任中守护长期价值。',
    directions: ['合规治理', '风险管理', '制度维护']
  },
  Helper: {
    name: '服务关怀型',
    definition: '当前数据结构显示，更倾向在陪伴与支持中创造真实价值。',
    directions: ['教育辅导', '心理支持', '服务设计']
  },
  Builder: {
    name: '实践工程型',
    definition: '当前数据结构显示，更倾向用双手与工具把构想落地。',
    directions: ['制造工程', '现场实施', '产品落地']
  }
};

const COMPOSITE_TYPES = {
  'Creator+Solver': {
    name: '技术创意型',
    definition: '创意表达与技术解题的组合倾向较为突出。',
    directions: ['交互设计', '产品原型', '创意工程']
  },
  'Influencer+Organizer': {
    name: '商业领袖型',
    definition: '影响表达与组织协调整合倾向较为突出。',
    directions: ['商业运营', '团队领导', '战略传播']
  },
  'Explorer+Solver': {
    name: '科技创新型',
    definition: '探索未知与系统解题的组合倾向较为突出。',
    directions: ['科研工程', '技术战略', '创新研发']
  },
  'Helper+Influencer': {
    name: '教育影响型',
    definition: '服务关怀与影响表达的组合倾向较为突出。',
    directions: ['教育培训', '公益传播', '社群引导']
  },
  'Organizer+Guardian': {
    name: '企业服务型',
    definition: '组织协调与规则守护的组合倾向较为突出。',
    directions: ['企业管理', '合规运营', '制度服务']
  },
  'Builder+Solver': {
    name: '工程创新型',
    definition: '实践落地与技术解题的组合倾向较为突出。',
    directions: ['智能制造', '工程研发', '产品实现']
  }
};

const T_KEY_MAP = {
  T1: 'T1_language', T2: 'T2_logic', T3: 'T3_spatial', T4: 'T4_music',
  T5: 'T5_bodily', T6: 'T6_interpersonal', T7: 'T7_intrapersonal', T8: 'T8_naturalist'
};

function clampScore(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function tVal10(tMap, code) {
  const key = T_KEY_MAP[code] || code;
  const raw = tMap[key] ?? tMap[code] ?? 0;
  const n = Number(raw);
  if (n > 10) return Math.max(0, Math.min(10, n / 10));
  return Math.max(0, Math.min(10, n));
}

/** T 层加权和（0–5 量纲，满分时各生态约 5.0） */
function ecologyTFormula(tWeights, tMap) {
  let sum = 0;
  Object.entries(tWeights).forEach(([code, wt]) => {
    sum += tVal10(tMap, code) * wt;
  });
  return sum;
}

/** P 层原始修正（0.8–1.2，供映射到 [0.90, 1.12]） */
function ecologyPFormula(familyName, pScores) {
  const weights = FAMILY_P[familyName];
  if (!weights) return 1.0;
  const vals = {
    O: pScores.openness,
    C: pScores.conscientiousness,
    E: pScores.extraversion,
    A: pScores.agreeableness,
    NINV: pScores.emotional_stability
  };
  let fit = 0;
  Object.entries(weights).forEach(([k, w]) => {
    fit += (vals[k] ?? 5) * w * 10;
  });
  return 0.8 + (fit / 100) * 0.4;
}

function buildEcologyCalc(name) {
  const def = ECO_DEFS[name];
  const tWeights = def.t;
  const tMax = computeEcologyTMax(tWeights);
  return {
    name,
    tWeights,
    tMax,
    tFormula: (tScores) => ecologyTFormula(tWeights, tScores),
    pFormula: (pScores) => ecologyPFormula(name, pScores)
  };
}

function calculateEcologyScore(ecology, tScores, pScores, wScores) {
  const rawTScore = ecology.tFormula(tScores);
  const tMax = ecology.tMax || ECOLOGY_T_MAX[ecology.name] || computeEcologyTMax(ecology.tWeights);
  const tContribution = tMax > 0 ? (rawTScore / tMax) * T_BASE_CAP : 0;

  const rawPModifier = ecology.pFormula(pScores);
  const pModifier = 0.90 +
    (Math.max(0, Math.min(0.4, rawPModifier - 0.8)) / 0.4) * 0.22;

  let wDelta = 0.0;
  const rules = ECOLOGY_W_RULES[ecology.name] || [];
  rules.forEach((rule) => {
    const userValue = wScores[rule.field] || 0;
    const isMatch = rule.op === '>='
      ? userValue >= rule.val
      : userValue <= rule.val;
    if (isMatch) wDelta += rule.effect;
  });

  if (ecology.name === 'Guardian') {
    if (pScores.conscientiousness >= HIGH &&
        pScores.emotional_stability >= 6) {
      wDelta += 0.05;
    }
  }

  if (ecology.name === 'Helper') {
    if (wScores.belonging <= LOW && wScores.meaning <= LOW) {
      wDelta -= 0.10;
    }
  }

  const clampedWDelta = Math.max(-0.25, Math.min(0.25, wDelta));
  const wModifier = 0.90 +
    ((clampedWDelta + 0.25) / 0.5) * 0.22;

  let rawScore = tContribution * pModifier * wModifier;
  rawScore = clampScore(rawScore, 0, 100);
  rawScore = Math.round(rawScore * 10) / 10;

  const displayScore = mapToDisplayScore(rawScore);

  return {
    rawScore,
    displayScore,
    score: displayScore,
    tContribution: Math.round(tContribution * 10) / 10,
    rawTScore: Math.round(rawTScore * 100) / 100,
    pModifier: Math.round(pModifier * 1000) / 1000,
    pModifierPct: Math.round(pModifier * 100),
    wModifier: Math.round(wModifier * 1000) / 1000,
    wModifierPct: Math.round(wModifier * 100),
    tier: resolveEcoTier(displayScore)
  };
}

/** 展示层映射：内部真实分 0-100 → 展示分 70-95 */
function mapToDisplayScore(rawScore) {
  const displayScore = 70 + (rawScore / 100) * 25;
  return Math.round(displayScore);
}

/** 段位标签基于 displayScore */
function resolveEcoTier(displayScore) {
  if (displayScore >= 90) return '卓越匹配';
  if (displayScore >= 85) return '高度匹配';
  if (displayScore >= 80) return '良好匹配';
  if (displayScore >= 75) return '中等匹配';
  return '参考匹配';
}

function normalizeTScores(t) {
  const out = {};
  Object.entries(T_KEY_MAP).forEach(([code, key]) => {
    out[code] = tVal10(t, code);
    out[key] = out[code];
  });
  return out;
}

function normalizePScores(p) {
  const get = (k) => {
    const item = p[k];
    if (item?.score != null) return Number(item.score);
    if (item?.rawPct != null) return Number(item.rawPct) / 10;
    return 5;
  };
  const n = get('N');
  return {
    O: get('O'),
    C: get('C'),
    E: get('E'),
    A: get('A'),
    N: n,
    openness: get('O'),
    conscientiousness: get('C'),
    extraversion: get('E'),
    agreeableness: get('A'),
    neuroticism: n,
    emotional_stability: n
  };
}

function normalizeWScores(w, wDrive) {
  const dims = wDrive?.dimensions || {};
  const keys = ['exploration', 'autonomy', 'meaning', 'competence', 'belonging'];
  const out = {};
  keys.forEach((k) => {
    if (w[k]?.score != null && w[k]?.max) {
      out[k] = (Number(w[k].score) / Number(w[k].max)) * 10;
    } else if (dims[k]?.score != null) {
      out[k] = (Number(dims[k].score) / 16) * 10;
    } else {
      out[k] = 0;
    }
  });
  return out;
}

function computeEcosystemScores(vectors) {
  const { t, p, w, wDrive } = vectors;
  const tScores = normalizeTScores(t);
  const pScores = normalizePScores(p);
  const wScores = normalizeWScores(w, wDrive);

  const results = ECO_ORDER.map((id) => {
    const def = ECO_DEFS[id];
    const ecology = buildEcologyCalc(id);
    const calc = calculateEcologyScore(ecology, tScores, pScores, wScores);
    return {
      ...def,
      rawScore: calc.rawScore,
      displayScore: calc.displayScore,
      score: calc.displayScore,
      tier: calc.tier,
      tContribution: calc.tContribution,
      pModifier: calc.pModifier,
      pModifierPct: calc.pModifierPct,
      wModifier: calc.wModifier,
      wModifierPct: calc.wModifierPct,
      tMatch: Math.round(calc.tContribution),
      pMatch: calc.pModifierPct,
      wMatch: calc.wModifierPct,
      mMatch: 50
    };
  });

  return results.sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    return b.tContribution - a.tContribution;
  });
}

function resolveTalentType(rankedEco) {
  const primary = rankedEco[0]?.id;
  const secondary = rankedEco[1]?.id;
  if (!primary) {
    return { name: '—', definition: '完成四层测评后可推导人才类型。', directions: [] };
  }
  const key = [primary, secondary].sort().join('+');
  if (COMPOSITE_TYPES[key]) return { ...COMPOSITE_TYPES[key], composite: true };
  return { ...TALENT_TYPES[primary], composite: false };
}

if (typeof window !== 'undefined') {
  window.DnaReportEco = {
    ECO_DEFS,
    ECO_ORDER,
    ECOLOGY_W_RULES,
    ECOLOGY_T_MAX,
    T_BASE_CAP,
    computeEcologyTMax,
    HIGH,
    LOW,
    calculateEcologyScore,
    mapToDisplayScore,
    resolveEcoTier,
    computeEcosystemScores,
    resolveTalentType
  };
}
