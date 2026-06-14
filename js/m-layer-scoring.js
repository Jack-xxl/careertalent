/**
 * M层单选题计分（A=3 B=2 C=1 D=0，每维度4题满分12分）
 */
'use strict';

function calcMChoiceScores(mBank, mAnswers) {
  const dims = mBank.dimensions || {};
  const maxPer = (mBank.scoring && mBank.scoring.max_per_dimension) || 12;
  const scores = {};
  Object.keys(dims).forEach((k) => { scores[k] = 0; });

  (mBank.questions || []).forEach((q) => {
    const code = mAnswers[q.id];
    if (!code) return;
    const opt = (q.options || []).find((o) => o.code === code);
    if (!opt) return;
    const dim = q.dimension;
    if (dim) scores[dim] = (scores[dim] || 0) + (Number(opt.score) || 0);
  });

  const dimensions = {};
  const ranked = [];
  Object.keys(dims).forEach((key) => {
    const score = scores[key] || 0;
    const percentage = Math.round((score / maxPer) * 100);
    dimensions[key] = {
      name: dims[key],
      score,
      max: maxPer,
      percentage: Math.min(100, Math.max(0, percentage))
    };
    ranked.push({ key, ...dimensions[key] });
  });

  ranked.sort((a, b) => b.percentage - a.percentage || b.score - a.score);
  const { dominant_modes, auxiliary_mode } = resolveMDisplayModes(ranked);

  return {
    version: 'M_choice_v1',
    dimensions,
    dominant_modes,
    auxiliary_mode,
    completedAt: new Date().toISOString()
  };
}

/** 同分并列第一均标主导；次高分（第三名起算）标辅助 */
function resolveMDisplayModes(ranked) {
  if (!ranked.length) return { dominant_modes: [], auxiliary_mode: null };
  const top = ranked[0];
  const dominant_modes = ranked
    .filter((d) => d.percentage === top.percentage && d.score === top.score)
    .map((d) => ({ key: d.key, name: d.name, percentage: d.percentage }));
  let auxiliary_mode = null;
  for (const d of ranked) {
    if (d.percentage < top.percentage || d.score < top.score) {
      auxiliary_mode = { key: d.key, name: d.name, percentage: d.percentage };
      break;
    }
  }
  return { dominant_modes, auxiliary_mode };
}

/** 映射到旧 M 层维度（0-10）供综合报告兼容 */
function mapMChoiceToLegacyNormalized(mDrive) {
  const d = mDrive?.dimensions || {};
  const pct = (k) => (d[k]?.percentage || 0) / 10;
  return {
    GM: pct('growth'),
    CR: pct('reconstruction'),
    ST: Math.max(pct('systems'), pct('longterm') * 0.5),
    VR: pct('validation'),
    AC: pct('independence'),
    EB: pct('longterm')
  };
}

const M_DIM_ORDER = [
  'growth', 'reconstruction', 'systems', 'independence', 'validation', 'longterm'
];

function buildRadarSvg(mDrive, size) {
  const dims = mDrive.dimensions || {};
  const dimKeys = M_DIM_ORDER.filter((k) => dims[k]);
  if (!dimKeys.length) return '';
  const n = dimKeys.length;
  const s = size || 280;
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

  let svg = `<svg viewBox="0 0 ${s} ${s}" width="100%" max-width="${s}px" xmlns="http://www.w3.org/2000/svg">`;

  levels.forEach((lv) => {
    const pts = dimKeys.map((_, i) => pt(i, lv).join(',')).join(' ');
    svg += `<polygon points="${pts}" fill="none" stroke="rgba(148,163,184,0.2)" stroke-width="1"/>`;
  });

  dimKeys.forEach((_, i) => {
    const [x, y] = pt(i, 1);
    svg += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(148,163,184,0.15)" stroke-width="1"/>`;
  });

  const dataPts = dimKeys.map((k, i) => {
    const d = dims[k];
    const pct = d ? (Number(d.score) || 0) / (Number(d.max) || 12) : 0;
    return pt(i, pct).join(',');
  }).join(' ');
  svg += `<polygon points="${dataPts}" fill="rgba(102,126,234,0.35)" stroke="#a78bfa" stroke-width="2"/>`;

  dimKeys.forEach((k, i) => {
    const d = dims[k];
    const score = d ? Number(d.score) || 0 : 0;
    const max = d ? Number(d.max) || 12 : 12;
    const pct = score / max;
    const pctLabel = d?.percentage != null ? d.percentage : Math.round(pct * 100);
    const [x, y] = pt(i, pct);
    svg += `<circle cx="${x}" cy="${y}" r="4" fill="#c4b5fd"/>`;
    const [lx, ly] = pt(i, 1.22);
    const name = d?.name || k;
    svg += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-size="11">${name}</text>`;
    svg += `<text x="${lx}" y="${ly + 14}" text-anchor="middle" fill="#a78bfa" font-size="10">${pctLabel}%</text>`;
  });

  svg += '</svg>';
  return svg;
}

if (typeof window !== 'undefined') {
  window.MLayerScoring = {
    calcMChoiceScores,
    mapMChoiceToLegacyNormalized,
    buildRadarSvg,
    resolveMDisplayModes,
    M_DIM_ORDER
  };
}
