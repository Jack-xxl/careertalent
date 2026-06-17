/**
 * TalentAI 生态得分计算器 — 四层漏斗模型
 *
 * 第一层：硬门槛过滤
 * 第二层：四层加权 T/W/P/M（T 35% / W 30% / P 20% / M 15%）
 * 第三层：互斥张力修正（rawScore 快照，0-100 综合得分）
 * 第四层：置信度与展示标签
 *
 * 排序用 rawScore（0-100）；展示用 mapToDisplayScore → 70-95
 */
'use strict';

const HIGH = 5;
const LOW = 3;

const LAYER_WEIGHTS = { T: 0.35, W: 0.30, P: 0.20, M: 0.15 };

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

const FAMILY_M = {
  Explorer: { growth: 0.40, cognitive: 0.20, system: 0.15, independent: 0.15, practical: 0.05, longterm: 0.05 },
  Solver: { growth: 0.15, cognitive: 0.15, system: 0.35, independent: 0.10, practical: 0.15, longterm: 0.10 },
  Creator: { growth: 0.15, cognitive: 0.15, system: 0.10, independent: 0.25, practical: 0.30, longterm: 0.05 },
  Influencer: { growth: 0.15, cognitive: 0.30, system: 0.10, independent: 0.15, practical: 0.10, longterm: 0.20 },
  Organizer: { growth: 0.10, cognitive: 0.10, system: 0.25, independent: 0.10, practical: 0.10, longterm: 0.35 },
  Guardian: { growth: 0.10, cognitive: 0.10, system: 0.25, independent: 0.10, practical: 0.10, longterm: 0.35 },
  Helper: { growth: 0.25, cognitive: 0.20, system: 0.10, independent: 0.10, practical: 0.20, longterm: 0.15 },
  Builder: { growth: 0.15, cognitive: 0.10, system: 0.15, independent: 0.10, practical: 0.40, longterm: 0.10 }
};

/** 保留原有 W 层规则矩阵结构 */
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

const T_BASE_CAP = 80;

function computeEcologyTMax(tWeights) {
  const weightSum = Object.values(tWeights || {}).reduce((sum, wt) => sum + wt, 0);
  return weightSum * 10;
}

const ECOLOGY_T_MAX = Object.fromEntries(
  ECO_ORDER.map((id) => [id, computeEcologyTMax(ECO_DEFS[id].t)])
);

const TALENT_TYPES = {
  Creator: { name: '创意内容型', definition: '当前数据结构显示，更倾向通过创意表达与内容创作呈现想法。', directions: ['数字内容创作', '视觉表达设计', '品牌叙事传播'] },
  Explorer: { name: '科学研究型', definition: '当前数据结构显示，更倾向在未知领域持续探索与验证。', directions: ['基础研究', '战略分析', '前沿探索'] },
  Solver: { name: '技术创新型', definition: '当前数据结构显示，更倾向拆解复杂问题并构建解决路径。', directions: ['系统架构', '工程实现', '技术攻坚'] },
  Influencer: { name: '商业领导型', definition: '当前数据结构显示，更倾向通过表达与连接整合资源。', directions: ['商业表达', '社群连接', '传播策略'] },
  Organizer: { name: '组织管理型', definition: '当前数据结构显示，更倾向搭建秩序与流程推动协作交付。', directions: ['项目协调', '运营管理', '组织建设'] },
  Guardian: { name: '规则守护型', definition: '当前数据结构显示，更倾向在规则与责任中守护长期价值。', directions: ['合规治理', '风险管理', '制度维护'] },
  Helper: { name: '服务关怀型', definition: '当前数据结构显示，更倾向在陪伴与支持中创造真实价值。', directions: ['教育辅导', '心理支持', '服务设计'] },
  Builder: { name: '实践工程型', definition: '当前数据结构显示，更倾向用双手与工具把构想落地。', directions: ['制造工程', '现场实施', '产品落地'] }
};

const COMPOSITE_TYPES = {
  'Creator+Solver': { name: '技术创意型', definition: '创意表达与技术解题的组合倾向较为突出。', directions: ['交互设计', '产品原型', '创意工程'] },
  'Influencer+Organizer': { name: '商业领袖型', definition: '影响表达与组织协调整合倾向较为突出。', directions: ['商业运营', '团队领导', '战略传播'] },
  'Explorer+Solver': { name: '科技创新型', definition: '探索未知与系统解题的组合倾向较为突出。', directions: ['科研工程', '技术战略', '创新研发'] },
  'Helper+Influencer': { name: '教育影响型', definition: '服务关怀与影响表达的组合倾向较为突出。', directions: ['教育培训', '公益传播', '社群引导'] },
  'Organizer+Guardian': { name: '企业服务型', definition: '组织协调与规则守护的组合倾向较为突出。', directions: ['企业管理', '合规运营', '制度服务'] },
  'Builder+Solver': { name: '工程创新型', definition: '实践落地与技术解题的组合倾向较为突出。', directions: ['智能制造', '工程研发', '产品实现'] }
};

const T_KEY_MAP = {
  T1: 'T1_language', T2: 'T2_logic', T3: 'T3_spatial', T4: 'T4_music',
  T5: 'T5_bodily', T6: 'T6_interpersonal', T7: 'T7_intrapersonal', T8: 'T8_naturalist'
};

const W_FIELD_ALIASES = {
  curiosity: 'exploration',
  exploration: 'exploration',
  responsibility: 'meaning',
  control: 'autonomy',
  influence: 'meaning',
  creativity: 'autonomy'
};

const M_FIELD_ALIASES = {
  selfLearning: 'growth',
  problemSolving: 'system',
  trialAndError: 'practical',
  communication: 'cognitive',
  execution: 'longterm',
  handsOnTrial: 'practical',
  ruleAwareness: 'longterm',
  reconstruction: 'cognitive',
  systems: 'system',
  independence: 'independent',
  validation: 'practical'
};

function clampScore(n, min = 0, max = 10) {
  return Math.max(min, Math.min(max, n));
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function toScore10(raw, max) {
  const r = Number(raw) || 0;
  const m = Number(max) || 10;
  if (m <= 0) return 0;
  return clampScore((r / m) * 10);
}

function tVal10(tMap, code) {
  const key = T_KEY_MAP[code] || code;
  const raw = tMap[key] ?? tMap[code] ?? 0;
  const n = Number(raw);
  if (n > 10) return clampScore(n / 10);
  return clampScore(n);
}

function ecologyTFormula(tWeights, tMap) {
  let sum = 0;
  Object.entries(tWeights).forEach(([code, wt]) => {
    sum += tVal10(tMap, code) * wt;
  });
  return sum;
}

function buildEcologyCalc(name) {
  const def = ECO_DEFS[name];
  const tWeights = def.t;
  const tMax = computeEcologyTMax(tWeights);
  return { name, tWeights, tMax, tFormula: (tScores) => ecologyTFormula(tWeights, tScores) };
}

/** W 意义驱动派生（连续分数 + 布尔门槛） */
function deriveMeaningScores(w, p) {
  const meaning = w.meaning ?? 0;
  const agree = p.agreeableness ?? 5;
  const altruisticMeaningScore = meaning * (agree / 10);
  const personalMissionScore = meaning * ((10 - agree) / 10);
  const altruisticMeaning = meaning >= 5 && agree >= 7;
  const personalMissionMeaning = meaning >= 5 && agree < 6;
  const ambiguousMeaning = meaning >= 5 && agree >= 6 && agree < 7;
  return {
    altruisticMeaningScore: round1(altruisticMeaningScore),
    personalMissionScore: round1(personalMissionScore),
    altruisticMeaning,
    personalMissionMeaning,
    ambiguousMeaning
  };
}

/** 为各生态构建 W 规则输入（含意义派生） */
function buildWForRules(ecologyId, w, meaningDerived) {
  const base = {
    exploration: w.curiosity,
    curiosity: w.curiosity,
    autonomy: w.autonomy,
    meaning: w.meaning,
    competence: w.competence,
    belonging: w.belonging,
    altruisticMeaningScore: meaningDerived.altruisticMeaningScore,
    personalMissionScore: meaningDerived.personalMissionScore
  };

  if (ecologyId === 'Helper') {
    base.meaning = meaningDerived.altruisticMeaningScore;
    if (meaningDerived.ambiguousMeaning) base.meaning += w.meaning * 0.5;
  } else if (ecologyId === 'Creator') {
    base.meaning = meaningDerived.personalMissionScore;
    if (meaningDerived.ambiguousMeaning) base.meaning += w.meaning * 0.5;
  } else if (ecologyId === 'Influencer' || ecologyId === 'Guardian') {
    base.meaning = round1(
      (w.meaning + meaningDerived.altruisticMeaningScore + meaningDerived.personalMissionScore) / 3
    );
  }
  return base;
}

function computeWLayerScore(ecologyName, wForRules, pScores) {
  let wDelta = 0;
  const rules = ECOLOGY_W_RULES[ecologyName] || [];
  rules.forEach((rule) => {
    const userValue = wForRules[rule.field] ?? 0;
    const isMatch = rule.op === '>='
      ? userValue >= rule.val
      : userValue <= rule.val;
    if (isMatch) wDelta += rule.effect;
  });

  if (ecologyName === 'Guardian') {
    if (pScores.conscientiousness >= HIGH && pScores.emotional_stability >= 6) {
      wDelta += 0.05;
    }
  }
  if (ecologyName === 'Helper') {
    if ((wForRules.belonging ?? 0) <= LOW && (wForRules.meaning ?? 0) <= LOW) {
      wDelta -= 0.10;
    }
  }

  const clamped = Math.max(-0.25, Math.min(0.25, wDelta));
  return clampScore(5 + clamped * 20, 0, 10);
}

function computePLayerScore(ecologyName, pScores) {
  const weights = FAMILY_P[ecologyName];
  if (!weights) return 5;
  const vals = {
    O: pScores.openness,
    C: pScores.conscientiousness,
    E: pScores.extraversion,
    A: pScores.agreeableness,
    NINV: pScores.emotional_stability
  };
  let fit = 0;
  let wSum = 0;
  Object.entries(weights).forEach(([k, w]) => {
    fit += (vals[k] ?? 5) * w;
    wSum += w;
  });
  return wSum > 0 ? clampScore(fit / wSum) : 5;
}

function computeMLayerScore(ecologyName, mScores) {
  const weights = FAMILY_M[ecologyName];
  if (!weights) return 5;
  let fit = 0;
  let wSum = 0;
  Object.entries(weights).forEach(([k, w]) => {
    fit += (mScores[k] ?? 5) * w;
    wSum += w;
  });
  return wSum > 0 ? clampScore(fit / wSum) : 5;
}

/** 第一层：硬门槛 */
function passesHardGate(ecologyId, ctx) {
  const { t, w, p, meaning } = ctx;

  switch (ecologyId) {
    case 'Helper':
      return t.T6 >= 7 && (w.belonging >= 5 || meaning.altruisticMeaning);
    case 'Explorer':
      return t.T2 >= 7 && w.curiosity >= 5;
    case 'Solver':
      return t.T2 >= 7 && t.T3 >= 6 && w.competence >= 5;
    case 'Creator':
      return (t.T1 >= 7 || t.T3 >= 7) && t.T7 >= 6 &&
        (w.autonomy >= 5 || meaning.personalMissionMeaning);
    case 'Influencer':
      return t.T1 >= 7 && t.T6 >= 7 && (w.meaning >= 5 || w.belonging >= 5);
    case 'Organizer':
      return t.T2 >= 7 && t.T6 >= 7 && w.autonomy >= 5;
    case 'Guardian':
      return t.T2 >= 7 && p.conscientiousness >= 7 &&
        p.emotional_stability >= 6 && w.meaning >= 5;
    case 'Builder':
      return t.T5 >= 6 && t.T3 >= 6 && (w.competence >= 5 || w.autonomy >= 5);
    default:
      return false;
  }
}

/** 第二层：加权 rawScore（0-100 综合得分） */
function calculateEcologyScore(ecology, tScores, pScores, wScores, mScores, meaningDerived) {
  const ecologyName = ecology.name;
  const rawT = ecology.tFormula(tScores);
  const tMax = ecology.tMax || ECOLOGY_T_MAX[ecologyName] || computeEcologyTMax(ecology.tWeights);
  let tScore = tMax > 0 ? clampScore((rawT / tMax) * 10) : 0;
  if (ecologyName === 'Explorer' && tScores.T8 >= 6) {
    tScore = clampScore(tScore + (tScores.T8 - 6) * 0.5);
  }

  const wForRules = buildWForRules(ecologyName, wScores, meaningDerived);
  const wScore = computeWLayerScore(ecologyName, wForRules, pScores);
  const pScore = computePLayerScore(ecologyName, pScores);
  const mScore = computeMLayerScore(ecologyName, mScores);

  let rawScore = (tScore * LAYER_WEIGHTS.T +
    wScore * LAYER_WEIGHTS.W +
    pScore * LAYER_WEIGHTS.P +
    mScore * LAYER_WEIGHTS.M) * 10;
  rawScore = round1(Math.max(0, Math.min(100, rawScore)));

  const tMatchScore = tMax > 0 ? Math.round((rawT / tMax) * 100) : 0;
  const wMatchScore = Math.round((wScore / 10) * 100);
  const pMatchScore = Math.round((pScore / 10) * 100);
  const mMatchScore = Math.round((mScore / 10) * 100);

  const displayScore = mapToDisplayScore(rawScore);
  const confidence = resolveConfidence(tMatchScore, wMatchScore, pMatchScore, true);

  return {
    rawScore,
    displayScore,
    score: displayScore,
    tScore: round1(tScore),
    wScore: round1(wScore),
    pScore: round1(pScore),
    mScore: round1(mScore),
    rawTScore: round1(rawT),
    tMatchScore,
    wMatchScore,
    pMatchScore,
    mMatchScore,
    tMatch: tMatchScore,
    wMatch: wMatchScore,
    pMatch: pMatchScore,
    mMatch: mMatchScore,
    tContribution: Math.round((rawT / tMax) * T_BASE_CAP * 10) / 10,
    confidenceLabel: confidence.label,
    confidenceColor: confidence.color,
    confidenceLevel: confidence.level,
    tier: resolveEcoTier(displayScore)
  };
}

/** 第三层：互斥张力修正（基于快照，rawScore 为 0-100 综合得分） */
function applyMutexPenalties(rawScores, w, p, meaningDerived) {
  const snapshot = { ...rawScores };
  const penalties = {};
  const mul = (id, factor) => {
    if (!penalties[id]) penalties[id] = 1;
    penalties[id] *= factor;
  };

  const ranked = Object.entries(snapshot)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);
  const top2Ids = ranked.slice(0, 2).map(([id]) => id);
  const top3Ids = ranked.slice(0, 3).map(([id]) => id);
  const firstId = ranked[0]?.[0];

  const scoreOf = (id) => snapshot[id] ?? 0;

  // Guardian ↔ Creator
  if (top2Ids.includes('Guardian') && top2Ids.includes('Creator')) {
    const g = scoreOf('Guardian');
    const c = scoreOf('Creator');
    if (Math.abs(g - c) < 8) {
      mul(g <= c ? 'Guardian' : 'Creator', 0.85);
    }
    if (firstId === 'Guardian' && w.autonomy < 6) mul('Creator', 0.9);
    if (firstId === 'Creator' && (w.meaning < 6.5 || p.conscientiousness < 6.5)) {
      mul('Guardian', 0.9);
    }
  }

  // Explorer ↔ Organizer
  if (snapshot.Explorer > 0 && snapshot.Organizer > 0) {
    const e = scoreOf('Explorer');
    const o = scoreOf('Organizer');
    if (Math.abs(e - o) < 5) mul(e <= o ? 'Explorer' : 'Organizer', 0.85);
    if (w.curiosity - w.autonomy >= 2) mul('Organizer', 0.9);
    if (w.autonomy - w.curiosity >= 2) mul('Explorer', 0.9);
  }

  // Helper ↔ Solver
  if (top3Ids.includes('Helper') && top3Ids.includes('Solver')) {
    const h = scoreOf('Helper');
    const s = scoreOf('Solver');
    if (Math.abs(h - s) < 6) mul(h <= s ? 'Helper' : 'Solver', 0.85);

    if (w.belonging - w.competence >= 2 ||
      (meaningDerived.altruisticMeaning && w.meaning - w.competence >= 2)) {
      mul('Solver', 0.9);
    }
    if (w.competence - w.belonging >= 2 && !meaningDerived.altruisticMeaning) {
      mul('Helper', 0.9);
    }
  }

  // Influencer ↔ Guardian
  if (top2Ids.includes('Influencer') && top2Ids.includes('Guardian')) {
    const inf = scoreOf('Influencer');
    const g = scoreOf('Guardian');
    if (Math.abs(inf - g) < 6) mul(inf <= g ? 'Influencer' : 'Guardian', 0.85);

    const influencerDrive = w.belonging;
    const guardianDrive = p.conscientiousness;
    if (influencerDrive - guardianDrive >= 2) mul('Guardian', 0.9);
    if (guardianDrive - influencerDrive >= 2) mul('Influencer', 0.9);
  }

  Object.keys(penalties).forEach((id) => {
    if (rawScores[id] != null) {
      rawScores[id] = round1(Math.max(0, Math.min(100, rawScores[id] * penalties[id])));
    }
  });
}

/** 第四层：置信度 */
function resolveConfidence(tMatchScore, wMatchScore, pMatchScore, gatePassed) {
  const tOk = tMatchScore >= 70;
  const wOk = wMatchScore >= 65;
  const pOk = pMatchScore >= 60;

  if (!gatePassed) {
    return { label: '数据支持较弱，仅作参考', color: 'gray', level: 'weak' };
  }
  if (tOk && wOk && pOk) {
    return { label: '数据高度支持', color: 'green', level: 'high' };
  }
  const count = (tOk ? 1 : 0) + (wOk ? 1 : 0) + (pOk ? 1 : 0);
  if (count >= 2) {
    return { label: '数据基本支持', color: 'yellow', level: 'medium' };
  }
  if (tOk) {
    return { label: '数据部分支持，建议结合实际观察', color: 'gray', level: 'partial' };
  }
  return { label: '数据支持较弱，仅作参考', color: 'gray', level: 'weak' };
}

function mapToDisplayScore(rawScore) {
  const display = 70 + (rawScore / 100) * 25;
  return Math.round(Math.max(70, Math.min(95, display)));
}

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
    if (item?.score != null) return toScore10(item.score, item.max || 10);
    if (item?.rawPct != null) return toScore10(item.rawPct, 100);
    if (typeof item === 'number') return item > 10 ? item / 10 : item;
    return 5;
  };
  const n = get('N');
  return {
    O: get('O'), C: get('C'), E: get('E'), A: get('A'), N: n,
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
  const canonKeys = ['exploration', 'autonomy', 'meaning', 'competence', 'belonging'];
  const out = {};

  if (wDrive?.scores && typeof wDrive.scores === 'object') {
    canonKeys.forEach((k) => {
      const alias = W_FIELD_ALIASES[k] || k;
      const val = wDrive.scores[k] ?? wDrive.scores[alias];
      out[k] = round1(Number(val) || 0);
    });
    out.curiosity = out.exploration;
    return out;
  }

  const readDim = (key) => {
    const alias = W_FIELD_ALIASES[key] || key;
    if (typeof w[key] === 'number') return w[key] > 10 ? round1(w[key] / 10) : round1(w[key]);
    if (w[key]?.normalized != null) return round1(Number(w[key].normalized));
    if (w[key]?.score != null && w[key]?.max === 10) return round1(Number(w[key].score));
    if (w[key]?.score != null && w[key]?.max) return toScore10(w[key].score, w[key].max);
    if (w[alias]?.normalized != null) return round1(Number(w[alias].normalized));
    if (w[alias]?.score != null && w[alias]?.max === 10) return round1(Number(w[alias].score));
    if (w[alias]?.score != null && w[alias]?.max) return toScore10(w[alias].score, w[alias].max);
    if (dims[key]?.normalized != null) return round1(Number(dims[key].normalized));
    if (dims[key]?.score != null && dims[key]?.max === 10) return round1(Number(dims[key].score));
    if (dims[key]?.score != null) return toScore10(dims[key].score, dims[key].max || 16);
    if (dims[alias]?.normalized != null) return round1(Number(dims[alias].normalized));
    if (dims[alias]?.score != null) return toScore10(dims[alias].score, dims[alias].max || 16);
    return 0;
  };

  canonKeys.forEach((k) => { out[k] = readDim(k); });
  out.curiosity = out.exploration;
  return out;
}

function normalizeMScores(m, mDrive) {
  m = m || {};
  const dims = mDrive?.dimensions || {};
  const canonKeys = ['growth', 'cognitive', 'system', 'independent', 'practical', 'longterm'];
  const out = {};

  const readDim = (canonKey) => {
    if (m[canonKey]?.score != null) return toScore10(m[canonKey].score, m[canonKey].max || 12);
    if (dims[canonKey]?.score != null) return toScore10(dims[canonKey].score, dims[canonKey].max || 12);
    for (const [alias, target] of Object.entries(M_FIELD_ALIASES)) {
      if (target !== canonKey) continue;
      if (m[alias]?.score != null) return toScore10(m[alias].score, m[alias].max || 12);
      if (dims[alias]?.score != null) return toScore10(dims[alias].score, dims[alias].max || 12);
    }
    if (typeof m[canonKey] === 'number') return m[canonKey] > 10 ? m[canonKey] / 10 : m[canonKey];
    return 5;
  };

  canonKeys.forEach((k) => { out[k] = readDim(k); });
  return out;
}

function computeEcosystemScores(vectors) {
  const { t, p, w, wDrive, m, mDrive } = vectors;
  const tScores = normalizeTScores(t);
  const pScores = normalizePScores(p);
  const wScores = normalizeWScores(w, wDrive);
  const mScores = normalizeMScores(m, mDrive);
  const meaningDerived = deriveMeaningScores(wScores, pScores);

  const ctx = { t: tScores, w: wScores, p: pScores, m: mScores, meaning: meaningDerived };
  const rawScores = {};
  const layerDetails = {};

  ECO_ORDER.forEach((id) => {
    if (!passesHardGate(id, ctx)) {
      rawScores[id] = 0;
      layerDetails[id] = { gatePassed: false };
      return;
    }
    const ecology = buildEcologyCalc(id);
    const calc = calculateEcologyScore(ecology, tScores, pScores, wScores, mScores, meaningDerived);
    rawScores[id] = calc.rawScore;
    layerDetails[id] = { ...calc, gatePassed: true };
  });

  applyMutexPenalties(rawScores, wScores, pScores, meaningDerived);

  const results = ECO_ORDER.map((id) => {
    const def = ECO_DEFS[id];
    const detail = layerDetails[id] || {};
    const gatePassed = detail.gatePassed === true;
    const rawScore = gatePassed ? (rawScores[id] ?? 0) : 0;
    const displayScore = gatePassed ? mapToDisplayScore(rawScore) : 70;
    const confidence = gatePassed
      ? resolveConfidence(detail.tMatchScore, detail.wMatchScore, detail.pMatchScore, true)
      : resolveConfidence(0, 0, 0, false);

    return {
      ...def,
      rawScore,
      displayScore,
      score: displayScore,
      tier: resolveEcoTier(displayScore),
      gatePassed,
      tScore: detail.tScore,
      wScore: detail.wScore,
      pScore: detail.pScore,
      mScore: detail.mScore,
      tMatchScore: detail.tMatchScore ?? 0,
      wMatchScore: detail.wMatchScore ?? 0,
      pMatchScore: detail.pMatchScore ?? 0,
      mMatchScore: detail.mMatchScore ?? 0,
      tMatch: detail.tMatchScore ?? 0,
      wMatch: detail.wMatchScore ?? 0,
      pMatch: detail.pMatchScore ?? 0,
      mMatch: detail.mMatchScore ?? 0,
      tContribution: detail.tContribution ?? 0,
      confidenceLabel: confidence.label,
      confidenceColor: confidence.color,
      confidenceLevel: confidence.level
    };
  });

  return results.sort((a, b) => {
    if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
    if (b.gatePassed !== a.gatePassed) return (b.gatePassed ? 1 : 0) - (a.gatePassed ? 1 : 0);
    return (b.tScore ?? 0) - (a.tScore ?? 0);
  });
}

function resolveTalentType(rankedEco) {
  const primary = rankedEco.find((e) => e.gatePassed && e.rawScore > 0) || rankedEco[0];
  const secondary = rankedEco.find((e) => e.id !== primary?.id && e.gatePassed && e.rawScore > 0);
  if (!primary?.id) {
    return { name: '—', definition: '完成四层测评后可推导人才类型。', directions: [] };
  }
  const key = [primary.id, secondary?.id].filter(Boolean).sort().join('+');
  if (COMPOSITE_TYPES[key]) return { ...COMPOSITE_TYPES[key], composite: true };
  return { ...TALENT_TYPES[primary.id], composite: false };
}

/** 六组验证数据（可在控制台调用 DnaReportEco.runValidationTests()） */
function runValidationTests() {
  const baseT = { T1: 8, T2: 9, T3: 8, T4: 6, T5: 7, T6: 8, T7: 8, T8: 7 };
  const baseP = { O: 7, C: 7, E: 7, A: 7, N: 7 };
  const baseM = { growth: 7, cognitive: 7, system: 7, independent: 7, practical: 7, longterm: 7 };

  const mkVectors = (overrides) => {
    const wRaw = { meaning: { score: 0, max: 16 }, belonging: { score: 0, max: 16 },
      autonomy: { score: 0, max: 16 }, competence: { score: 0, max: 16 },
      exploration: { score: 0, max: 16 } };
    Object.entries(overrides.w || {}).forEach(([k, v]) => {
      const key = W_FIELD_ALIASES[k] || k;
      wRaw[key] = { score: v, max: 16 };
    });
    const pRaw = {};
    Object.entries({ ...baseP, ...(overrides.p || {}) }).forEach(([k, v]) => {
      pRaw[k] = { score: v, max: 10 };
    });
    return {
      t: { ...baseT, ...(overrides.t || {}) },
      p: pRaw,
      w: wRaw,
      m: Object.fromEntries(Object.entries({ ...baseM, ...(overrides.m || {}) }).map(([k, v]) => [k, { score: v * 1.2, max: 12 }]))
    };
  };

  const tests = [];

  // 验证一
  const v1w = normalizeWScores({ meaning: { score: 13, max: 16 } }, null);
  const v1p = normalizePScores({ A: { score: 5, max: 10 } });
  const v1m = deriveMeaningScores(v1w, v1p);
  const v1rank = computeEcosystemScores(mkVectors({ w: { meaning: 13, belonging: 0, autonomy: 0 }, p: { A: 5 } }));
  const v1primary = v1rank.find((e) => e.gatePassed && e.rawScore > 0);
  tests.push({
    name: '验证一：个人使命型意义',
    pass: v1m.personalMissionMeaning && !v1m.altruisticMeaning && v1primary?.id !== 'Helper',
    detail: { meaningDerived: v1m, primary: v1primary?.id }
  });

  // 验证二
  const v2m = deriveMeaningScores(
    normalizeWScores({ meaning: { score: 13, max: 16 }, belonging: { score: 0, max: 16 } }, null),
    normalizePScores({ A: { score: 8, max: 10 } })
  );
  const v2rank = computeEcosystemScores(mkVectors({ w: { meaning: 13, belonging: 0 }, p: { A: 8 } }));
  const v2helper = v2rank.find((e) => e.id === 'Helper');
  tests.push({
    name: '验证二：利他意义型',
    pass: v2m.altruisticMeaning && v2helper?.gatePassed,
    detail: { altruisticMeaning: v2m.altruisticMeaning, helperPassed: v2helper?.gatePassed }
  });

  // 验证三：Guardian 高，Creator autonomy 中等
  const v3rank = computeEcosystemScores(mkVectors({
    t: { T2: 9.5, T6: 6.5, T7: 7, T1: 7, T3: 7, T5: 7, T8: 6 },
    w: { meaning: 15, autonomy: 6, competence: 12, belonging: 3, curiosity: 5 },
    p: { C: 9.5, N: 8.5, A: 5, O: 6, E: 5 },
    m: { longterm: 9, system: 8, cognitive: 7, growth: 6, independent: 6, practical: 6 }
  }));
  const v3top2 = v3rank.filter((e) => e.gatePassed).slice(0, 2).map((e) => e.id);
  const v3creatorRank = v3rank.filter((e) => e.gatePassed).findIndex((e) => e.id === 'Creator');
  tests.push({
    name: '验证三：Guardian/Creator 互斥张力',
    pass: v3top2.includes('Guardian') && v3creatorRank >= 2,
    detail: { top2: v3top2, creatorRank: v3creatorRank + 1 }
  });

  // 验证四：负责任的创新者
  const v4rank = computeEcosystemScores(mkVectors({
    t: { T1: 9, T2: 9, T3: 9, T7: 9, T6: 7 },
    w: { autonomy: 14, meaning: 12, competence: 10, curiosity: 8, belonging: 5 },
    p: { C: 9, N: 8, O: 8, A: 5 }
  }));
  const v4g = v4rank.find((e) => e.id === 'Guardian');
  const v4c = v4rank.find((e) => e.id === 'Creator');
  tests.push({
    name: '验证四：负责任的创新者双生态保留',
    pass: v4g?.gatePassed && v4c?.gatePassed && v4g.rawScore > 0 && v4c.rawScore > 0,
    detail: { guardian: v4g?.rawScore, creator: v4c?.rawScore }
  });

  // 验证五：Explorer/Organizer 接近
  const v5t = normalizeTScores({ T2: 9, T6: 9, T7: 8, T8: 7, T1: 7, T3: 7, T5: 6 });
  const v5p = normalizePScores(Object.fromEntries(
    Object.entries({ O: 7, C: 8, E: 7, A: 7, N: 7 }).map(([k, v]) => [k, { score: v, max: 10 }])
  ));
  const v5w = normalizeWScores({
    exploration: { score: 12, max: 16 },
    autonomy: { score: 11, max: 16 },
    competence: { score: 10, max: 16 },
    meaning: { score: 8, max: 16 },
    belonging: { score: 8, max: 16 }
  }, null);
  const v5m = normalizeMScores({}, null);
  const v5meaning = deriveMeaningScores(v5w, v5p);
  const v5before = {};
  ['Explorer', 'Organizer'].forEach((id) => {
    const ctx = { t: v5t, w: v5w, p: v5p, m: v5m, meaning: v5meaning };
    if (passesHardGate(id, ctx)) {
      v5before[id] = calculateEcologyScore(buildEcologyCalc(id), v5t, v5p, v5w, v5m, v5meaning).rawScore;
    }
  });
  const v5after = { ...v5before };
  applyMutexPenalties(v5after, v5w, v5p, v5meaning);
  const v5gapBefore = Math.abs((v5before.Explorer || 0) - (v5before.Organizer || 0));
  const v5gapAfter = Math.abs((v5after.Explorer || 0) - (v5after.Organizer || 0));
  tests.push({
    name: '验证五：Explorer/Organizer 互斥修正',
    pass: v5gapBefore < 5 && v5gapAfter > v5gapBefore,
    detail: { gapBefore: round1(v5gapBefore), gapAfter: round1(v5gapAfter), before: v5before, after: v5after }
  });

  // 验证六：Helper/Solver
  const v6rank = computeEcosystemScores(mkVectors({
    t: { T2: 9.5, T3: 9, T6: 8, T7: 8, T1: 6.5, T5: 6.5, T8: 6.5 },
    w: { belonging: 14, competence: 9, meaning: 13, autonomy: 7, curiosity: 5 },
    p: { A: 8, C: 6.5, N: 7, O: 6, E: 6 },
    m: { system: 9, growth: 7, practical: 8, cognitive: 7, independent: 6, longterm: 7 }
  }));
  const v6w = normalizeWScores({
    belonging: { score: 14, max: 16 },
    competence: { score: 9, max: 16 },
    meaning: { score: 13, max: 16 }
  }, null);
  const v6p = normalizePScores({ A: { score: 8, max: 10 }, C: { score: 6.5, max: 10 }, N: { score: 7, max: 10 } });
  const v6m = deriveMeaningScores(v6w, v6p);
  const v6top3 = v6rank.filter((e) => e.gatePassed).slice(0, 3).map((e) => e.id);
  const v6snap = {};
  ['Helper', 'Solver'].forEach((id) => {
    const ctx = {
      t: normalizeTScores({ T2: 9.5, T3: 9, T6: 8, T7: 8 }),
      w: v6w, p: v6p, m: normalizeMScores({}, null), meaning: v6m
    };
    if (passesHardGate(id, ctx)) {
      v6snap[id] = calculateEcologyScore(buildEcologyCalc(id), ctx.t, ctx.p, ctx.w, ctx.m, v6m).rawScore;
    }
  });
  const v6after = { ...v6snap };
  applyMutexPenalties(v6after, v6w, v6p, v6m);
  tests.push({
    name: '验证六：Helper/Solver 互斥（Solver 额外×0.9）',
    pass: v6m.altruisticMeaning &&
      v6top3.includes('Helper') && v6top3.includes('Solver') &&
      (v6after.Solver ?? 0) < (v6snap.Solver ?? 0),
    detail: { top3: v6top3, solverBefore: v6snap.Solver, solverAfter: v6after.Solver }
  });

  return tests;
}

if (typeof window !== 'undefined') {
  window.DnaReportEco = {
    ECO_DEFS,
    ECO_ORDER,
    ECOLOGY_W_RULES,
    ECOLOGY_T_MAX,
    FAMILY_M,
    LAYER_WEIGHTS,
    T_BASE_CAP,
    HIGH,
    LOW,
    computeEcologyTMax,
    buildEcologyCalc,
    deriveMeaningScores,
    buildWForRules,
    passesHardGate,
    applyMutexPenalties,
    calculateEcologyScore,
    mapToDisplayScore,
    resolveEcoTier,
    resolveConfidence,
    normalizeTScores,
    normalizePScores,
    normalizeWScores,
    normalizeMScores,
    computeEcosystemScores,
    resolveTalentType,
    runValidationTests
  };
}
