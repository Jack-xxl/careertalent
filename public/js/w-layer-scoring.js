/**
 * W层拖拽测评计分（slot1 +2 / slot2 +1，五维度 0-16 分，交叉印证置信度）
 */
'use strict';

/** 利他助人型意义：选意义向且侧重帮助他人/对他人产生价值（W01/W03/W05/W06） */
const MEANING_ALTRUISTIC_QS = { W01: 'C', W03: 'C', W05: 'C', W06: 'C' };
/** 规则守护型意义：选意义向且侧重内在认同/原则与长远目标（W02/W04/W07/W08） */
const MEANING_GUARDIAN_QS = { W02: 'C', W04: 'C', W07: 'C', W08: 'C' };

function scoreMeaningAnswerSignals(wBank, wAnswers) {
  let altruistic = 0;
  let guardian = 0;
  (wBank?.questions || []).forEach((q) => {
    const ans = wAnswers?.[q.id];
    if (!ans) return;
    const apply = (code, weight) => {
      const opt = (q.options || []).find((o) => o.code === code);
      if (!opt || opt.dimension !== 'meaning') return;
      if (MEANING_ALTRUISTIC_QS[q.id]) altruistic += weight;
      if (MEANING_GUARDIAN_QS[q.id]) guardian += weight;
    };
    if (ans.slot1) apply(ans.slot1, 2);
    if (ans.slot2) apply(ans.slot2, 1);
  });
  return { altruistic, guardian };
}

function isMeaningDriveHigh(wDrive) {
  const pk = wDrive?.primary_drive?.key;
  const sk = wDrive?.secondary_drive?.key;
  const meaningScore = wDrive?.dimensions?.meaning?.score || 0;
  return pk === 'meaning' || sk === 'meaning' || meaningScore >= 8;
}

function pScore10(pDims, key) {
  if (!pDims || pDims[key] == null) return null;
  return Number(pDims[key]) / 10;
}

/**
 * 意义驱动方向拆分 + P 层 Helper/Guardian 生态加权（互斥，不同时加权）
 * 利他助人型：意义高 + 宜人性≥7 → Helper ×1.4，Guardian ×1.0
 * 规则守护型：意义高 + 尽责性≥8 + 情绪稳定≥6 → Guardian ×1.4，Helper ×1.0
 * 宜人性≥8 → Helper 得分额外 ×1.2；归属驱动≤4 → Guardian 得分 ×0.8
 */
function resolveMeaningDirection(wDrive, wBank, wAnswers, pDims) {
  const meaningHigh = isMeaningDriveHigh(wDrive);
  const belongingScore = wDrive?.dimensions?.belonging?.score || 0;
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
    guardianBoost = 1.0;
  } else if (
    meaningHigh &&
    cScore != null && cScore >= 8 &&
    stabilityScore != null && stabilityScore >= 6
  ) {
    type = 'guardian';
    guardianBoost = 1.4;
    helperBoost = 1.0;
  }

  if (aScore != null && aScore >= 8) {
    helperAgreeablenessBoost = 1.2;
  }
  if (belongingScore <= 4) {
    guardianBelongingPenalty = 0.8;
  }

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

function calcWDragScores(wBank, wAnswers, pDims) {
  const scoring = wBank.scoring || { slot1_weight: 2, slot2_weight: 1, max_score_per_dimension: 16 };
  const dims = wBank.dimensions || {};
  const cv = wBank.cross_validation || {};
  const early = cv.early_questions || [];
  const late = cv.late_questions || [];
  const threshold = cv.variance_threshold != null ? cv.variance_threshold : 3;
  const maxPerDim = scoring.max_score_per_dimension || 16;
  const w1 = scoring.slot1_weight || 2;
  const w2 = scoring.slot2_weight || 1;

  const scores = {};
  const earlyScores = {};
  const lateScores = {};
  Object.keys(dims).forEach((k) => {
    scores[k] = 0;
    earlyScores[k] = 0;
    lateScores[k] = 0;
  });

  (wBank.questions || []).forEach((q) => {
    const ans = wAnswers[q.id];
    if (!ans || !ans.slot1 || !ans.slot2) return;

    const apply = (code, weight) => {
      const opt = (q.options || []).find((o) => o.code === code);
      if (!opt || !opt.dimension) return;
      const dim = opt.dimension;
      scores[dim] = (scores[dim] || 0) + weight;
      if (early.includes(q.id)) earlyScores[dim] = (earlyScores[dim] || 0) + weight;
      if (late.includes(q.id)) lateScores[dim] = (lateScores[dim] || 0) + weight;
    };

    apply(ans.slot1, w1);
    apply(ans.slot2, w2);
  });

  const dimensions = {};
  const ranked = [];

  Object.keys(dims).forEach((key) => {
    const score = scores[key] || 0;
    const percentage = Math.round((score / maxPerDim) * 100);
    const variance = Math.abs((earlyScores[key] || 0) - (lateScores[key] || 0));
    const confidence = variance > threshold ? '中' : '高';
    dimensions[key] = {
      name: dims[key],
      score,
      percentage: Math.min(100, Math.max(0, percentage)),
      confidence,
      variance,
      earlyScore: earlyScores[key] || 0,
      lateScore: lateScores[key] || 0
    };
    ranked.push({ key, ...dimensions[key] });
  });

  ranked.sort((a, b) => b.percentage - a.percentage || b.score - a.score);

  const primary = ranked[0] || null;
  const secondary = ranked[1] || null;

  return {
    version: 'W_drag_v1',
    dimensions,
    primary_drive: primary
      ? {
          key: primary.key,
          name: primary.name,
          percentage: primary.percentage,
          confidence: primary.confidence
        }
      : null,
    secondary_drive: secondary
      ? {
          key: secondary.key,
          name: secondary.name,
          percentage: secondary.percentage,
          confidence: secondary.confidence
        }
      : null,
    completedAt: new Date().toISOString()
  };
}

/** 映射到旧 W1-W7 尺度（0-10）供综合报告兼容 */
function mapWDragToLegacyNormalized(wDrive) {
  const d = wDrive?.dimensions || {};
  const pct = (k) => (d[k]?.percentage || 0) / 10;
  return {
    W1: pct('competence'),
    W2: 5,
    W3: pct('belonging'),
    W4: Math.max(pct('exploration'), pct('competence')),
    W5: pct('autonomy'),
    W6: pct('meaning'),
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

function buildDriveBar(percentage, length) {
  const len = length || 10;
  const filled = Math.round((percentage / 100) * len);
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
    isMeaningDriveHigh
  };
}
