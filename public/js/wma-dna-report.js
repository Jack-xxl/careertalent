/**
 * TalentAI 人才DNA报告 — 九部分完整呈现
 * 定位：量体裁衣的尺寸单，呈现当前能力参数
 */
'use strict';

const TALENT_QUOTES = {
  T1: '语言与表达是这个孩子最自然的优势领域',
  T2: '这个孩子天然倾向于理解规律，而不是记住答案',
  T3: '空间与结构是这个孩子最自然的思维语言',
  T4: '音乐与美感是这个孩子理解和表达世界的重要方式',
  T5: '这个孩子更容易通过实践与行动展现能力',
  T6: '理解人与建立关系是这个孩子最自然的天赋',
  T7: '这个孩子拥有清晰认识自己的罕见能力',
  T8: '自然系统与规律是这个孩子最敏锐的感知领域'
};

const T_DIM_META = {
  T1_language: { code: 'T1', label: '语言智能', desc: 'T1语言：在语言表达与理解维度表现突出' },
  T2_logic: { code: 'T2', label: '逻辑智能', desc: 'T2逻辑：在逻辑分析与推理维度表现突出' },
  T3_spatial: { code: 'T3', label: '空间智能', desc: 'T3空间：在空间构建与视觉维度表现突出' },
  T4_music: { code: 'T4', label: '音乐智能', desc: 'T4音乐：在音乐感知与表达维度表现突出' },
  T5_bodily: { code: 'T5', label: '身体智能', desc: 'T5身体：在身体协调与动手维度表现突出' },
  T6_interpersonal: { code: 'T6', label: '人际智能', desc: 'T6人际：在人际感知与连接维度表现突出' },
  T7_intrapersonal: { code: 'T7', label: '内省智能', desc: 'T7内省：在自我认知与内省维度表现突出' },
  T8_naturalist: { code: 'T8', label: '自然智能', desc: 'T8自然：在自然观察与系统维度表现突出' }
};

const P_DIM_META = {
  O: {
    label: '开放性', high: '探索新事物', low: '维持熟悉模式',
    highComment: '对新事物有天然好奇心，在变化中比在稳定中更容易激发能量，适合需要持续创新和探索的成长环境',
    lowComment: '倾向于在熟悉环境中发挥最佳状态，深耕已知领域的能力强，稳定性和专注度是重要优势'
  },
  C: {
    label: '尽责性', high: '系统规划', low: '灵活应变',
    highComment: '做事有条理有计划，能持续推进长期目标，自律性强是重要成长资产',
    lowComment: '思维灵活不拘一格，更适合弹性较大的创作型或探索型任务，在宽松环境中表现更好'
  },
  E: {
    label: '外向性', high: '群体互动', low: '独立专注',
    highComment: '在与他人互动中能量充沛，善于表达和建立连接，团队协作和对外沟通是自然优势',
    lowComment: '独立专注能力强，在安静环境中思维更清晰，深度思考和独立研究是重要优势'
  },
  A: {
    label: '宜人性', high: '协作配合', low: '独立判断',
    highComment: '共情能力强，善于理解他人感受，在需要团队合作和建立信任的场景中有天然优势',
    lowComment: '独立判断力强，不轻易受他人影响，在需要坚持原则和独立决策的场景中表现突出'
  },
  N: {
    label: '情绪稳定性', high: '稳定平和', low: '情感丰富',
    highComment: '压力承受能力强，面对挑战和不确定性时能保持冷静和持续输出',
    lowComment: '情感感知细腻丰富，对环境变化敏感，这种敏感性在创意和艺术领域往往是重要优势'
  }
};

/** W 层驱动力完整解释库（5 项全覆盖） */
const W_EXPLAIN_LIB = {
  autonomy: {
    label: '自主驱动',
    paragraphs: [
      '孩子更容易因为拥有选择权、掌控感和自主空间而产生行动力。',
      '相比被安排，更喜欢自己决定方向、方法和节奏。',
      '当拥有足够自主空间时，往往更容易保持投入。'
    ]
  },
  competence: {
    label: '胜任驱动',
    paragraphs: [
      '孩子更容易因为进步、掌握技能和完成挑战而产生行动力。',
      '当任务具有清晰目标和成长反馈时，更容易激发持续投入。'
    ]
  },
  belonging: {
    label: '归属驱动',
    paragraphs: [
      '孩子更容易因为被接纳、被理解、与他人共同完成事情而产生行动力。',
      '当处在支持性关系和团队环境中时，更容易保持积极状态。'
    ]
  },
  exploration: {
    label: '好奇驱动',
    paragraphs: [
      '孩子更容易因为好奇、新鲜感和发现未知而产生行动力。',
      '面对新问题、新领域或新机会时，通常更容易被激发。'
    ]
  },
  meaning: {
    label: '意义驱动',
    paragraphs: [
      '孩子更容易因为价值感、责任感和对他人产生积极影响而持续投入。',
      '当一件事让孩子感到“值得做”时，更容易长期坚持。'
    ]
  }
};

/** W 维度展示名：优先解释库，兼容 localStorage 中旧名称 */
function resolveWDimLabel(key, fallback) {
  const bank = typeof window !== 'undefined' ? window.__W_LAYER_BANK__ : null;
  return W_EXPLAIN_LIB[key]?.label || bank?.dimensions?.[key] || fallback || key;
}

/** P 层性格特征完整解释库（5 项全覆盖） */
const P_EXPLAIN_LIB = {
  O: {
    label: '开放性',
    paragraphs: [
      '孩子更愿意接触新事物、新观点和新方法。',
      '通常对变化、创意和探索具有更高接受度。'
    ]
  },
  C: {
    label: '尽责性',
    paragraphs: [
      '孩子更重视规则、责任、计划和完成质量。',
      '在需要持续投入、稳定执行和认真完成任务的环境中更容易表现稳定。'
    ]
  },
  E: {
    label: '外向性',
    paragraphs: [
      '孩子更容易通过表达、互动和外部反馈获得能量。',
      '在人际互动、团队活动和公开表达场景中通常更自然。'
    ]
  },
  A: {
    label: '宜人性',
    paragraphs: [
      '孩子更重视合作、理解他人和关系和谐。',
      '在团队协作、支持他人和建立信任方面通常更容易发挥优势。'
    ]
  },
  N: {
    label: '情绪稳定性',
    paragraphs: [
      '孩子面对压力、变化和挫折时更容易保持稳定。',
      '情绪稳定性较好时，更容易在长期任务中保持持续表现。'
    ]
  }
};

/** M 层思维模式完整解释库（6 项全覆盖） */
const M_EXPLAIN_LIB = {
  growth: {
    label: '成长思维',
    paragraphs: [
      '孩子更容易把困难和失败看作成长机会。',
      '面对问题时，更倾向于继续学习、调整方法和持续进步。'
    ]
  },
  reconstruction: {
    label: '认知重构',
    paragraphs: [
      '孩子更容易在旧方法失效时重新理解问题。',
      '面对新信息时，更愿意调整原有想法，形成新的认知框架。'
    ]
  },
  systems: {
    label: '系统思维',
    paragraphs: [
      '孩子更容易看到事物之间的结构、关系和长期影响。',
      '在复杂问题中，更倾向于理解整体，而不仅仅关注局部结果。'
    ]
  },
  independence: {
    label: '独立思考',
    paragraphs: [
      '孩子更容易形成自己的判断。',
      '面对权威、群体意见或热门观点时，不容易完全随波逐流。'
    ]
  },
  validation: {
    label: '实践验证',
    paragraphs: [
      '孩子更倾向于通过尝试、反馈和真实行动来判断方法是否有效。',
      '相比停留在想法层面，更愿意通过实践获得答案。'
    ]
  },
  longterm: {
    label: '长期主义',
    paragraphs: [
      '孩子更容易为了长期目标持续投入。',
      '即使短期看不到明显成果，也更可能保持耐心和积累。'
    ]
  }
};

const FOOTNOTES = {
  t: '以上为本次测评原始得分，分数反映当前状态，会随成长持续变化。',
  p: '以上为当前测评呈现的行为模式倾向，不代表固定性格，会随成长持续发展。',
  w: '驱动力反映孩子更容易从哪些方向获得持续动力，不代表其他方向不重要。',
  m: '思维模式反映当前学习偏好，不同模式各有优势，无高下之分。',
  type: '人才类型基于生态组合推导，反映当前数据结构的综合倾向。',
  eco: '关联度反映当前四层数据与该生态的匹配程度。现实中大多数人具备多个生态特质，关联度高的生态代表当前更自然的发展倾向，不代表唯一方向。'
};

function parseJSON(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch (e) { return null; }
}

function round1(n) {
  return Math.round(Number(n) * 10) / 10;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function barChars(score, max, width) {
  const w = width || 10;
  const filled = Math.max(0, Math.min(w, Math.round((score / max) * w)));
  return '█'.repeat(filled) + '░'.repeat(w - filled);
}

function progressBarHtml(score, max, colorClass) {
  const pct = Math.max(0, Math.min(100, (score / max) * 100));
  return `<div class="prog-bar"><div class="prog-fill ${colorClass || ''}" style="width:${pct}%"></div></div>`;
}

/** 取得分最高的前 N 项；第 N 名同分则全部保留 */
function pickTopByScore(items, topN) {
  if (!items?.length || topN <= 0) return [];
  const sorted = [...items].sort(
    (a, b) => b.score - a.score || String(a.key).localeCompare(String(b.key))
  );
  if (sorted.length <= topN) return sorted;
  const cutoff = sorted[topN - 1].score;
  return sorted.filter((item) => item.score >= cutoff);
}

function renderLayerInsights(topItems, explainLib, rankLabel) {
  if (!topItems.length) return '';
  return topItems.map((item, idx) => {
    const lib = explainLib[item.key];
    if (!lib) return '';
    const name = lib.label || item.label || item.key;
    const paras = (lib.paragraphs || []).map(
      (p) => `<p class="insight-para">${esc(p)}</p>`
    ).join('');
    return `
      <div class="indicator-insight">
        <p class="insight-rank">${esc(rankLabel)} ${idx + 1}</p>
        <h3 class="insight-name">${esc(name)}</h3>
        <div class="insight-body">${paras}</div>
      </div>`;
  }).join('');
}

function getV11Lib() {
  return window.DnaReportV11Lib || {};
}

/** 统一 10 分制展示：displayScore = (rawScore / max) * 10，保留 1 位小数 */
function toDisplayScore10(raw, max) {
  const r = Number(raw) || 0;
  const m = Number(max) || 10;
  return round1((r / m) * 10);
}

function mapItemsToDisplay10(items, rawMax) {
  return items.map((item) => {
    const display = toDisplayScore10(item.score, rawMax || item.max);
    return {
      ...item,
      rawScore: item.score,
      rawMax: rawMax || item.max,
      displayScore10: display,
      score: display,
      max: 10
    };
  }).sort((a, b) => b.displayScore10 - a.displayScore10);
}

function buildTRadarSvg(tItems, size) {
  const order = Object.keys(T_DIM_META);
  const items = order.map((key) => tItems.find((i) => i.key === key)).filter(Boolean);
  if (!items.length) return '';
  const n = items.length;
  const s = size || 300;
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.34;
  const levels = [0.25, 0.5, 0.75, 1];
  const angle = (i) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, ratio) => {
    const a = angle(i);
    const rr = r * ratio;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  let svg = `<svg viewBox="0 0 ${s} ${s}" width="100%" style="max-width:${s}px" xmlns="http://www.w3.org/2000/svg">`;
  levels.forEach((lv) => {
    const pts = items.map((_, i) => pt(i, lv).join(',')).join(' ');
    svg += `<polygon points="${pts}" fill="none" stroke="rgba(148,163,184,0.2)" stroke-width="1"/>`;
  });
  items.forEach((_, i) => {
    const [x, y] = pt(i, 1);
    svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(148,163,184,0.15)" stroke-width="1"/>`;
  });
  const dataPts = items.map((item, i) => {
    const pct = Math.max(0, Math.min(1, item.score / 10));
    return pt(i, pct).join(',');
  }).join(' ');
  svg += `<polygon points="${dataPts}" fill="rgba(59,130,246,0.3)" stroke="#60a5fa" stroke-width="2"/>`;
  items.forEach((item, i) => {
    const pct = Math.max(0, Math.min(1, item.score / 10));
    const [x, y] = pt(i, pct);
    svg += `<circle cx="${x}" cy="${y}" r="4" fill="#93c5fd"/>`;
    const [lx, ly] = pt(i, 1.2);
    const short = item.label.replace('智能', '');
    svg += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-size="10">${short}</text>`;
  });
  svg += '</svg>';
  return svg;
}

function renderFourLayerScoreList(items, barClass) {
  if (!items.length) return '<p class="layer-empty">暂无测评数据</p>';
  return items.map((item) => `
    <div class="fl-score-row">
      <span class="fl-score-name">${esc(item.label)}</span>
      ${progressBarHtml(item.score, 10, barClass)}
      <span class="fl-score-val">${Number(item.score).toFixed(1)}</span>
    </div>`).join('');
}

function renderFourLayerBlock(title, layerTag, chartHtml, items, barClass) {
  return `
    <div class="four-layer-block">
      <h3 class="four-layer-subtitle">${esc(title)} <span class="part-layer">${layerTag}</span></h3>
      ${chartHtml ? `<div class="four-layer-chart">${chartHtml}</div>` : ''}
      <div class="fl-score-list">${renderFourLayerScoreList(items, barClass)}</div>
    </div>`;
}

function renderFourLayerResultsSection(tItems, pItems, wData, mData) {
  const tSorted = [...tItems].sort((a, b) => b.score - a.score);
  const wDisplay = (wData.items || []).map((i) => ({
    ...i,
    score: Number(i.score) || 0,
    max: 10
  }));
  const pSorted = [...pItems].sort((a, b) => b.score - a.score);
  const mDisplay = mapItemsToDisplay10(mData.items || [], 12);
  const tRadar = buildTRadarSvg(tItems, 300);
  return `
    <section class="report-part part-four-layers" id="part-four-layers">
      <h2 class="part-title">四层测评结果</h2>
      <div class="part-body four-layer-body">
        ${renderFourLayerBlock('天赋能力结构', 'T层', tRadar, tSorted, 'fill-t')}
        ${renderFourLayerBlock('内在驱动力结构', 'W层', '', wDisplay, 'fill-w')}
        ${renderFourLayerBlock('性格行为结构', 'P层', '', pSorted, 'fill-p')}
        ${renderFourLayerBlock('思维学习结构', 'M层', '', mDisplay, 'fill-m')}
      </div>
    </section>`;
}

function isScoreBelow(item, ratio) {
  if (!item || item.max <= 0) return false;
  return item.score / item.max < ratio;
}

function buildReportContext(tItems, pItems, wData, mData, rankedEco) {
  const tByKey = Object.fromEntries(tItems.map((i) => [i.key, i]));
  const pByKey = Object.fromEntries(pItems.map((i) => [i.key, i]));
  const wByKey = Object.fromEntries((wData.items || []).map((i) => [i.key, i]));
  const mByKey = Object.fromEntries((mData.items || []).map((i) => [i.key, i]));
  return {
    tItems,
    pItems,
    wItems: wData.items || [],
    mItems: mData.items || [],
    wDrive: wData.drive,
    mDrive: mData.drive,
    rankedEco,
    primary: rankedEco[0] || null,
    secondary: rankedEco[1] || null,
    tertiary: rankedEco[2] || null,
    tByKey,
    pByKey,
    wByKey,
    mByKey,
    topT: pickTopByScore(tItems, 3),
    topW: pickTopByScore(wData.items || [], 3),
    topP: pickTopByScore(pItems, 2),
    topM: pickTopByScore(mData.items || [], 3)
  };
}

function itemDisplay10ForLayer(item, layer) {
  if (layer === 'W') return toDisplayScore10(item.score, 16);
  if (layer === 'M') return toDisplayScore10(item.score, 12);
  return round1(Number(item.score) || 0);
}

/** 主生态深度解析：仅解读 ≥7 分优势项；无优势项时展示相对较高 top2-3 */
function pickAdvantageInsights(allItems, layer, fallbackMax) {
  const withDisplay = (allItems || []).map((item) => {
    const display10 = itemDisplay10ForLayer(item, layer);
    return { ...item, display10, score: display10 };
  });
  const strong = withDisplay.filter((i) => i.display10 >= 7);
  if (strong.length) {
    return {
      mode: 'advantage',
      items: strong
        .sort((a, b) => b.display10 - a.display10)
        .map((i) => ({
          ...i,
          tier: i.display10 >= 8 ? 'core' : 'relative'
        }))
    };
  }
  return {
    mode: 'relative',
    items: pickTopByScore(withDisplay, fallbackMax || 3)
  };
}

function renderAdvantageInsightBlock(allItems, explainLib, layer, fallbackMax) {
  const picked = pickAdvantageInsights(allItems, layer, fallbackMax);
  if (!picked.items.length) return '<p class="layer-empty">暂无数据</p>';

  let html = picked.mode === 'relative'
    ? '<p class="v11-rel-label">【当前相对较高项】</p>'
    : '';

  html += picked.items.map((item) => {
    const lib = explainLib[item.key];
    if (!lib) return '';
    const name = lib.displayName || lib.label || item.label || item.key;
    const tierHtml = picked.mode === 'advantage'
      ? `<span class="v11-adv-tier v11-adv-tier-${item.tier}">${item.tier === 'core' ? '核心优势' : '相对优势'}</span>`
      : '';
    const mainText = (lib.paragraphs && lib.paragraphs[0]) || '';
    const extraHtml = (lib.paragraphs || []).slice(1).map(
      (p) => `<p class="v11-para">${esc(p)}</p>`
    ).join('');
    return `
      <div class="v11-scored-item v11-adv-scored-item">
        <div class="v11-scored-head">
          <span class="v11-scored-name">${esc(name)}</span>
          <span class="v11-scored-val">${esc(item.display10.toFixed(1))}</span>
        </div>
        ${tierHtml}
        <p class="v11-adv-main">${esc(mainText)}</p>
        ${extraHtml ? `<div class="v11-scored-body">${extraHtml}</div>` : ''}
      </div>`;
  }).join('');

  return html;
}

function buildGrowthAdvice(primaryId, wItems, mItems) {
  const lib = getV11Lib().GROWTH_ADVICE_LIB?.[primaryId];
  if (!lib) return [];
  const tips = [];
  const push = (arr) => {
    (arr || []).forEach((t) => { if (!tips.includes(t)) tips.push(t); });
  };
  push(lib.base);
  Object.entries(lib.lowM || {}).forEach(([key, arr]) => {
    const item = mItems.find((i) => i.key === key);
    if (isScoreBelow(item, 0.5)) push(arr);
  });
  Object.entries(lib.lowW || {}).forEach(([key, arr]) => {
    const item = wItems.find((i) => i.key === key);
    if (isScoreBelow(item, 0.5)) push(arr);
  });
  const marks = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧'];
  return tips.map((t, i) => {
    if (/^[①②③④⑤⑥⑦⑧]/.test(t)) return t;
    return `${marks[i] || `${i + 1}.`} ${t}`;
  });
}

function scorePct(score, max) {
  if (!max || max <= 0) return 0;
  return (Number(score) / Number(max)) * 100;
}

function isKeyGrowthTriggered(check, ctx) {
  if (check.composite) {
    const mDims = getV11Lib().KEY_GROWTH_M_DIMS || [];
    return mDims.some((key) => {
      const item = ctx.mByKey[key];
      if (!item) return false;
      return scorePct(item.score, item.max || 12) < 60;
    });
  }
  const score = check.getScore(ctx);
  const max = check.max || 10;
  if (check.thresholdPct != null) {
    return scorePct(score, max) < check.thresholdPct;
  }
  if (check.threshold != null) {
    return score < check.threshold;
  }
  return false;
}

function buildKeyReminders(ctx, maxCount) {
  const checks = getV11Lib().KEY_GROWTH_CHECKS || [];
  return checks
    .filter((c) => isKeyGrowthTriggered(c, ctx))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, maxCount);
}

function getEcoComplement(secondaryEco, primaryEco) {
  const v11 = getV11Lib().ECO_V11_LIB || {};
  const sec = v11[secondaryEco?.id];
  const priId = primaryEco?.id;
  if (!sec || !priId) return '';
  return sec.complementWith?.[priId]
    || `${sec.futureValue || ''} 与主生态「${primaryEco.nameZh}」相辅相成，拓展长期成长路径。`;
}

function renderPart1TalentType(ctx) {
  const primary = ctx.primary;
  if (!primary) {
    return `<section class="report-part v11-part" id="part-v11-1"><h2 class="part-title">你的人才类型</h2><p class="layer-empty">完成测评后可生成人才类型。</p></section>`;
  }
  const ecoLib = getV11Lib().ECO_V11_LIB?.[primary.id] || {};
  const display = primary.displayScore != null ? primary.displayScore : primary.score;
  return `
    <section class="report-part v11-part part-v11-type" id="part-v11-1">
      <h2 class="part-title">你的人才类型</h2>
      <div class="part-body">
        <p class="v11-type-name">${esc(ecoLib.talentTypeName || primary.nameZh)}</p>
        <p class="v11-eco-tag">${esc(primary.nameZh)} · ${esc(primary.tier || '')} · 关联度 ${display}</p>
        <p class="v11-type-summary">${esc(ecoLib.talentSummary || primary.tagline || '')}</p>
      </div>
    </section>`;
}

function renderPart2EcoRanking(ctx) {
  const { rankedEco } = ctx;
  const fixed = getV11Lib().V11_FIXED || {};
  if (!rankedEco.length) {
    return `<section class="report-part v11-part" id="part-v11-2"><h2 class="part-title">成长生态排序</h2><p class="layer-empty">暂无生态数据。</p></section>`;
  }
  const slots = [
    { label: '第一档生态（主生态）', eco: rankedEco[0] },
    { label: '第二档生态（副生态）', eco: rankedEco[1] },
    { label: '第三档生态', eco: rankedEco[2] }
  ];
  const cards = slots.filter((s) => s.eco).map((s) => {
    const e = s.eco;
    const display = e.displayScore != null ? e.displayScore : e.score;
    return `
      <div class="v11-eco-rank-card">
        <p class="v11-rank-label">${esc(s.label)}</p>
        <div class="v11-rank-head">
          <span class="v11-rank-name">${esc(e.nameZh)}</span>
          <span class="v11-rank-en">${esc(e.nameEn)}</span>
        </div>
        <div class="v11-rank-meta">
          <span class="v11-rank-tier">${esc(e.tier || '')}</span>
          <span class="v11-rank-score">关联度 ${display}</span>
          ${e.confidenceLabel ? `<span class="v11-rank-conf v11-conf-${esc(e.confidenceColor || 'gray')}">${esc(e.confidenceLabel)}</span>` : ''}
        </div>
      </div>`;
  }).join('');
  return `
    <section class="report-part v11-part part-v11-rank" id="part-v11-2">
      <h2 class="part-title">成长生态排序</h2>
      <div class="part-body">
        <div class="v11-eco-rank-list">${cards}</div>
        <p class="v11-note">${esc(fixed.ecoRankNote || '')}</p>
      </div>
    </section>`;
}

function renderPart3MainEcoDeep(ctx) {
  const primary = ctx.primary;
  if (!primary) {
    return `<section class="report-part v11-part" id="part-v11-3"><h2 class="part-title">主生态深度解析</h2><p class="layer-empty">暂无主生态数据。</p></section>`;
  }
  const ecoLib = getV11Lib().ECO_V11_LIB?.[primary.id] || {};
  const tLib = getV11Lib().T_EXPLAIN_LIB || {};
  return `
    <section class="report-part v11-part part-v11-deep" id="part-v11-3">
      <h2 class="part-title">主生态深度解析</h2>
      <div class="part-body">
        <h3 class="v11-primary-eco">${esc(primary.nameZh)}</h3>
        <p class="v11-one-line-def">${esc(ecoLib.oneLineDef || primary.tagline || '')}</p>
        <div class="v11-deep-block">
          <h4 class="v11-deep-title">天赋红利（T）</h4>
          <div class="v11-scored-list">${renderAdvantageInsightBlock(ctx.tItems, tLib, 'T', 3)}</div>
        </div>
        <div class="v11-deep-block">
          <h4 class="v11-deep-title">内在驱动力（W）</h4>
          <div class="v11-scored-list">${renderAdvantageInsightBlock(ctx.wItems, W_EXPLAIN_LIB, 'W', 3)}</div>
        </div>
        <div class="v11-deep-block">
          <h4 class="v11-deep-title">通关姿势（P）</h4>
          <div class="v11-scored-list">${renderAdvantageInsightBlock(ctx.pItems, P_EXPLAIN_LIB, 'P', 2)}</div>
        </div>
        <div class="v11-deep-block">
          <h4 class="v11-deep-title">成长能力（M）</h4>
          <div class="v11-scored-list">${renderAdvantageInsightBlock(ctx.mItems, M_EXPLAIN_LIB, 'M', 3)}</div>
        </div>
      </div>
    </section>`;
}

function renderPart4Advantages(ctx) {
  const lib = getV11Lib().ECO_V11_LIB?.[ctx.primary?.id];
  if (!lib?.advantages?.length) return '';
  const items = lib.advantages.map((a) => `<li class="v11-check-item">✓ ${esc(a)}</li>`).join('');
  return `
    <section class="report-part v11-part part-v11-adv" id="part-v11-4">
      <h2 class="part-title">优势表现</h2>
      <div class="part-body"><ul class="v11-check-list">${items}</ul></div>
    </section>`;
}

function renderPart5DarkSide(ctx) {
  const lib = getV11Lib().ECO_V11_LIB?.[ctx.primary?.id];
  if (!lib?.darkSide?.length) return '';
  const items = lib.darkSide.map((a) => `<li class="v11-bullet-item">• ${esc(a)}</li>`).join('');
  return `
    <section class="report-part v11-part part-v11-dark" id="part-v11-5">
      <h2 class="part-title">生态暗面（成长阵痛）</h2>
      <div class="part-body"><ul class="v11-bullet-list">${items}</ul></div>
    </section>`;
}

function renderPart6GrowthAdvice(ctx) {
  if (!ctx.primary) return '';
  const tips = buildGrowthAdvice(ctx.primary.id, ctx.wItems, ctx.mItems);
  if (!tips.length) return '';
  const items = tips.map((t) => `<li class="v11-advice-item">${esc(t)}</li>`).join('');
  return `
    <section class="report-part v11-part part-v11-advice" id="part-v11-6">
      <h2 class="part-title">成长建议</h2>
      <div class="part-body"><ul class="v11-advice-list">${items}</ul></div>
    </section>`;
}

function renderPart7SecondaryValue(ctx) {
  const { secondary, primary } = ctx;
  if (!secondary || !primary) return '';
  const lib = getV11Lib().ECO_V11_LIB?.[secondary.id] || {};
  return `
    <section class="report-part v11-part part-v11-sec" id="part-v11-7">
      <h2 class="part-title">副生态价值</h2>
      <div class="part-body">
        <h3 class="v11-sub-eco-name">${esc(secondary.nameZh)}</h3>
        <p class="v11-sub-def">${esc(lib.oneLineDef || secondary.tagline || '')}</p>
        <p class="v11-sub-future"><strong>未来价值：</strong>${esc(lib.futureValue || '')}</p>
        <p class="v11-sub-complement"><strong>互补价值：</strong>${esc(getEcoComplement(secondary, primary))}</p>
      </div>
    </section>`;
}

function renderPart8ThirdValue(ctx) {
  const { tertiary, primary } = ctx;
  if (!tertiary || !primary) return '';
  const lib = getV11Lib().ECO_V11_LIB?.[tertiary.id] || {};
  return `
    <section class="report-part v11-part part-v11-third" id="part-v11-8">
      <h2 class="part-title">第三生态价值</h2>
      <div class="part-body">
        <h3 class="v11-sub-eco-name">${esc(tertiary.nameZh)}</h3>
        <p class="v11-sub-def">${esc(lib.oneLineDef || tertiary.tagline || '')}</p>
        <p class="v11-sub-future"><strong>未来价值：</strong>${esc(lib.futureValue || '')}</p>
        <p class="v11-sub-complement"><strong>互补价值：</strong>${esc(getEcoComplement(tertiary, primary))}</p>
      </div>
    </section>`;
}

function renderPart9KeyReminders(ctx) {
  const fixed = getV11Lib().V11_FIXED || {};
  const reminders = buildKeyReminders(ctx, 4);
  const subtitle = fixed.keyReminderSubtitle || '';
  const stableMsg = fixed.keyReminderStable || '';

  let bodyHtml;
  if (!reminders.length) {
    bodyHtml = `<p class="v11-reminder-stable">${esc(stableMsg)}</p>`;
  } else {
    bodyHtml = reminders.map((r) => {
      const paras = (r.paragraphs || []).map(
        (p) => `<p class="v11-reminder-para">${esc(p)}</p>`
      ).join('');
      return `
        <div class="v11-reminder-block">
          <h4 class="v11-reminder-title">${esc(r.label)}</h4>
          ${paras}
        </div>`;
    }).join('');
  }

  return `
    <section class="report-part v11-part part-v11-remind" id="part-v11-9">
      <h2 class="part-title">关键成长能力提醒</h2>
      <p class="v11-reminder-sub">${esc(subtitle)}</p>
      <div class="part-body">${bodyHtml}</div>
    </section>`;
}

function renderPart10Navigation() {
  const fixed = getV11Lib().V11_FIXED || {};
  const nav = fixed.navigation || {};
  const phil = fixed.philosophy || {};
  const navParas = (nav.paragraphs || []).map((p) => `<p class="v11-nav-para">${esc(p)}</p>`).join('');
  const philItems = (phil.items || []).map((i) => `<span class="v11-phil-chip">${esc(i)}</span>`).join('');
  return `
    <section class="report-part v11-part part-v11-nav" id="part-v11-10">
      <h2 class="part-title">${esc(nav.title || '成长导航')}</h2>
      <div class="part-body v11-nav-body">${navParas}</div>
      <div class="part-body v11-philosophy">
        <h3 class="v11-phil-title">${esc(phil.title || 'TalentAI核心理念')}</h3>
        <div class="v11-phil-chips">${philItems}</div>
        <p class="v11-phil-close">${esc(phil.closing || '')}</p>
      </div>
    </section>`;
}

function renderV11Report(ctx, layerData) {
  const { tItems, pItems, wData, mData } = layerData || {};
  return [
    renderFourLayerResultsSection(tItems || [], pItems || [], wData || { items: [] }, mData || { items: [] }),
    renderPart1TalentType(ctx),
    renderPart2EcoRanking(ctx),
    renderPart3MainEcoDeep(ctx),
    renderPart4Advantages(ctx),
    renderPart5DarkSide(ctx),
    renderPart6GrowthAdvice(ctx),
    renderPart7SecondaryValue(ctx),
    renderPart8ThirdValue(ctx),
    renderPart9KeyReminders(ctx),
    renderPart10Navigation()
  ].join('');
}

function normalizeTScore(raw) {
  if (raw == null) return 0;
  if (typeof raw === 'object') {
    const v = raw.displayScore ?? raw.score ?? raw.value ?? 0;
    return normalizeTScore(v);
  }
  let n = Number(raw) || 0;
  if (n > 10) n = n / 10;
  return round1(n);
}

function loadTScores() {
  const raw = parseJSON(localStorage.getItem('talentai_t_scores'));
  const items = [];
  Object.keys(T_DIM_META).forEach((key) => {
    let score = 0;
    if (raw) {
      score = normalizeTScore(raw[key]);
      if (!score && raw[T_DIM_META[key].code]) {
        score = normalizeTScore(raw[T_DIM_META[key].code]);
      }
    }
    const meta = T_DIM_META[key];
    items.push({ key, code: meta.code, label: meta.label, desc: meta.desc, score, max: 10 });
  });
  items.sort((a, b) => b.score - a.score);
  return items;
}

function loadPRaw() {
  const raw =
    parseJSON(localStorage.getItem('talentai_p_dims')) ||
    parseJSON(localStorage.getItem('talentai_p_result'))?.dims ||
    {};
  return Object.keys(P_DIM_META).map((key) => {
    const rawPct = Number(raw[key]) || 50;
    const score = round1(rawPct / 10);
    const meta = P_DIM_META[key];
    const isHigh = rawPct >= 50;
    let comment = '';
    if (score >= 7) comment = meta.highComment;
    else if (score < 5) comment = meta.lowComment;
    return {
      key,
      label: meta.label,
      score,
      rawPct,
      max: 10,
      direction: isHigh ? meta.high : meta.low,
      comment
    };
  });
}

function loadPScores() {
  return loadPRaw().sort((a, b) => b.score - a.score);
}

function loadWAnswers() {
  const wma = parseJSON(localStorage.getItem('talentai_wma_answers'));
  return (
    wma?.W ||
    parseJSON(localStorage.getItem('talentai_w_drag_answers')) ||
    parseJSON(localStorage.getItem('talentai_w_scores'))?.rawAnswers ||
    parseJSON(localStorage.getItem('talentai_w_drive_result'))?.rawAnswers ||
    null
  );
}

function loadWDriveFull() {
  const stored =
    parseJSON(localStorage.getItem('talentai_w_scores')) ||
    parseJSON(localStorage.getItem('talentai_w_drive_result')) ||
    parseJSON(localStorage.getItem('talentai_wma_scores'))?.wDrive ||
    null;
  return normalizeWDrive(stored);
}

function normalizeWDrive(drive) {
  if (!drive) return drive;
  if (drive.scores) {
    Object.keys(drive.scores).forEach((k) => {
      if (!drive.dimensions) drive.dimensions = {};
      if (!drive.dimensions[k]) {
        drive.dimensions[k] = {
          name: resolveWDimLabel(k, drive.dimensions[k]?.name),
          normalized: drive.scores[k],
          score: drive.rawScores?.[k] ?? drive.scores[k],
          percentage: Math.round((drive.scores[k] || 0) * 10)
        };
      }
    });
  }
  if (drive?.dimensions) {
    Object.keys(drive.dimensions).forEach((k) => {
      drive.dimensions[k].name = resolveWDimLabel(k, drive.dimensions[k].name);
    });
  }
  if (drive.primary_drive?.key) {
    drive.primary_drive.name = resolveWDimLabel(drive.primary_drive.key, drive.primary_drive.name);
  }
  if (drive.secondary_drive?.key) {
    drive.secondary_drive.name = resolveWDimLabel(drive.secondary_drive.key, drive.secondary_drive.name);
  }
  const pDims =
    parseJSON(localStorage.getItem('talentai_p_dims')) ||
    parseJSON(localStorage.getItem('talentai_p_result'))?.dims ||
    {};
  if (window.WLayerScoring?.resolveMeaningDirection) {
    drive.meaning_direction = window.WLayerScoring.resolveMeaningDirection(
      drive,
      window.__W_LAYER_BANK__ || null,
      loadWAnswers(),
      pDims
    );
  }
  return drive;
}

async function loadWLayerBank() {
  if (window.__W_LAYER_BANK__) return window.__W_LAYER_BANK__;
  try {
    const resp = await fetch('data/w-layer-questions.json');
    window.__W_LAYER_BANK__ = await resp.json();
  } catch (e) {
    window.__W_LAYER_BANK__ = null;
  }
  return window.__W_LAYER_BANK__;
}

function loadMDriveFull() {
  const stored =
    parseJSON(localStorage.getItem('talentai_m_scores')) ||
    parseJSON(localStorage.getItem('talentai_m_drive_result')) ||
    parseJSON(localStorage.getItem('talentai_wma_scores'))?.mDrive ||
    null;
  const answers =
    parseJSON(localStorage.getItem('talentai_wma_answers'))?.M ||
    parseJSON(localStorage.getItem('talentai_m_choice_answers')) ||
    parseJSON(localStorage.getItem('talentai_m_answers')) ||
    stored?.rawAnswers ||
    null;
  if (answers && window.MLayerScoring && window.__M_LAYER_BANK__) {
    const recomputed = MLayerScoring.calcMChoiceScores(window.__M_LAYER_BANK__, answers);
    recomputed.rawAnswers = answers;
    return normalizeMDrive(recomputed);
  }
  return normalizeMDrive(stored);
}

function normalizeMDrive(drive) {
  if (!drive?.dimensions) return drive;
  const maxPer = 12;
  Object.keys(drive.dimensions).forEach((k) => {
    const d = drive.dimensions[k];
    const score = Number(d.score) || 0;
    d.max = maxPer;
    d.percentage = Math.round((score / maxPer) * 100);
  });
  if (window.MLayerScoring?.resolveMDisplayModes) {
    const ranked = Object.entries(drive.dimensions)
      .map(([key, d]) => ({ key, name: d.name, score: d.score, percentage: d.percentage }))
      .sort((a, b) => b.percentage - a.percentage || b.score - a.score);
    const modes = MLayerScoring.resolveMDisplayModes(ranked);
    drive.dominant_modes = modes.dominant_modes;
    drive.auxiliary_mode = modes.auxiliary_mode;
  }
  return drive;
}

async function loadMLayerBank() {
  if (window.__M_LAYER_BANK__) return window.__M_LAYER_BANK__;
  try {
    const resp = await fetch('data/m-layer-questions.json');
    window.__M_LAYER_BANK__ = await resp.json();
  } catch (e) {
    window.__M_LAYER_BANK__ = null;
  }
  return window.__M_LAYER_BANK__;
}

function wLevelTag(key, drive) {
  const levels = drive?.levels;
  if (levels?.core?.includes(key)) return { text: '核心', cls: 'tag-primary' };
  if (levels?.important?.includes(key)) return { text: '重要', cls: 'tag-secondary' };
  if (levels?.supporting?.includes(key)) return { text: '支撑', cls: 'tag-support' };
  if (levels?.weak?.includes(key)) return { text: '弱', cls: 'tag-weak' };
  if (key === drive?.primary_drive?.key) return { text: '主', cls: 'tag-primary' };
  if (key === drive?.secondary_drive?.key) return { text: '副', cls: 'tag-secondary' };
  return null;
}

function loadWScores(wDrive) {
  const drive = wDrive || loadWDriveFull();
  if (!drive?.scores && !drive?.dimensions) return { items: [], drive: null };

  const scoreMap = drive.scores || {};
  const dimKeys = Object.keys(scoreMap).length
    ? Object.keys(scoreMap).filter((k) => k !== 'curiosity')
    : Object.keys(drive.dimensions || {}).filter((k) => k !== 'curiosity');

  const items = dimKeys
    .map((key) => {
      const d = drive.dimensions?.[key] || {};
      const normalized = scoreMap[key] != null ? Number(scoreMap[key]) : Number(d.normalized ?? d.score) || 0;
      return {
        key,
        label: resolveWDimLabel(key, d.name),
        score: normalized,
        max: 10,
        rawScore: drive.rawScores?.[key] ?? d.rawScore ?? null,
        tag: wLevelTag(key, drive)
      };
    })
    .sort((a, b) => b.score - a.score);
  return { items, drive };
}

function loadMScores(mDrive) {
  const drive = mDrive || loadMDriveFull();
  if (!drive?.dimensions) return { items: [], drive: null };
  const dominantKeys = (drive.dominant_modes || []).map((d) => d.key);
  const auxiliaryKey = drive.auxiliary_mode?.key;
  const items = Object.entries(drive.dimensions)
    .map(([key, d]) => {
      let tag = null;
      if (dominantKeys.includes(key)) tag = { text: '主导', cls: 'tag-dominant' };
      else if (key === auxiliaryKey) tag = { text: '辅助', cls: 'tag-secondary' };
      return {
        key,
        label: d.name || key,
        score: Number(d.score) || 0,
        max: 12,
        tag
      };
    })
    .sort((a, b) => b.score - a.score);
  return { items, drive };
}

function getCompletionDate() {
  const keys = [
    'talentai_pwm_completed',
    'talentai_wma_completed_at',
    'talentai_m_choice_completed',
    'talentai_p_result'
  ];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && v !== '1') {
      const d = new Date(v);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
      }
    }
  }
  const pResult = parseJSON(localStorage.getItem('talentai_p_result'));
  if (pResult?.completedAt) {
    const d = new Date(pResult.completedAt);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  }
  return new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
}

function getNickname() {
  const keys = ['talentai_user_nickname', 'user_nickname', 'nickname'];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function getShareCardTitle(nickname) {
  return nickname ? `${nickname}的人才DNA参数` : '你的人才DNA参数';
}

function zoneForRank(rank) {
  if (rank <= 3) return { cls: 'zone-advantage', label: '优势区' };
  if (rank <= 6) return { cls: 'zone-balance', label: '平衡区' };
  return { cls: 'zone-growth', label: '成长区' };
}

function renderCollapseToggle(id) {
  return `<button type="button" class="collapse-toggle" data-target="detail-${id}" aria-expanded="false">查看各项得分 ↓</button>`;
}

function renderCollapsePanel(id, rowsHtml, footnote) {
  if (!rowsHtml) return '';
  return `
    ${renderCollapseToggle(id)}
    <div class="collapse-panel" id="detail-${id}">
      <div class="score-list">${rowsHtml}</div>
      <p class="layer-footnote">${footnote}</p>
    </div>`;
}

function renderScoreRows(items, opts) {
  opts = opts || {};
  return items.map((item) => {
    const tagHtml = item.tag
      ? `<span class="score-tag ${item.tag.cls}">${item.tag.text}</span>`
      : '';
    const confHtml = item.confidence && opts.showConfidence
      ? `<span class="score-conf">置信度 ${esc(item.confidence)}</span>`
      : '';
    const scoreText = opts.formatScore
      ? opts.formatScore(item)
      : `${item.score}/10`;
    return `
      <div class="score-row">
        <span class="score-name">${esc(item.label)}</span>
        ${progressBarHtml(item.score, item.max, opts.barClass)}
        <span class="score-val">${scoreText}</span>
        ${tagHtml}${confHtml}
      </div>`;
  }).join('');
}

function bindCollapses(root) {
  root.querySelectorAll('.collapse-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(btn.dataset.target);
      if (!panel) return;
      const willOpen = !panel.classList.contains('open');
      panel.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      btn.textContent = willOpen ? '收起 ↑' : '查看各项得分 ↓';
    });
  });
  root.querySelectorAll('[data-eco-more]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById('eco-more-panel');
      if (!panel) return;
      const open = !panel.classList.contains('open');
      panel.classList.toggle('open', open);
      btn.textContent = open ? '收起其余生态 ↑' : '展开其余 5 个生态 ↓';
    });
  });
}

function buildVectors(tItems, pItems, wDrive, mDrive) {
  const t = {};
  tItems.forEach((i) => { t[i.key] = i.score; });
  const p = {};
  pItems.forEach((i) => {
    p[i.key] = { score: i.score, max: 10, rawPct: i.rawPct != null ? i.rawPct : i.score * 10 };
  });
  const w = {};
  if (wDrive?.scores) {
    Object.entries(wDrive.scores).forEach(([k, v]) => {
      const key = k === 'curiosity' ? 'exploration' : k;
      w[key] = { score: Number(v), max: 10, normalized: Number(v) };
    });
  } else if (wDrive?.dimensions) {
    Object.entries(wDrive.dimensions).forEach(([k, d]) => {
      const normalized = d.normalized != null
        ? Number(d.normalized)
        : (Number(d.score) || 0) / ((Number(d.max) || 16) / 10);
      w[k] = { score: normalized, max: 10, normalized };
    });
  }
  const m = {};
  if (mDrive?.dimensions) {
    Object.entries(mDrive.dimensions).forEach(([k, d]) => {
      m[k] = { score: d.score, max: d.max || 12 };
    });
  }
  return {
    t, p, w, m, wDrive,
    wAnswers: loadWAnswers(),
    wBank: window.__W_LAYER_BANK__ || null
  };
}

function renderTRankSection(tItems) {
  const top = tItems[0];
  const quote = top && top.score > 0 ? TALENT_QUOTES[top.code] : TALENT_QUOTES.T2;

  const rankHtml = tItems.map((item, idx) => {
    const rank = idx + 1;
    const zone = zoneForRank(rank);
    return `
      <div class="t-rank-item ${zone.cls}">
        <div class="t-rank-head">
          <span class="t-rank-num">${rank}</span>
          <span class="t-rank-name">${esc(item.label)}</span>
          <span class="zone-tag ${zone.cls}">${zone.label}</span>
        </div>
        <p class="t-rank-desc">${esc(item.desc)}</p>
      </div>`;
  }).join('');

  const tRows = tItems.length
    ? renderScoreRows(tItems, { formatScore: (i) => `${i.score}/10`, barClass: 'fill-t' })
    : '';

  return `
    <section class="report-part part-t" id="part-t">
      <h2 class="part-title">天赋能力结构 <span class="part-layer">T层</span></h2>
      <div class="part-body">
        ${top && top.score > 0 ? `<blockquote class="talent-quote">「${esc(quote)}」</blockquote>` : ''}
        <div class="t-rank-list">${rankHtml || '<p class="layer-empty">暂无 T 层测评数据。</p>'}</div>
      </div>
      ${renderCollapsePanel('t', tRows, FOOTNOTES.t)}
    </section>`;
}

function renderPSection(pItems) {
  const pDirs = loadPRaw();
  const hasData = pDirs.some((i) => i.score > 0) || localStorage.getItem('talentai_p_completed') === '1';
  const topP = pickTopByScore(pDirs, 2);
  const insightHtml = hasData && topP.length
    ? `<div class="layer-insight-list">${renderLayerInsights(topP, P_EXPLAIN_LIB, '最高性格特征')}</div>`
    : '<p class="layer-empty">暂无 P 层测评数据。</p>';

  const pRows = hasData
    ? renderScoreRows(pItems, { formatScore: (i) => `${i.score}/10`, barClass: 'fill-p' })
    : '';

  return `
    <section class="report-part part-p" id="part-p">
      <h2 class="part-title">行为风格 <span class="part-layer">P层</span></h2>
      <div class="part-body">${insightHtml}</div>
      ${renderCollapsePanel('p', pRows, FOOTNOTES.p)}
    </section>`;
}

function renderWSection(wData) {
  const { items, drive } = wData;
  let summary = '';
  const metaBits = [];
  if (drive?.intensityStatus) {
    metaBits.push(`<p class="w-intensity-status">${esc(drive.intensityStatus)}</p>`);
  }
  if (drive?.archetypeLabel) {
    metaBits.push(`<p class="w-archetype-label"><span class="w-archetype-badge">${esc(drive.archetypeLabel)}</span></p>`);
  }
  if (drive?.scores && Object.keys(drive.scores).length) {
    const wRanked = Object.entries(drive.scores)
      .filter(([key]) => key !== 'curiosity')
      .map(([key, score]) => ({
        key,
        label: resolveWDimLabel(key, drive.dimensions?.[key]?.name),
        score: Number(score) || 0
      }));
    const topW = pickTopByScore(wRanked, 3);
    summary = `${metaBits.join('')}<div class="layer-insight-list">${renderLayerInsights(topW, W_EXPLAIN_LIB, '最高驱动力')}</div>`;
  } else if (drive?.dimensions && Object.keys(drive.dimensions).length) {
    const wRanked = Object.entries(drive.dimensions).map(([key, d]) => ({
      key,
      label: resolveWDimLabel(key, d.name),
      score: Number(d.normalized ?? d.score) || 0
    }));
    const topW = pickTopByScore(wRanked, 3);
    summary = `${metaBits.join('')}<div class="layer-insight-list">${renderLayerInsights(topW, W_EXPLAIN_LIB, '最高驱动力')}</div>`;
  } else if (items.length) {
    const topW = pickTopByScore(items, 3);
    summary = `${metaBits.join('')}<div class="layer-insight-list">${renderLayerInsights(topW, W_EXPLAIN_LIB, '最高驱动力')}</div>`;
  } else {
    summary = '<p class="layer-empty">暂无 W 层测评数据。</p>';
  }

  const wRows = items.length
    ? renderScoreRows(items, {
        formatScore: (i) => `${i.score}/10`,
        barClass: 'fill-w'
      })
    : '';

  return `
    <section class="report-part part-w" id="part-w">
      <h2 class="part-title">内在驱动力 <span class="part-layer">W层</span></h2>
      <div class="part-body">${summary}</div>
      ${renderCollapsePanel('w', wRows, FOOTNOTES.w)}
    </section>`;
}

function renderMSection(mData) {
  const { items, drive } = mData;
  let summary = '';
  if (drive?.dimensions && Object.keys(drive.dimensions).length) {
    const mRanked = Object.entries(drive.dimensions).map(([key, d]) => ({
      key,
      label: d.name || M_EXPLAIN_LIB[key]?.label || key,
      score: Number(d.score) || 0
    }));
    const topM = pickTopByScore(mRanked, 3);
    const radar = window.MLayerScoring?.buildRadarSvg
      ? MLayerScoring.buildRadarSvg(drive, 300)
      : '';
    summary = `
      <div class="layer-insight-list">${renderLayerInsights(topM, M_EXPLAIN_LIB, '最高思维模式')}</div>
      ${radar ? `<div class="radar-wrap">${radar}</div>` : ''}`;
  } else if (items.length) {
    const topM = pickTopByScore(items, 3);
    summary = `<div class="layer-insight-list">${renderLayerInsights(topM, M_EXPLAIN_LIB, '最高思维模式')}</div>`;
  } else {
    summary = '<p class="layer-empty">暂无 M 层测评数据。</p>';
  }

  const mRows = items.length
    ? renderScoreRows(items, { formatScore: (i) => `${i.score}/12`, barClass: 'fill-m' })
    : '';

  return `
    <section class="report-part part-m" id="part-m">
      <h2 class="part-title">成长能力 <span class="part-layer">M层</span></h2>
      <div class="part-body">${summary}</div>
      ${renderCollapsePanel('m', mRows, FOOTNOTES.m)}
    </section>`;
}

function renderTalentTypeSection(talentType) {
  const dirs = (talentType.directions || [])
    .map((d) => `<span class="dir-chip">${esc(d)}</span>`)
    .join('');
  return `
    <section class="report-part part-type" id="part-type">
      <h2 class="part-title">你的人才类型</h2>
      <div class="part-body">
        <p class="type-name">${esc(talentType.name)}</p>
        <p class="type-def">${esc(talentType.definition)}</p>
        <p class="type-subtitle">AI 时代关联度较高的 3 个发展方向</p>
        <div class="dir-chips">${dirs || '<span class="layer-empty">完成测评后可推导</span>'}</div>
      </div>
      <p class="layer-footnote part-footnote">${FOOTNOTES.type}</p>
    </section>`;
}

function renderEcoCard(eco, medal) {
  const fields = (eco.fields || []).map((f) => `<span class="eco-field">${esc(f)}</span>`).join('');
  const reps = (eco.representatives || []).join(' · ');
  const display = eco.displayScore != null ? eco.displayScore : eco.score;
  const tier = eco.tier || (window.DnaReportEco?.resolveEcoTier
    ? DnaReportEco.resolveEcoTier(display)
    : '');
  return `
    <div class="eco-card">
      <div class="eco-card-head">
        <span class="eco-medal">${medal}</span>
        <span class="eco-name">${esc(eco.nameZh)}</span>
        <span class="eco-en">${esc(eco.nameEn)}</span>
        <span class="eco-tier">${esc(tier)}</span>
        <span class="eco-score">关联度 ${display}</span>
        ${eco.confidenceLabel ? `<span class="eco-conf eco-conf-${esc(eco.confidenceColor || 'gray')}">${esc(eco.confidenceLabel)}</span>` : ''}
      </div>
      <p class="eco-tagline">${esc(eco.tagline)}</p>
      <div class="eco-fields">${fields}</div>
      <p class="eco-reps">代表人物：${esc(reps)}</p>
    </div>`;
}

function renderEcoSection(rankedEco) {
  if (!rankedEco.length) {
    return `
      <section class="report-part part-eco" id="part-eco">
        <h2 class="part-title">成长生态关联度</h2>
        <p class="layer-empty">完成四层测评后可计算生态关联度。</p>
      </section>`;
  }

  const medals = ['🥇 主生态', '🥈 副生态', '🥉 第三生态'];
  const top3 = rankedEco.slice(0, 3).map((e, i) => renderEcoCard(e, medals[i])).join('');
  const rest = rankedEco.slice(3).map((e) => renderEcoCard(e, '·')).join('');

  return `
    <section class="report-part part-eco" id="part-eco">
      <h2 class="part-title">成长生态关联度</h2>
      <div class="part-body">
        <div class="eco-top3">${top3}</div>
        ${rest ? `
          <button type="button" class="collapse-toggle eco-more-toggle" data-eco-more>展开其余 5 个生态 ↓</button>
          <div class="collapse-panel eco-more-panel" id="eco-more-panel">
            <div class="eco-rest">${rest}</div>
          </div>` : ''}
      </div>
      <p class="layer-footnote part-footnote">${FOOTNOTES.eco}</p>
    </section>`;
}

function renderAiDomainSection() {
  return `
    <section class="report-part part-ai" id="part-ai">
      <h2 class="part-title">AI 时代领域说明</h2>
      <div class="part-body about-text ai-static-text">
        <p>AI 正在渗透所有领域。当前测评呈现的是孩子的能力结构、驱动力和思维模式，这些底层参数在任何领域都适用。由于 AI 时代职业变化特别快，适合进入哪个生态细分领域，需要结合孩子的经历、家庭资源与所在城市、未来行业趋势变化，以及专业成长导师的综合判断。如果想根据各项测试参数，在 AI 时代下进行具体职业定位及成长路径规划，请联系专业成长老师。微信：<strong class="wechat-id">shfeducation</strong></p>
      </div>
    </section>`;
}

function renderShareSection(ctx) {
  const top3T = ctx.tItems.slice(0, 3).map((i) => i.label.replace('智能', '')).join(' · ');
  return `
    <section class="report-part part-share no-print-bar" id="part-share">
      <h2 class="part-title">保存与分享</h2>
      <div id="share-card" class="share-card">
        <p class="share-card-kicker">TalentAI 人才 DNA 报告</p>
        <h3 class="share-card-title">${esc(ctx.shareTitle)}</h3>
        <div class="share-card-grid">
          <div class="share-card-item"><span class="sci-label">天赋优势区</span>${esc(top3T || '—')}</div>
          <div class="share-card-item"><span class="sci-label">主驱动</span>${esc(ctx.primaryDrive || '—')}</div>
          <div class="share-card-item"><span class="sci-label">主导思维</span>${esc(ctx.dominantMode || '—')}</div>
          <div class="share-card-item"><span class="sci-label">关联度最高生态</span>${esc(ctx.topEco || '—')}</div>
        </div>
        <blockquote class="share-card-quote">「${esc(ctx.quote)}」</blockquote>
        <p class="share-card-brand">TalentAI 人才 DNA 报告</p>
      </div>
      <div class="share-actions" id="share-actions">
        <button type="button" class="share-btn" data-action="save-img">保存图片</button>
        <button type="button" class="share-btn" data-action="pdf">导出 PDF</button>
        <button type="button" class="share-btn share-btn-primary" data-action="link">生成专属链接</button>
      </div>
    </section>`;
}

function renderReport() {
  const tItems = loadTScores();
  const pItems = loadPScores();
  const wData = loadWScores();
  const mDrive = loadMDriveFull();
  const mData = loadMScores(mDrive);
  const dateStr = getCompletionDate();
  const nickname = getNickname();
  const shareTitle = getShareCardTitle(nickname);
  const quote = tItems[0]?.score > 0 ? TALENT_QUOTES[tItems[0].code] : TALENT_QUOTES.T2;

  const vectors = buildVectors(tItems, pItems, wData.drive, mData.drive);
  const rankedEco = window.DnaReportEco
    ? DnaReportEco.computeEcosystemScores(vectors)
    : [];
  const reportCtx = buildReportContext(tItems, pItems, wData, mData, rankedEco);

  const ctx = {
    tItems,
    nickname,
    shareTitle,
    quote,
    primaryDrive: wData.drive?.primary_drive
      ? resolveWDimLabel(wData.drive.primary_drive.key, wData.drive.primary_drive.name)
      : '',
    dominantMode: (mData.drive?.dominant_modes || []).map((d) => d.name).join(' · ') || '',
    topEco: rankedEco[0]
      ? `${rankedEco[0].nameZh} ${rankedEco[0].displayScore ?? rankedEco[0].score}`
      : ''
  };

  const root = document.getElementById('main-content');
  if (!root) return;

  root.innerHTML = `
    <header class="report-header">
      <h1 class="report-title">动态成长生态报告</h1>
      <p class="report-meta">TalentAI V1.1 · 四层深度测评 · ${esc(dateStr)}</p>
    </header>

    ${renderV11Report(reportCtx, { tItems, pItems, wData, mData })}
    ${renderShareSection(ctx)}
  `;

  bindCollapses(root);
  bindShareActions();
}

function loadScriptOnce(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function saveShareCardImage() {
  const card = document.getElementById('share-card');
  if (!card) return;
  try {
    await loadScriptOnce('js/vendor/html2canvas.min.js');
    const canvas = await html2canvas(card, {
      backgroundColor: '#0f172a',
      scale: 2,
      useCORS: true
    });
    const link = document.createElement('a');
    link.download = `TalentAI-DNA-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('分享卡片已保存');
  } catch (e) {
    toast('保存图片失败，请重试');
  }
}

function toast(msg) {
  let el = document.getElementById('dna-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'dna-toast';
    el.className = 'dna-toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3200);
}

function bindShareActions() {
  const root = document.getElementById('share-actions');
  if (!root) return;

  root.querySelector('[data-action="save-img"]')?.addEventListener('click', saveShareCardImage);

  root.querySelector('[data-action="pdf"]')?.addEventListener('click', async () => {
    if (window.ReportShare?.exportPdf) {
      ReportShare.mount({
        captureSelector: '#main-content',
        pagePath: location.pathname.split('/').pop() || 'wma-result.html',
        title: 'TalentAI 人才DNA报告'
      });
      await ReportShare.exportPdf();
    } else {
      toast('PDF 导出暂不可用');
    }
  });

  root.querySelector('[data-action="link"]')?.addEventListener('click', async () => {
    if (window.ReportShare?.generateShareLink) {
      ReportShare.mount({
        captureSelector: '#main-content',
        pagePath: location.pathname.split('/').pop() || 'wma-result.html',
        title: 'TalentAI 人才DNA报告'
      });
      await ReportShare.generateShareLink();
    } else {
      toast('链接生成暂不可用');
    }
  });
}

async function initDnaReport() {
  const loading = document.getElementById('loading');
  const main = document.getElementById('main-content');

  if (window.ReportShareRestore) {
    try {
      const ok = await ReportShareRestore.bootstrap();
      if (ReportShareRestore.isShareMode() && !ok) {
        if (loading) {
          loading.innerHTML = `<p>${esc(window.__TALENTAI_SHARE_ERROR__ || '专属链接无效或已过期')}</p>`;
        }
        return;
      }
    } catch (e) { /* ignore */ }
  }

  await Promise.all([loadMLayerBank(), loadWLayerBank()]);
  renderReport();

  if (loading) loading.style.display = 'none';
  if (main) main.style.display = 'block';
}

document.addEventListener('DOMContentLoaded', initDnaReport);

if (typeof window !== 'undefined') {
  window.TalentAIDnaReport = {
    renderReport,
    loadTScores,
    loadPScores,
    loadWScores,
    loadMScores
  };
}
