/**
 * P + W + M 综合测评（先 P → 再 W → 再 M，完成后统一跳转 wma-result.html）
 */
'use strict';

const PWM_SECTIONS = [
  {
    key: 'P',
    icon: '🧩',
    badge: 'P层 · 性格特征',
    title: '第一部分：P层性格特征',
    desc: '了解孩子更习惯怎样做事、沟通和面对环境。',
    file: 'data/p-layer-questions.json',
    kind: 'p'
  },
  {
    key: 'W',
    icon: '🧭',
    badge: 'W层 · 内在驱动力',
    title: '第二部分：W层内在驱动力',
    desc: '了解什么事情更容易激发孩子持续投入。',
    file: 'data/w-layer-questions.json',
    kind: 'w-drag'
  },
  {
    key: 'M',
    icon: '🧠',
    badge: 'M层 · 思维模式',
    title: '第三部分：M层思维模式',
    desc: '了解孩子习惯如何学习、思考和解决问题。',
    file: 'data/m-layer-questions.json',
    kind: 'm-choice'
  }
];

const PWM_RESULT_HREF = 'wma-result.html';
const PWM_PROGRESS_KEY = 'talentai_pwm_progress';
const PWM_W_BANK_VERSION = '2026-06-w-rank-v2';

function isWAnswerComplete(ans) {
  return window.WLayerScoring?.isWRankAnswerComplete
    ? WLayerScoring.isWRankAnswerComplete(ans)
    : !!(ans && ans.rank1 && ans.rank2 && ans.rank3 && ans.rank4 && ans.rank5);
}

let pwmData = { P: null, W: null, M: null };
let flatQueue = [];
let currentFlat = 0;
let pAnswers = [];
let wmaAnswers = { W: {}, M: {} };
let isSubmitting = false;
let timerSeconds = 0;
let timerInterval = null;
let wDragUI = null;
let choiceOrders = { P: {}, M: {} };
let choiceLock = false;

function isPAttemptActive() {
  return localStorage.getItem('talentai_p_attempt_active') === '1';
}

function setPAttemptActive(v) {
  if (v) localStorage.setItem('talentai_p_attempt_active', '1');
  else localStorage.removeItem('talentai_p_attempt_active');
}

function canAccessPwm() {
  return (
    isPAttemptActive() ||
    localStorage.getItem('talentai_p_entitlement') === '1' ||
    localStorage.getItem('talentai_p_paid') === '1' ||
    localStorage.getItem('talentai_paid') === '1' ||
    localStorage.getItem('talentai_premium') === '1'
  );
}

function redirectToPayment() {
  window.location.href = 'payment.html?package=pathfinder';
}

function buildFlatQueue() {
  flatQueue = [];
  PWM_SECTIONS.forEach((sec, sIdx) => {
    const bank = pwmData[sec.key];
    const qs = sec.kind === 'p' ? (bank?.questions || []) : (bank?.questions || []);
    qs.forEach((q, qIdx) => {
      flatQueue.push({ sectionIdx: sIdx, questionIdx: qIdx, key: sec.key, kind: sec.kind, q });
    });
  });
}

function getCurrent() {
  return flatQueue[currentFlat] || null;
}

function getSectionAt(idx) {
  return PWM_SECTIONS[idx];
}

function countAnswered() {
  let n = 0;
  pAnswers.forEach((a) => { if (a) n++; });
  ['W', 'M'].forEach((k) => {
    const qs = pwmData[k]?.questions || [];
    qs.forEach((q) => {
      const a = wmaAnswers[k][q.id];
      if (!a) return;
      if (k === 'W') {
        if (isWAnswerComplete(a)) n++;
      } else if (k === 'M') {
        if (/^[A-D]$/i.test(a)) n++;
      }
    });
  });
  return n;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function startTimer() {
  if (timerInterval) clearInterval(timerInterval);
  const saved = parseInt(localStorage.getItem('talentai_pwm_timer') || '0', 10);
  if (saved > 0) timerSeconds = saved;
  timerInterval = setInterval(() => {
    timerSeconds++;
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const s = String(timerSeconds % 60).padStart(2, '0');
    const el = document.getElementById('timer-display');
    if (el) el.textContent = `${m}:${s}`;
    try { localStorage.setItem('talentai_pwm_timer', String(timerSeconds)); } catch (e) {}
  }, 1000);
}

function updateProgress() {
  const total = flatQueue.length || 1;
  const globalNum = Math.min(currentFlat + 1, total);
  const answered = countAnswered();
  const pct = Math.round((globalNum / total) * 100);
  const fill = document.getElementById('prog-fill');
  const progText = document.getElementById('prog-text');
  const countEl = document.getElementById('progress-count');
  if (fill) fill.style.width = pct + '%';
  if (progText) progText.textContent = `${globalNum}/${total}`;
  if (countEl) countEl.textContent = `已答 ${answered} 题`;
}

function appendOption(container, letter, html, isSelected, onPick) {
  const div = document.createElement('div');
  div.className = 'option-card' + (isSelected ? ' selected' : '');
  div.innerHTML = `
    <div class="flex items-start gap-3">
      <span class="font-bold text-purple-400 shrink-0">${letter}.</span>
      <div class="flex-1 text-gray-200 leading-relaxed">${html}</div>
    </div>`;
  div.onclick = () => {
    container.querySelectorAll('.option-card').forEach((o) => o.classList.remove('selected'));
    div.classList.add('selected');
    onPick();
  };
  container.appendChild(div);
}

function showSectionBanner(sectionIdx) {
  const sec = getSectionAt(sectionIdx);
  const banner = document.getElementById('sectionBanner');
  if (!banner || !sec) return;
  document.getElementById('sectionTitle').textContent = sec.title;
  document.getElementById('sectionDesc').textContent = sec.desc;
  banner.style.display = 'block';
}

function saveProgress() {
  try {
    localStorage.setItem(
      PWM_PROGRESS_KEY,
      JSON.stringify({
        flat: currentFlat,
        pAnswers,
        wmaAnswers,
        choiceOrders,
        timer: timerSeconds
      })
    );
  } catch (e) {}
}

function sanitizeMChoiceAnswers() {
  const m = wmaAnswers.M || {};
  Object.keys(m).forEach((qid) => {
    if (!/^[A-D]$/i.test(String(m[qid] || ''))) delete wmaAnswers.M[qid];
  });
}

function sanitizeWDragAnswers() {
  const w = wmaAnswers.W || {};
  Object.keys(w).forEach((qid) => {
    if (!isWAnswerComplete(w[qid])) delete wmaAnswers.W[qid];
  });
}

function invalidateStalePwmWProgress() {
  try {
    if (localStorage.getItem('talentai_pwm_w_bank_v') === PWM_W_BANK_VERSION) return;
    const raw = localStorage.getItem(PWM_PROGRESS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.wmaAnswers) {
        p.wmaAnswers.W = {};
        localStorage.setItem(PWM_PROGRESS_KEY, JSON.stringify(p));
      }
    }
    localStorage.setItem('talentai_pwm_w_bank_v', PWM_W_BANK_VERSION);
  } catch (e) {}
}

function restoreProgress() {
  try {
    const raw = localStorage.getItem(PWM_PROGRESS_KEY);
    if (!raw) return;
    const p = JSON.parse(raw);
    if (p.pAnswers) pAnswers = p.pAnswers;
    if (p.wmaAnswers) wmaAnswers = { W: p.wmaAnswers.W || {}, M: p.wmaAnswers.M || {} };
    if (p.choiceOrders) choiceOrders = { P: p.choiceOrders.P || {}, M: p.choiceOrders.M || {} };
    if (typeof p.flat === 'number') currentFlat = Math.max(0, Math.min(flatQueue.length - 1, p.flat));
    if (typeof p.timer === 'number') timerSeconds = p.timer;
  } catch (e) {}
}

async function loadBanks() {
  const results = await Promise.all(
    PWM_SECTIONS.map((s) =>
      fetch(s.file).then((r) => {
        if (!r.ok) throw new Error(`${s.file} ${r.status}`);
        return r.json();
      })
    )
  );
  pwmData.P = results[0];
  pwmData.W = results[1];
  pwmData.M = results[2];
  buildFlatQueue();
}

function updateNavForKind(kind) {
  const nextBtn = document.getElementById('nextBtn');
  if (!nextBtn) return;
  if (kind === 'p' || kind === 'm-choice') {
    nextBtn.style.display = 'none';
  } else {
    nextBtn.style.display = '';
  }
}

function renderQuestion() {
  choiceLock = false;
  if (currentFlat >= flatQueue.length) {
    submitAll();
    return;
  }

  const cur = getCurrent();
  if (!cur) return;

  const sec = getSectionAt(cur.sectionIdx);
  const sectionQs = pwmData[sec.key]?.questions?.length || 0;
  const isFirstInSection =
    cur.questionIdx === 0 ||
    (currentFlat > 0 && flatQueue[currentFlat - 1].sectionIdx !== cur.sectionIdx);
  const introEl = document.getElementById('pwm-intro');
  if (isFirstInSection) showSectionBanner(cur.sectionIdx);
  else {
    const banner = document.getElementById('sectionBanner');
    if (banner) banner.style.display = 'none';
  }
  if (introEl) introEl.style.display = currentFlat === 0 ? 'block' : 'none';

  updateNavForKind(cur.kind);

  const headerBadge = document.getElementById('current-layer-badge');
  const badgeQ = document.getElementById('current-layer-badge-q');
  const layerQ = document.getElementById('current-layer-q');
  if (headerBadge) headerBadge.textContent = `${sec.icon} ${sec.badge}`;
  if (badgeQ) badgeQ.textContent = sec.title;
  if (layerQ) {
    if (cur.kind === 'w-drag' && pwmData.W?.progress_text) {
      layerQ.textContent = pwmData.W.progress_text
        .replace('{current}', String(cur.questionIdx + 1))
        .replace('{total}', String(sectionQs));
    } else if (cur.kind === 'm-choice' && pwmData.M?.progress_text) {
      layerQ.textContent = pwmData.M.progress_text
        .replace('{current}', String(cur.questionIdx + 1))
        .replace('{total}', String(sectionQs));
    } else {
      layerQ.textContent = `第 ${cur.questionIdx + 1} / ${sectionQs} 题`;
    }
  }

  const globalNum = currentFlat + 1;
  const numEl = document.getElementById('question-number-global');
  if (numEl) numEl.textContent = String(globalNum);

  const scenarioEl = document.getElementById('question-scenario');
  const titleEl = document.getElementById('question-text');
  const optionsDiv = document.getElementById('options-container');
  const wDragMount = document.getElementById('w-drag-mount');
  const nextBtn = document.getElementById('nextBtn');
  const forceEl = document.getElementById('force-choice-label');
  if (!optionsDiv) return;

  if (wDragUI) {
    wDragUI.destroy();
    wDragUI = null;
  }
  optionsDiv.innerHTML = '';
  optionsDiv.style.display = '';
  if (wDragMount) {
    wDragMount.innerHTML = '';
    wDragMount.style.display = 'none';
  }
  nextBtn.disabled = true;
  nextBtn.classList.remove('w-next-ready', 'm-next-ready');
  nextBtn.innerHTML = '下一题<i class="fas fa-arrow-right ml-2"></i>';

  if (cur.kind === 'p') {
    const q = cur.q;
    if (forceEl) forceEl.style.display = 'none';
    if (q.scenario) {
      scenarioEl.style.display = 'block';
      scenarioEl.textContent = q.scenario;
    } else if (scenarioEl) {
      scenarioEl.style.display = 'none';
    }
    if (titleEl) titleEl.textContent = q.text || '';

    const saved = pAnswers[cur.questionIdx];
    const selectedKey = saved?.selectedOption?.id || null;
    const shuffled = ShuffledChoice.getShuffledOptions(
      q.id,
      q.options || [],
      (o) => o.id,
      choiceOrders.P
    );

    ShuffledChoice.renderShuffledOptionCards({
      container: optionsDiv,
      shuffledOptions: shuffled,
      selectedKey,
      keyFn: (o) => o.id,
      escapeHtml,
      onPick: (opt, div, box) => {
        if (choiceLock) return;
        choiceLock = true;
        pAnswers[cur.questionIdx] = {
          questionId: q.id,
          dim: q.dim,
          selectedOption: opt
        };
        box.querySelectorAll('.option-card').forEach((o) => o.classList.remove('selected'));
        div.classList.add('selected');
        saveProgress();
        setTimeout(() => {
          goNext();
          choiceLock = false;
        }, 380);
      }
    });
  } else if (cur.kind === 'w-drag') {
    const q = cur.q;
    const bank = pwmData.W;
    if (forceEl) forceEl.style.display = 'none';
    optionsDiv.style.display = 'none';
    if (wDragMount) wDragMount.style.display = 'block';

    if (q.scene) {
      scenarioEl.style.display = 'block';
      scenarioEl.textContent = q.scene;
    } else if (scenarioEl) {
      scenarioEl.style.display = 'none';
    }
    if (titleEl) titleEl.textContent = q.question || '';

    const saved = wmaAnswers.W[q.id] || null;
    const isComplete = isWAnswerComplete(saved);
    setWNextButton(isComplete, bank);

    wDragUI = WDragUI.mountWDragQuestion(wDragMount, bank, q, saved, (ans, complete) => {
      if (complete && ans) {
        wmaAnswers.W[q.id] = ans;
        saveProgress();
      } else {
        delete wmaAnswers.W[q.id];
        saveProgress();
      }
      setWNextButton(complete, bank);
    });
  } else if (cur.kind === 'm-choice') {
    const q = cur.q;
    const bank = pwmData.M;
    if (forceEl) forceEl.style.display = 'none';
    if (scenarioEl) scenarioEl.style.display = 'none';

    let mDescEl = document.getElementById('m-description');
    if (!mDescEl) {
      mDescEl = document.createElement('p');
      mDescEl.id = 'm-description';
      mDescEl.className = 'text-sm text-gray-400 mb-4 leading-relaxed';
      titleEl.parentNode.insertBefore(mDescEl, titleEl);
    }
    if (cur.questionIdx === 0) {
      mDescEl.textContent = bank.description || '';
      mDescEl.style.display = 'block';
    } else {
      mDescEl.style.display = 'none';
    }

    if (titleEl) titleEl.textContent = q.question || '';

    const selected = wmaAnswers.M[q.id] || null;
    const shuffled = ShuffledChoice.getShuffledOptions(
      q.id,
      q.options || [],
      (o) => o.code,
      choiceOrders.M
    );

    ShuffledChoice.renderShuffledChoices({
      container: optionsDiv,
      shuffledOptions: shuffled,
      selectedKey: selected,
      keyFn: (o) => o.code,
      escapeHtml,
      onPick: (opt, div, box) => {
        if (choiceLock) return;
        choiceLock = true;
        wmaAnswers.M[q.id] = opt.code;
        saveProgress();
        box.querySelectorAll('.m-option').forEach((o) => o.classList.remove('selected'));
        div.classList.add('selected');
        setTimeout(() => {
          goNext();
          choiceLock = false;
        }, 380);
      }
    });
  } else {
    const q = cur.q;
    if (forceEl) forceEl.style.display = q.type === 'force_choice' ? 'block' : 'none';
    const qText = q.question?.['zh-CN'] || q.question || '';
    const scenario = q.scenario ? q.scenario['zh-CN'] || q.scenario : '';
    if (scenario) {
      scenarioEl.style.display = 'block';
      scenarioEl.textContent = scenario;
    } else if (scenarioEl) {
      scenarioEl.style.display = 'none';
    }
    if (titleEl) titleEl.textContent = qText;

    const layerKey = cur.key;
    const selectedId = wmaAnswers[layerKey][q.id];
    (q.options || []).forEach((opt, i) => {
      const letter = String.fromCharCode(65 + i);
      const text = opt.text?.['zh-CN'] || opt.text || '';
      const sub = opt.sub?.['zh-CN'] || opt.sub || '';
      const html = sub
        ? `${escapeHtml(text)}<br><span style="font-size:0.85rem;color:#9ca3af">${escapeHtml(sub)}</span>`
        : escapeHtml(text);
      const isSel = selectedId === opt.id;
      if (isSel) nextBtn.disabled = false;
      appendOption(optionsDiv, letter, html, isSel, () => {
        wmaAnswers[layerKey][q.id] = opt.id;
        nextBtn.disabled = false;
        saveProgress();
        setTimeout(goNext, 380);
      });
    });
  }

  const prevBtn = document.getElementById('prevBtn');
  if (prevBtn) prevBtn.disabled = currentFlat === 0;
  updateProgress();
}

function setMNextButton(ready, bank) {
  const nextBtn = document.getElementById('nextBtn');
  if (!nextBtn) return;
  nextBtn.disabled = !ready;
  if (ready) {
    nextBtn.textContent = bank?.next_button_active || '下一题 →';
    nextBtn.classList.add('m-next-ready');
  } else {
    nextBtn.textContent = bank?.next_button_inactive || '请先选择一个选项';
    nextBtn.classList.remove('m-next-ready');
  }
}

function setWNextButton(ready, bank) {
  const nextBtn = document.getElementById('nextBtn');
  if (!nextBtn) return;
  nextBtn.disabled = !ready;
  if (ready) {
    nextBtn.textContent = bank?.next_button_active || '下一题 →';
    nextBtn.classList.add('w-next-ready');
  } else {
    nextBtn.textContent = bank?.next_button_inactive || '请完成五个名次的排序';
    nextBtn.classList.remove('w-next-ready');
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function goNext() {
  if (currentFlat < flatQueue.length - 1) {
    currentFlat++;
    saveProgress();
    renderQuestion();
  } else {
    submitAll();
  }
}

function goPrev() {
  if (currentFlat > 0) {
    currentFlat--;
    saveProgress();
    renderQuestion();
  }
}

function calculatePResult() {
  const dimsRaw = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const counts = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const rawAnswers = [];

  pAnswers.forEach((a) => {
    if (!a) return;
    const dim = a.dim;
    const score = Number(a.selectedOption?.score) || 0;
    dimsRaw[dim] += score;
    counts[dim] += 1;
    rawAnswers.push({
      questionId: a.questionId,
      dimension: dim,
      selectedOptionId: a.selectedOption.id,
      selectedText: a.selectedOption.text,
      score
    });
  });

  const dimsNorm = {};
  Object.keys(dimsRaw).forEach((key) => {
    if (counts[key] > 0) {
      const maxScore = counts[key] * 5;
      let percent = (dimsRaw[key] / maxScore) * 100;
      if (key === 'N') percent = 100 - percent;
      dimsNorm[key] = Math.round(percent);
    } else {
      dimsNorm[key] = 50;
    }
  });

  const finalResult = {
    version: 'P_v3.1_pwm',
    completedAt: new Date().toISOString(),
    totalQuestions: pAnswers.filter(Boolean).length,
    dims: dimsNorm,
    rawAnswers
  };

  localStorage.setItem('talentai_p_result', JSON.stringify(finalResult));
  localStorage.setItem('talentai_p_dims', JSON.stringify(dimsNorm));
  localStorage.setItem('talentai_p_answers', JSON.stringify(rawAnswers));
  localStorage.setItem('talentai_p_completed', '1');
}

function clamp10(val) {
  return Math.round(Math.min(10, Math.max(0, val)) * 10) / 10;
}

function r10(val) {
  return Math.round(Math.min(10, Math.max(0, val)) * 10) / 10;
}

function calcWmaScores() {
  const rawScores = { W: {}, M: {} };
  const behavTags = {};
  const flags = {};

  let pDims = {};
  try {
    pDims = JSON.parse(localStorage.getItem('talentai_p_dims') || 'null') ||
      JSON.parse(localStorage.getItem('talentai_p_result') || '{}')?.dims ||
      {};
  } catch (e) {
    pDims = {};
  }
  const wDrive = WLayerScoring.calcWDragScores(pwmData.W, wmaAnswers.W || {}, pDims);
  wDrive.rawAnswers = wmaAnswers.W || {};
  try {
    localStorage.setItem('talentai_w_drive_result', JSON.stringify(wDrive));
    localStorage.setItem('talentai_w_scores', JSON.stringify(wDrive));
  } catch (e) {}

  const mDrive = MLayerScoring.calcMChoiceScores(pwmData.M, wmaAnswers.M || {});
  mDrive.rawAnswers = wmaAnswers.M || {};
  try {
    localStorage.setItem('talentai_m_drive_result', JSON.stringify(mDrive));
    localStorage.setItem('talentai_m_scores', JSON.stringify(mDrive));
  } catch (e) {}

  const normalized = { W: {}, M: {} };
  normalized.W = WLayerScoring.mapWDragToLegacyNormalized(wDrive);
  normalized.M = MLayerScoring.mapMChoiceToLegacyNormalized(mDrive);

  const M = normalized.M;
  const W = normalized.W;
  const aiIndex = Math.round(((M.AC || 5) / 10) * 100);

  const composite = {
    execution: r10((W.W2 || 0) * 0.35 + (M.VR || 0) * 0.35 + (M.GM || 0) * 0.3),
    innovation: r10((W.W4 || 0) * 0.35 + (M.CR || 0) * 0.3 + (W.W5 || 0) * 0.35),
    social: r10((W.W3 || 0) * 0.4 + (M.VR || 0) * 0.2 + (M.AC || 0) * 0.4),
    ai_leverage: r10((aiIndex / 10) * 0.5 + (M.AC || 0) * 0.3 + (W.W4 || 0) * 0.2),
    resilience: r10((W.W2 || 0) * 0.35 + (M.GM || 0) * 0.35 + (M.CR || 0) * 0.3)
  };

  const riskScore =
    (behavTags.ai_dependency || 0) * 2.5 +
    (behavTags.blind_trust || 0) * 2.0 +
    (flags.think_outsource || 0) * 2.0 +
    (flags.fixed_mindset || 0) * 1.5;
  const riskLevel = riskScore >= 6 ? 'high' : riskScore >= 3 ? 'medium' : 'low';

  return {
    raw: rawScores,
    normalized,
    wDrive,
    mDrive,
    aiIndex,
    composite,
    behavioralTags: behavTags,
    flags,
    riskLevel,
    riskScore: Math.round(riskScore * 10) / 10,
    answeredCount: countAnswered(),
    completedAt: new Date().toISOString()
  };
}

function submitAll() {
  if (isSubmitting) return;
  isSubmitting = true;

  if (timerInterval) clearInterval(timerInterval);
  showScreen('loading-root');

  try {
    calculatePResult();
    setPAttemptActive(false);
    localStorage.removeItem('talentai_p_entitlement');

    const scores = calcWmaScores();
    localStorage.setItem('talentai_wma_scores', JSON.stringify(scores));
    localStorage.setItem('talentai_wma_answers', JSON.stringify(wmaAnswers));
    localStorage.setItem('talentai_wma_completed_at', scores.completedAt);
    localStorage.setItem('talentai_pwm_completed', '1');
    localStorage.removeItem(PWM_PROGRESS_KEY);

    if (window.TCareersStore) {
      TCareersStore.migrateFromLegacy();
    }
  } catch (e) {
    console.error('PWM 提交失败', e);
  }

  setTimeout(() => {
    window.location.assign(PWM_RESULT_HREF);
  }, 800);
}

document.getElementById('nextBtn').addEventListener('click', goNext);
document.getElementById('prevBtn').addEventListener('click', goPrev);
const pauseBtn = document.getElementById('btn-pause');
if (pauseBtn) pauseBtn.addEventListener('click', saveProgress);

(async function init() {
  if (!canAccessPwm()) {
    redirectToPayment();
    return;
  }

  if (!isPAttemptActive()) {
    localStorage.removeItem('talentai_p_entitlement');
    setPAttemptActive(true);
  }

  invalidateStalePwmWProgress();

  try {
    await loadBanks();
    if (!flatQueue.length) {
      alert('题库加载失败，请刷新重试');
      return;
    }
    pAnswers = new Array((pwmData.P?.questions || []).length).fill(null);
    restoreProgress();
    sanitizeWDragAnswers();
    sanitizeMChoiceAnswers();
    startTimer();
    showScreen('assess-root');
    renderQuestion();
  } catch (err) {
    console.error(err);
    alert('加载测评题目失败：' + (err.message || err));
  }
})();
