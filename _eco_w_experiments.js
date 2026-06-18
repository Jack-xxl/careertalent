/**
 * 生态意图边界实验 A–S（V4.0 Builder ↔ Guardian）
 * 运行：node _eco_w_experiments.js
 */
const fs = require('fs');
const vm = require('vm');

function loadEco() {
  const ctx = { window: {}, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync('js/dna-report-eco.js', 'utf8'), ctx);
  return ctx.window.DnaReportEco;
}

const D = loadEco();

const BASE = {
  t: {
    T1_language: 7.5, T2_logic: 9.5, T3_spatial: 6.5, T4_music: 7.0,
    T5_bodily: 6.5, T6_interpersonal: 10.0, T7_intrapersonal: 9.5, T8_naturalist: 7.0
  },
  p: {
    O: { score: 8.7, max: 10 }, C: { score: 7.7, max: 10 },
    E: { score: 8.7, max: 10 }, A: { score: 9.0, max: 10 },
    N: { score: 3.5, max: 10 }
  },
  m: {
    growth: { score: 8.4, max: 12 }, cognitive: { score: 8.4, max: 12 },
    system: { score: 9.6, max: 12 }, independent: { score: 8.4, max: 12 },
    practical: { score: 8.4, max: 12 }, longterm: { score: 9.6, max: 12 }
  },
  mDrive: {
    scores: {
      growth: 7.0, cognitive: 7.0, system: 9.2, independent: 10,
      practical: 7.0, longterm: 9.2
    }
  }
};

const BASELINE_W = { autonomy: 9.7, meaning: 5.9, exploration: 4.7, competence: 4.4, belonging: 0.3 };
const W_E = { autonomy: 8.0, meaning: 7.0, exploration: 5.0, competence: 5.0, belonging: 4.0 };
const W_F = { autonomy: 5.0, meaning: 6.0, exploration: 3.0, competence: 7.0, belonging: 9.0 };
const W_G = { autonomy: 3.0, meaning: 9.0, exploration: 2.0, competence: 4.0, belonging: 9.0 };
const W_H = { autonomy: 9.5, meaning: 6.0, exploration: 7.0, competence: 6.0, belonging: 1.5 };
const W_I = { autonomy: 5.0, meaning: 8.0, exploration: 4.0, competence: 5.0, belonging: 8.0 };
const W_J = { autonomy: 4.0, meaning: 4.0, exploration: 9.5, competence: 2.0, belonging: 3.0 };
const W_K = { autonomy: 4.0, meaning: 4.0, exploration: 2.0, competence: 9.0, belonging: 3.0 };
const W_L = { autonomy: 5.0, meaning: 4.0, exploration: 6.0, competence: 4.0, belonging: 3.0 };
const W_M = { autonomy: 7.0, meaning: 3.0, exploration: 10.0, competence: 1.0, belonging: 2.0 };
const W_N = { autonomy: 3.0, meaning: 4.0, exploration: 1.0, competence: 10.0, belonging: 2.0 };
const W_O = { autonomy: 3, meaning: 4, curiosity: 2, competence: 9, belonging: 3 };
const W_P = { autonomy: 3, meaning: 7, curiosity: 2, competence: 4, belonging: 6 };
const W_Q = { autonomy: 5, meaning: 6, curiosity: 3, competence: 8, belonging: 5 };
const W_R = { autonomy: 4, meaning: 5, curiosity: 2, competence: 10, belonging: 3 };
const W_S = { autonomy: 3, meaning: 8, curiosity: 2, competence: 4, belonging: 6 };

/** 实验 O/R 局部变量：仅用于 builderIntent 展示与 T 深拷贝补丁，严禁写入生产代码 */
const TBodyKinesthetic_exp = 8.5;

/**
 * 实验 T 层深拷贝补丁（隔离高逻辑/高人际样本对 B/G 边界的干扰）
 * 严禁写入 js/dna-report-eco.js / public/js/dna-report-eco.js
 */
const T_PATCH_O = { T5_bodily: TBodyKinesthetic_exp, T2_logic: 6.4 };
const T_PATCH_R = { T5_bodily: TBodyKinesthetic_exp, T2_logic: 6.4, T6_interpersonal: 6.5, T1_language: 6.4 };
const T_PATCH_P = { T6_interpersonal: 6.5 };
const T_PATCH_Q = { T5_bodily: 10, T6_interpersonal: 6.5, T2_logic: 7, T3_spatial: 6, T1_language: 6.4 };
const T_PATCH_S = { T6_interpersonal: 6.5 };

function mkW(scores10) {
  const exploration = scores10.exploration ?? scores10.curiosity ?? 0;
  const wDrive = { scores: { ...scores10, exploration, curiosity: exploration } };
  const w = {};
  Object.entries(scores10).forEach(([k, v]) => {
    w[k] = { score: v, max: 10, normalized: v };
  });
  if (!w.exploration) w.exploration = { score: exploration, max: 10, normalized: exploration };
  return { w, wDrive };
}

function buildVectors(wScores, opts = {}) {
  const vectors = { ...BASE, ...mkW(wScores) };
  const tPatch = { ...(opts.tPatch || {}) };
  if (opts.tBodyKinesthetic != null) {
    tPatch.T5_bodily = opts.tBodyKinesthetic;
  }
  if (Object.keys(tPatch).length > 0) {
    vectors.t = JSON.parse(JSON.stringify(BASE.t));
    Object.assign(vectors.t, tPatch);
  }
  return vectors;
}

function rankByRaw(wScores, opts = {}) {
  return D.computeEcosystemScores(buildVectors(wScores, opts))
    .filter((e) => e.gatePassed)
    .sort((a, b) => b.rawScore - a.rawScore);
}

function getRaw(wScores, id, opts = {}) {
  return rankByRaw(wScores, opts).find((e) => e.id === id)?.rawScore ?? 0;
}

function isValidIntent(v) {
  return typeof v === 'number' && !Number.isNaN(v) && v >= 0 && v <= 10 && Number.isFinite(v);
}

function getNormalizedLayers(wScores, opts = {}) {
  const vectors = buildVectors(wScores, opts);
  return {
    T: D.normalizeTScores(vectors.t),
    P: D.normalizePScores(vectors.p),
    M: D.normalizeMScores(vectors.m, vectors.mDrive),
    W: D.normalizeWScores(vectors.w, vectors.wDrive)
  };
}

function printFieldAudit() {
  const T = D.normalizeTScores(BASE.t);
  const P = D.normalizePScores(BASE.p);
  const M = D.normalizeMScores(BASE.m, BASE.mDrive);
  const W = D.normalizeWScores(mkW(BASELINE_W).w, mkW(BASELINE_W).wDrive);

  console.log('=== 第一步：T / P / M / W 字段结构确认 ===\n');
  console.log('T Layer Keys:', Object.keys(T));
  console.log('T Layer:', T);
  console.log('P Layer Keys:', Object.keys(P));
  console.log('P Layer:', P);
  console.log('M Layer Keys:', Object.keys(M));
  console.log('M Layer:', M);
  console.log('W Layer Keys:', Object.keys(W));
  console.log('W Layer:', W);
  console.log('');

  const tBody = D.computeTBodyKinesthetic(T);
  const pEs = D.computePEmotionalStability(P);
  console.log('字段映射确认:');
  console.log(`  M.practical = ${M.practical}`);
  console.log(`  M.system = ${M.system}`);
  console.log(`  M.longterm = ${M.longterm}`);
  console.log(`  P.conscientiousness = ${P.conscientiousness}`);
  console.log(`  P.emotionalStability = ${P.emotionalStability} (N不稳定性取反: 10-${P.neuroticism})`);
  console.log(`  T.bodyKinesthetic → T5_bodily = ${T.T5_bodily} (computeTBodyKinesthetic=${tBody})`);
  console.log(`  T7_intrapersonal = ${T.T7_intrapersonal}`);
  console.log(`  T8_naturalist = ${T.T8_naturalist}`);
  console.log('');

  const required = [
    ['M.practical', M.practical], ['M.system', M.system], ['M.longterm', M.longterm],
    ['P.conscientiousness', P.conscientiousness], ['P.emotionalStability', pEs],
    ['T.bodyKinesthetic', tBody]
  ];
  const bad = required.filter(([, v]) => v == null || Number.isNaN(v) || !Number.isFinite(v));
  if (bad.length) {
    console.log('⚠ 字段映射异常:', bad.map(([k]) => k).join(', '));
    process.exit(1);
  }
  console.log('字段映射：全部有效\n');
}

function printIntentLine(wScores, opts = {}) {
  const layers = getNormalizedLayers(wScores, opts);
  const { T, P, M, W } = layers;
  const TBodyKinesthetic_exp = opts.tBodyKinesthetic ?? null;

  const ci = D.computeCreatorIntent(W, M, T);
  const oi = D.computeOrganizerIntent(W, P, M);
  const ii = D.computeInfluencerIntent(W, P, M, T);
  const ei = D.computeExplorerIntent(W, M, T);
  const si = D.computeSolverIntent(W, P, M, T);
  const bi = D.computeBuilderIntent(W, P, M, T, TBodyKinesthetic_exp);
  const gi = D.computeGuardianIntent(W, P, M);
  const cOn = D.isCreatorIntentActive(W, M, T);

  console.log(
    `  creatorIntent=${ci} organizerIntent=${oi} influencerIntent=${ii} | C↔I: Creator=${cOn ? '↑' : '—'} Influencer=${ii >= 8 ? '↑' : '—'}`
  );
  console.log(`  explorerIntent=${ei} solverIntent=${si} | E↔S: Explorer=${ei >= 8 ? '↑' : '—'} Solver=${si >= 8 ? '↑' : '—'}`);
  console.log(`  builderIntent=${bi} guardianIntent=${gi} | B↔G: Builder=${bi >= 8 ? '↑' : '—'} Guardian=${gi >= 8 ? '↑' : '—'}`);
  console.log({ builderIntent: bi, guardianIntent: gi });

  return { bi, gi, M, W, P, T };
}

function printExperiment(label, wScores, expect, opts = {}) {
  const ranked = rankByRaw(wScores, opts);
  const top = ranked.slice(0, 3);
  console.log(label);
  if (expect) console.log(`  预期：${expect}`);
  printIntentLine(wScores, opts);
  top.forEach((e, i) => {
    const disp = D.mapToDisplayScore(e.rawScore);
    console.log(`  ${['第一', '第二', '第三'][i]}生态：${e.id} raw=${e.rawScore} display=${disp}`);
  });
  if (top.length < 3) console.log(`  （仅 ${top.length} 个生态通过硬门槛）`);
  console.log('');
  return ranked;
}

function printFullRanking(label, wScores, opts = {}) {
  const ranked = rankByRaw(wScores, opts);
  console.log(`${label} 全排序：${ranked.map((e) => `${e.id}(${e.rawScore})`).join(' > ') || '（无生态通过硬门槛）'}`);
}

printFieldAudit();

console.log('=== 生态实验 A–S（rawScore 排序）===\n');

console.log('--- 已冻结边界 A–F ---\n');
printExperiment('基准（真实 W）', BASELINE_W);
printExperiment('实验A：W 全部 10', { autonomy: 10, meaning: 10, exploration: 10, competence: 10, belonging: 10 });
printExperiment('实验B：纯自主', { autonomy: 10, meaning: 0, exploration: 0, competence: 0, belonging: 0 });
printExperiment('实验C：纯归属', { autonomy: 0, meaning: 0, exploration: 0, competence: 0, belonging: 10 });
printExperiment('实验D：Organizer 画像', { autonomy: 3, meaning: 5, exploration: 2, competence: 4, belonging: 10 });
printExperiment('实验E：创始人/创业者', W_E);
printExperiment('实验F：运营CEO/校长', W_F);

console.log('--- Creator ↔ Influencer 边界 G–I ---\n');
printExperiment('实验G：传播者/演说家', W_G, 'Influencer > Creator');
printExperiment('实验H：工匠/发明者', W_H, 'Creator 第一');
printExperiment('实验I：表达连接型', W_I, 'Influencer > Creator');

console.log('--- Explorer ↔ Solver 边界 J–N ---\n');
const rankJ = printExperiment('实验J：纯探索者', W_J, 'Explorer 第一');
const rankK = printExperiment('实验K：纯解题者', W_K, 'Solver 第一');
const rankL = printExperiment('实验L：好奇 vs 胜任仲裁', W_L, 'curiosity > competence → Explorer');
const rankM = printExperiment('实验M：强探索画像', W_M, 'Explorer 明显领先');
const rankN = printExperiment('实验N：强解题画像', W_N, 'Solver 明显领先');

console.log('--- Builder ↔ Guardian 边界 O–S ---\n');
const rankO = printExperiment('实验O：纯实践执行型', W_O, 'Builder 第一', { tPatch: T_PATCH_O, tBodyKinesthetic: TBodyKinesthetic_exp });
const rankP = printExperiment('实验P：纯守护型', W_P, 'Guardian 第一', { tPatch: T_PATCH_P });
const rankQ = printExperiment('实验Q：Builder + Guardian 双高', W_Q, 'M.practical < M.system → Guardian 优先', { tPatch: T_PATCH_Q });
const rankR = printExperiment('实验R：强Builder', W_R, 'Builder 明显领先', { tPatch: T_PATCH_R, tBodyKinesthetic: TBodyKinesthetic_exp });
const rankS = printExperiment('实验S：强Guardian', W_S, 'Guardian 明显领先', { tPatch: T_PATCH_S });

console.log('=== A–S 全排序摘要 ===\n');
[
  ['基准', BASELINE_W, {}], ['A', { autonomy: 10, meaning: 10, exploration: 10, competence: 10, belonging: 10 }, {}],
  ['B', { autonomy: 10, meaning: 0, exploration: 0, competence: 0, belonging: 0 }, {}],
  ['C', { autonomy: 0, meaning: 0, exploration: 0, competence: 0, belonging: 10 }, {}],
  ['D', { autonomy: 3, meaning: 5, exploration: 2, competence: 4, belonging: 10 }, {}],
  ['E', W_E, {}], ['F', W_F, {}], ['G', W_G, {}], ['H', W_H, {}], ['I', W_I, {}],
  ['J', W_J, {}], ['K', W_K, {}], ['L', W_L, {}], ['M', W_M, {}], ['N', W_N, {}],
  ['O', W_O, { tPatch: T_PATCH_O, tBodyKinesthetic: TBodyKinesthetic_exp }],
  ['P', W_P, { tPatch: T_PATCH_P }], ['Q', W_Q, { tPatch: T_PATCH_Q }],
  ['R', W_R, { tPatch: T_PATCH_R, tBodyKinesthetic: TBodyKinesthetic_exp }],
  ['S', W_S, { tPatch: T_PATCH_S }]
].forEach(([label, w, opts]) => printFullRanking(`实验${label}`, w, opts));
console.log('');

const m = D.normalizeMScores(BASE.m, BASE.mDrive);
const builderLeadR = getRaw(W_R, 'Builder', { tPatch: T_PATCH_R, tBodyKinesthetic: TBodyKinesthetic_exp }) -
  Math.max(
    getRaw(W_R, 'Guardian', { tPatch: T_PATCH_R, tBodyKinesthetic: TBodyKinesthetic_exp }),
    getRaw(W_R, 'Solver', { tPatch: T_PATCH_R, tBodyKinesthetic: TBodyKinesthetic_exp }),
    getRaw(W_R, 'Influencer', { tPatch: T_PATCH_R, tBodyKinesthetic: TBodyKinesthetic_exp })
  );
const guardianLeadS = getRaw(W_S, 'Guardian', { tPatch: T_PATCH_S }) -
  Math.max(getRaw(W_S, 'Builder', { tPatch: T_PATCH_S }), getRaw(W_S, 'Organizer', { tPatch: T_PATCH_S }));
const qBuilder = getRaw(W_Q, 'Builder', { tPatch: T_PATCH_Q });
const qGuardian = getRaw(W_Q, 'Guardian', { tPatch: T_PATCH_Q });
const qArbitrationOk = m.practical < m.system ? qGuardian > qBuilder : qBuilder > qGuardian;

const layersO = getNormalizedLayers(W_O, { tPatch: T_PATCH_O, tBodyKinesthetic: TBodyKinesthetic_exp });
const biO = D.computeBuilderIntent(layersO.W, layersO.P, layersO.M, layersO.T, TBodyKinesthetic_exp);
const giP = D.computeGuardianIntent(D.normalizeWScores(mkW(W_P).w, mkW(W_P).wDrive), D.normalizePScores(BASE.p), m);

console.log('=== 验证摘要 ===');
const checks = [
  { name: 'B Creator 第一', pass: rankByRaw({ autonomy: 10, meaning: 0, exploration: 0, competence: 0, belonging: 0 })[0]?.id === 'Creator' },
  { name: 'C Helper 第一', pass: rankByRaw({ autonomy: 0, meaning: 0, exploration: 0, competence: 0, belonging: 10 })[0]?.id === 'Helper' },
  { name: 'D Organizer 第一', pass: rankByRaw({ autonomy: 3, meaning: 5, exploration: 2, competence: 4, belonging: 10 })[0]?.id === 'Organizer' },
  { name: 'E Creator 第一', pass: rankByRaw(W_E)[0]?.id === 'Creator' },
  { name: 'F Organizer > Creator', pass: getRaw(W_F, 'Organizer') > getRaw(W_F, 'Creator') },
  { name: 'G Influencer > Creator', pass: getRaw(W_G, 'Influencer') > getRaw(W_G, 'Creator') },
  { name: 'G Influencer 前三', pass: rankByRaw(W_G).slice(0, 3).some((e) => e.id === 'Influencer') },
  { name: 'H Creator > Influencer', pass: getRaw(W_H, 'Creator') > getRaw(W_H, 'Influencer') },
  { name: 'H Creator 第一', pass: rankByRaw(W_H)[0]?.id === 'Creator' },
  { name: 'I Influencer > Creator', pass: getRaw(W_I, 'Influencer') > getRaw(W_I, 'Creator') },
  { name: 'J Explorer 第一', pass: rankJ[0]?.id === 'Explorer' },
  { name: 'K Solver 第一', pass: rankK[0]?.id === 'Solver' },
  { name: 'L curiosity/competence 仲裁', pass: (W_L.exploration > W_L.competence ? rankL[0]?.id === 'Explorer' : rankL[0]?.id === 'Solver') },
  { name: 'M Explorer 明显领先', pass: getRaw(W_M, 'Explorer') - getRaw(W_M, 'Solver') >= 3 },
  { name: 'N Solver 明显领先', pass: getRaw(W_N, 'Solver') - getRaw(W_N, 'Explorer') >= 3 },
  { name: 'builderIntent 正常计算', pass: isValidIntent(biO) },
  { name: 'guardianIntent 正常计算', pass: isValidIntent(giP) },
  { name: 'O Builder 第一', pass: rankO[0]?.id === 'Builder' },
  { name: 'P Guardian 第一', pass: rankP[0]?.id === 'Guardian' },
  { name: 'Q M.practical/M.system 仲裁', pass: qArbitrationOk && qGuardian > 0 && qBuilder > 0 },
  { name: 'R Builder 明显领先', pass: builderLeadR >= 3 },
  { name: 'S Guardian 明显领先', pass: guardianLeadS >= 3 },
  { name: 'Builder displayScore 正常', pass: rankO[0] && D.mapToDisplayScore(rankO[0].rawScore) >= 70 && D.mapToDisplayScore(rankO[0].rawScore) <= 95 },
  { name: 'Guardian displayScore 正常', pass: rankP[0] && D.mapToDisplayScore(rankP[0].rawScore) >= 70 && D.mapToDisplayScore(rankP[0].rawScore) <= 95 }
];
checks.forEach((c) => console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.name}`));
console.log(`\n合计：${checks.filter((c) => c.pass).length}/${checks.length} 通过`);

const intentBad = [biO, giP].some((v) => !isValidIntent(v));
if (intentBad) {
  console.log('\n⚠ Intent 异常 — 停止实验，优先修复字段映射');
  process.exit(1);
}

console.log('\n=== 补丁隔离检查 ===');
const prodFiles = ['js/dna-report-eco.js', 'public/js/dna-report-eco.js'];
let patchLeak = false;
prodFiles.forEach((f) => {
  const content = fs.readFileSync(f, 'utf8');
  const hasHardcode = /TBodyKinesthetic\s*=\s*8\.5|bodyKinesthetic\s*=\s*8\.5/.test(content);
  console.log(`${f}: TBodyKinesthetic=8.5 硬编码 ${hasHardcode ? '存在 ⚠' : '不存在 ✓'}`);
  if (hasHardcode) patchLeak = true;
});
const expContent = fs.readFileSync('_eco_w_experiments.js', 'utf8');
const expHasPatch = expContent.includes('TBodyKinesthetic_exp = 8.5');
console.log(`_eco_w_experiments.js: 实验补丁 ${expHasPatch ? '仅局部变量 ✓' : '缺失 ⚠'}`);
if (patchLeak) process.exit(1);
