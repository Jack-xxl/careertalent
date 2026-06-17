/**
 * W层五选项全排序计分（第1-5名：5/4/3/2/1 分，8题累计 raw 8-40，标准化 0-10）
 */
'use strict';

const W_DIM_KEYS = ['exploration', 'autonomy', 'meaning', 'competence', 'belonging'];
const RANK_WEIGHTS = [5, 4, 3, 2, 1];
const RAW_MIN = 8;
const RAW_MAX = 40;
const RAW_SPAN = RAW_MAX - RAW_MIN;

const MEANING_ALTRUISTIC_QS = { W01: 'C', W03: 'C', W05: 'C', W06: 'C' };
const MEANING_GUARDIAN_QS = { W02: 'C', W04: 'C', W07: 'C', W08: 'C' };

const ARCHETYPE_PAIRS = {
  'autonomy+meaning': '使命型创业者',
  'autonomy+exploration': '创新开拓者',
  'autonomy+competence': '成长型专家',
  'meaning+belonging': '助人型引导者',
  'competence+exploration': '研究型问题解决者',
  'competence+meaning': '责任型专家',
  'exploration+meaning': '知识型改变者'
};

function round1(n) {
  return Math.round(n * 10) / 10;
}

function clamp01(n) {
  return Math.max(0, Math.min(10, n));
}

function normalizeRawTo10(raw) {
  return round1(clamp01(((Number(raw) || 0) - RAW_MIN) / RAW_SPAN * 10));
}

function rankKeys() {
  return ['rank1', 'rank2', 'rank3', 'rank4', 'rank5'];
}

function isWRankAnswerComplete(ans) {
  if (!ans || typeof ans !== 'object') return false;
  return rankKeys().every((k) => !!ans[k]);
}

function getRankCodes(ans) {
  if (!isWRankAnswerComplete(ans)) return null;
  return rankKeys().map((k) => ans[k]);
}

function initDimRecord(dims) {
  const raw = {};
  const scores = {};
  Object.keys(dims || {}).forEach((k) => {
    raw[k] = 0;
    scores[k] = 0;
  });
  W_DIM_KEYS.forEach((k) => {
    if (!(k in raw)) raw[k] = 0;
    if (!(k in scores)) scores[k] = 0;
  });
  return { raw, scores };
}

function classifyDriveLevels(normalizedScores) {
  const sorted = Object.entries(normalizedScores)
    .map(([key, score]) => ({ key, score: Number(score) || 0 }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const maxScore = sorted[0]?.score ?? 0;
  const core = sorted.length ? [sorted[0].key] : [];
  if (sorted.length > 1 && maxScore - sorted[1].score <= 1.0) {
    core.push(sorted[1].key);
  }

  const important = [];
  const supporting = [];
  const weak = [];

  sorted.forEach((e) => {
    if (core.includes(e.key)) return;
    const gap = maxScore - e.score;
    if (gap > 0 && gap <= 2.5) important.push(e.key);
    else if (gap > 2.5 && gap <= 4.0) supporting.push(e.key);
    else if (gap > 4.0) weak.push(e.key);
  });

  return { core, important, supporting, weak, maxScore };
}

function resolveIntensityStatus(maxScore) {
  if (maxScore >= 8.0) return '强核心驱动力已稳定';
  if (maxScore >= 6.0) return '驱动力正在形成';
  return '驱动力结构较均衡，建议通过更多实践探索';
}

function pairKey(a, b) {
  return [a, b].sort().join('+');
}

function resolveArchetypeLabel(normalizedScores, levels) {
  const sorted = Object.entries(normalizedScores)
    .map(([key, score]) => ({ key, score: Number(score) || 0 }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  if (sorted.length < 2) return null;

  const top1 = sorted[0].key;
  const top2 = sorted[1].key;
  const eligible = new Set([...(levels.core || []), ...(levels.important || [])]);

  if (!eligible.has(top1) || !eligible.has(top2)) return null;

  return ARCHETYPE_PAIRS[pairKey(top1, top2)] || null;
}

function scoreMeaningAnswerSignals(wBank, wAnswers) {
  let altruistic = 0;
  let guardian = 0;
  (wBank?.questions || []).forEach((q) => {
    const ranks = getRankCodes(wAnswers?.[q.id]);
    if (!ranks) return;
    ranks.forEach((code, idx) => {
      const weight = RANK_WEIGHTS[idx];
      const opt = (q.options || []).find((o) => o.code === code);
      if (!opt || opt.dimension !== 'meaning') return;
      if (MEANING_ALTRUISTIC_QS[q.id]) altruistic += weight;
      if (MEANING_GUARDIAN_QS[q.id]) guardian += weight;
    });
  });
  return { altruistic, guardian };
}

function isMeaningDriveHigh(wDrive) {
  const meaningScore = wDrive?.scores?.meaning ?? 0;
  const inCore = (wDrive?.levels?.core || []).includes('meaning');
  return inCore || meaningScore >= 6;
}

function pScore10(pDims, key) {
  if (!pDims || pDims[key] == null) return null;
  return Number(pDims[key]) / 10;
}

function resolveMeaningDirection(wDrive, wBank, wAnswers, pDims) {
  const meaningHigh = isMeaningDriveHigh(wDrive);
  const belongingScore = wDrive?.scores?.belonging ?? wDrive?.dimensions?.belonging?.normalized ?? 0;
  const aScore = pScore10(pDims, 'A');
  const cScore = pScore10(pDims, 'C');
  const stabilityScore = pScore10(pDims, 'N');
  const signals = scoreMeaningAnswerSignals(wBank, wAnswers);

  let type = 'neutral';
  let helperBoost = 1.0;
  let guardianBoost = 1.0;
  let helperAgreeablenessBoost = 1.0;
  let guardianBelongingPenalty = 1.0;

  if (meaningHigh && aScore != null && aScore >= 7) {
    type = 'altruistic';
    helperBoost = 1.4;
  } else if (
    meaningHigh &&
    cScore != null && cScore >= 8 &&
    stabilityScore != null && stabilityScore >= 6
  ) {
    type = 'guardian';
    guardianBoost = 1.4;
  }

  if (aScore != null && aScore >= 8) helperAgreeablenessBoost = 1.2;
  if (belongingScore <= 4) guardianBelongingPenalty = 0.8;

  return {
    type,
    helperBoost,
    guardianBoost,
    helperAgreeablenessBoost,
    guardianBelongingPenalty,
    signals,
    meaningHigh,
    belongingScore,
    agreeableness: aScore,
    conscientiousness: cScore,
    emotionalStability: stabilityScore
  };
}

function buildLegacyDimensions(dims, scores, rawScores) {
  const dimensions = {};
  Object.keys(dims).forEach((key) => {
    const normalized = scores[key] ?? 0;
    dimensions[key] = {
      name: dims[key],
      score: rawScores[key] ?? 0,
      rawScore: rawScores[key] ?? 0,
      normalized,
      percentage: Math.round(normalized * 10)
    };
  });
  return dimensions;
}

function calcWDragScores(wBank, wAnswers, pDims) {
  void pDims;
  const dims = wBank?.dimensions || {};
  const { raw: rawScores, scores: normalizedScratch } = initDimRecord(dims);

  (wBank?.questions || []).forEach((q) => {
    const ranks = getRankCodes(wAnswers?.[q.id]);
    if (!ranks) return;
    ranks.forEach((code, idx) => {
      const opt = (q.options || []).find((o) => o.code === code);
      if (!opt?.dimension) return;
      const dim = opt.dimension;
      rawScores[dim] = (rawScores[dim] || 0) + RANK_WEIGHTS[idx];
    });
  });

  const scores = {};
  Object.keys(dims).forEach((key) => {
    scores[key] = normalizeRawTo10(rawScores[key] || 0);
    normalizedScratch[key] = scores[key];
  });

  const levelsMeta = classifyDriveLevels(scores);
  const levels = {
    core: levelsMeta.core,
    important: levelsMeta.important,
    supporting: levelsMeta.supporting,
    weak: levelsMeta.weak
  };
  const intensityStatus = resolveIntensityStatus(levelsMeta.maxScore);
  const archetypeLabel = resolveArchetypeLabel(scores, levels);

  if (scores.exploration != null) scores.curiosity = scores.exploration;

  const dimensions = buildLegacyDimensions(dims, scores, rawScores);
  const ranked = Object.entries(scores)
    .filter(([key]) => key !== 'curiosity')
    .map(([key, score]) => ({ key, name: dims[key], score, normalized: score }))
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));

  const primary = ranked[0] || null;
  const secondary = ranked[1] || null;

  return {
    version: 'W_rank_v2',
    scores,
    rawScores,
    levels,
    intensityStatus,
    archetypeLabel,
    dimensions,
    primary_drive: primary
      ? { key: primary.key, name: primary.name, score: primary.score, normalized: primary.score }
      : null,
    secondary_drive: secondary
      ? { key: secondary.key, name: secondary.name, score: secondary.score, normalized: secondary.score }
      : null,
    completedAt: new Date().toISOString()
  };
}

function mapWDragToLegacyNormalized(wDrive) {
  const s = wDrive?.scores || {};
  return {
    W1: s.competence || 0,
    W2: 5,
    W3: s.belonging || 0,
    W4: Math.max(s.exploration || 0, s.competence || 0),
    W5: s.autonomy || 0,
    W6: s.meaning || 0,
    W7: 5
  };
}

const W_DIM_CANONICAL = {
  exploration: '好奇驱动',
  autonomy: '自主驱动',
  meaning: '意义驱动',
  competence: '胜任驱动',
  belonging: '归属驱动'
};

function resolveWDimLabel(key, bank, fallback) {
  return bank?.dimensions?.[key] || W_DIM_CANONICAL[key] || fallback || key;
}

function buildDriveBar(normalizedScore, length) {
  const len = length || 10;
  const pct = Math.max(0, Math.min(100, (Number(normalizedScore) || 0) * 10));
  const filled = Math.round((pct / 100) * len);
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

if (typeof window !== 'undefined') {
  window.WLayerScoring = {
    calcWDragScores,
    mapWDragToLegacyNormalized,
    buildDriveBar,
    resolveWDimLabel,
    resolveMeaningDirection,
    scoreMeaningAnswerSignals,
    isMeaningDriveHigh,
    isWRankAnswerComplete,
    normalizeRawTo10,
    classifyDriveLevels,
    resolveArchetypeLabel,
    RANK_WEIGHTS,
    W_DIM_KEYS
  };
}
