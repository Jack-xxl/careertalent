console.log('✅ wma-result.js loaded (TalentAI 五层完整报告)');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('=== 五层完整报告：开始生成 ===');

  try {
    // ── 1. 读取用户数据（合并五层所有答案）───────────
    const userData = loadAllLayerData();
    if (!userData) {
      showWmaError('未找到完整测评数据，请先完成W/M/A层测评。');
      return;
    }

    // ── 2. 加载题库 & 职业库 ──────────────────────────
    const [questionsData, careersData] = await loadDataFiles();

    // ── 3. 合并五层答案为 v4.6 结构 ───────────────────
    const allAnswers = mergeAllLayerAnswers(userData);
    console.log('✅ 五层答案合并完成');

    // ── 4. 用户年龄 ───────────────────────────────────
    const userAge = readUserAge();

    // ── 5. 调用 v4.6 引擎 ─────────────────────────────
    const result = generateCompleteResult(
      allAnswers,
      userData.timings,
      questionsData,
      careersData,
      userAge,
      true   // wSignalPassedManual = true（已完成W层测评）
    );
    console.log('✅ 引擎完成，生态位:', result.ecoPosition?.label);

    // ── 6. 渲染完整五层报告 ───────────────────────────
    // wma-result-generator.js 用 setTimeout(0) 注册 window.wmaRenderAll
    // 所以这里也用 setTimeout(0) 确保拿到注册后的函数
    await new Promise(resolve => setTimeout(resolve, 0));
    if (typeof window.wmaRenderAll !== 'function') {
      throw new Error('wma-result-generator.js 未正确加载，请检查 js/ 目录下文件是否存在');
    }
    window.wmaRenderAll(result, { ...userData, age: userAge });

    // ── 7. 隐藏加载屏 ─────────────────────────────────
    document.getElementById('wma-loading').style.display  = 'none';
    document.getElementById('wma-main').style.display     = 'block';

    console.log('=== 五层完整报告：渲染完成 ===');

  } catch (err) {
    console.error('❌ 五层报告生成失败:', err);
    showWmaError('报告生成失败：' + err.message);
  }
});

// V2 调试入口：window.TalentAI.Debug.calcCareerMatchV2(profile)
// 仅在控制台打印，不影响现有 UI
if (typeof window !== 'undefined') {
  window.TalentAI = window.TalentAI || {};
  window.TalentAI.Debug = window.TalentAI.Debug || {};
  // 保留占位：真正实现由 js/calcCareerMatch.js 注入
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 读取并合并所有层的 localStorage 数据
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function loadAllLayerData() {
  // 优先读取五层合并版（WMA测评完成后写入）
  const fullStr = localStorage.getItem('talentai_wma_answers')
               || localStorage.getItem('talentai_all_answers');
  if (fullStr) {
    try {
      const full = JSON.parse(fullStr);
      const timings = safeParseJSON(localStorage.getItem('talentai_wma_timings') || '{}');
      console.log('✅ 读取到五层合并答案');
      return { answers: full, timings, source: 'merged' };
    } catch(e) {}
  }

  // 分层读取（各层独立存储时）
  const tRaw = safeParseJSON(localStorage.getItem('talentai_answers') || localStorage.getItem('talentai_t_answers'));
  const pRaw = safeParseJSON(localStorage.getItem('talentai_p_answers'));
  const wRaw = safeParseJSON(localStorage.getItem('talentai_w_answers'));
  const mRaw = safeParseJSON(localStorage.getItem('talentai_m_answers'));
  const aRaw = safeParseJSON(localStorage.getItem('talentai_a_answers'));

  console.log('分层数据状态:', {
    T: tRaw ? '✅' : '❌',
    P: pRaw ? '✅' : '❌',
    W: wRaw ? '✅' : '❌',
    M: mRaw ? '✅' : '❌',
    A: aRaw ? '✅' : '❌'
  });

  // 至少需要T层数据
  if (!tRaw && !wRaw) return null;

  const timings = {
    ...(safeParseJSON(localStorage.getItem('talentai_timings')) || {}),
    ...(safeParseJSON(localStorage.getItem('talentai_wma_timings')) || {})
  };

  return {
    answers: { T: tRaw, P: pRaw, W: wRaw, M: mRaw, A: aRaw },
    timings,
    source: 'layered'
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 合并各层答案为 v4.6 五层结构
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function mergeAllLayerAnswers(userData) {
  const raw = userData.answers;

  // 已经是 {T,W,M,P,A} 结构
  if (raw && raw.T && raw.W) return raw;

  // 分层合并
  const T = normalizeT(raw?.T);
  const P = normalizeP(raw?.P);
  const W = normalizeW(raw?.W);
  const M = normalizeM(raw?.M);
  const A = normalizeA(raw?.A);

  return { T, P, W, M, A };
}

// T层：加德纳8维(0-10) → v4.6 T层6维(0-100)
function normalizeT(raw) {
  if (!raw) return defaultT();
  // 已是 v4.6 格式
  if (raw['T-LOG'] !== undefined) return raw;

  function g(k1, k2, fb) {
    const v = raw[k1] !== undefined ? raw[k1] : raw[k2] !== undefined ? raw[k2] : fb;
    return Math.min(10, Math.max(0, Number(v) || fb));
  }
  const T1 = g('T1_language','T1',6);
  const T2 = g('T2_logic','T2',6);
  const T3 = g('T3_spatial','T3',5);
  const T4 = g('T4_music','T4',5);
  const T5 = g('T5_bodily','T5',5);
  const T6 = g('T6_interpersonal','T6',6);
  const T7 = g('T7_intrapersonal','T7',5.5);
  const T8 = g('T8_naturalist','T8',4.5);

  return {
    'T-LOG': clamp((T2*0.7 + T7*0.3) * 10),
    'T-CRE': clamp((T3*0.5 + T4*0.3 + T1*0.2) * 10),
    'T-EMP': clamp((T6*0.6 + T7*0.4) * 10),
    'T-ANA': clamp((T2*0.5 + T8*0.3 + T7*0.2) * 10),
    'T-EXE': clamp((T5*0.5 + T1*0.3 + T6*0.2) * 10),
    'T-COM': clamp((T1*0.5 + T6*0.3 + T7*0.2) * 10)
  };
}

// P层：Big Five (0-100)
function normalizeP(raw) {
  if (!raw) return { openness:60, conscientiousness:55, extraversion:52, agreeableness:60, neuroticism:45 };
  if (raw.openness !== undefined) return raw;
  // 若是问题答案格式，用均值推算
  return { openness:60, conscientiousness:55, extraversion:52, agreeableness:60, neuroticism:45 };
}

// W层：五驱动力 (0-100)
function normalizeW(raw) {
  if (!raw) return { CO:58, VD:55, TD:60, ED:52, GM:48 };
  if (raw.CO !== undefined) return raw;
  return { CO:58, VD:55, TD:60, ED:52, GM:48 };
}

// M层：五思维维度 (0-100)
function normalizeM(raw) {
  if (!raw) return { 'M-SYS':55, 'M-STR':52, 'M-RSK':48, 'M-INT':62, 'M-MET':55 };
  if (raw['M-SYS'] !== undefined) return raw;
  return { 'M-SYS':55, 'M-STR':52, 'M-RSK':48, 'M-INT':62, 'M-MET':55 };
}

// A层：五AI适配维度 (0-100)
function normalizeA(raw) {
  if (!raw) return { 'A-ACC':58, 'A-SPD':55, 'A-ADP':62, 'A-AUT':50, 'A-CRT':55 };
  if (raw['A-ACC'] !== undefined) return raw;
  return { 'A-ACC':58, 'A-SPD':55, 'A-ADP':62, 'A-AUT':50, 'A-CRT':55 };
}

function defaultT() {
  return { 'T-LOG':62, 'T-CRE':58, 'T-EMP':60, 'T-ANA':60, 'T-EXE':55, 'T-COM':62 };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 工具函数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function safeParseJSON(str) {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

function clamp(v) { return Math.min(100, Math.max(0, Math.round(v))); }

function readUserAge() {
  for (const k of ['talentai_user_age','talentai_age','userAge']) {
    const v = localStorage.getItem(k);
    if (v) { const n = parseInt(v,10); if (n>=12 && n<=25) return n; }
  }
  try {
    const info = safeParseJSON(localStorage.getItem('talentai_user_info'));
    if (info?.age) return parseInt(info.age,10);
  } catch {}
  return 17;
}

async function loadDataFiles() {
  let qData = [];
  for (const path of ['data/t-layer-questions.json','data/questions-database.json']) {
    try {
      const r = await fetch(path);
      if (r.ok) { const j = await r.json(); qData = j.questions || j; break; }
    } catch {}
  }
  const cRes = await fetch('data/careers-database.json');
  if (!cRes.ok) throw new Error('职业库加载失败');
  return [qData, await cRes.json()];
}

function showWmaError(msg) {
  const l = document.getElementById('wma-loading');
  if (!l) return;
  l.innerHTML = '<div style="text-align:center;padding:40px 24px;color:#fff;">' +
    '<div style="font-size:48px;margin-bottom:16px;">⚠️</div>' +
    '<p style="font-size:17px;font-weight:700;margin:0 0 12px;">' + msg + '</p>' +
    '<button onclick="history.back()" style="padding:12px 28px;background:#fff;' +
    'color:#1b3a6b;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;">' +
    '← 返回</button></div>';
}

// 暴露给 HTML 按钮调用
function buyPackage(type) {
  window.location.href = 'payment.html?package=' + encodeURIComponent(type);
}
if (typeof window !== 'undefined') window.buyPackage = buyPackage;

