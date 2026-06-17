/**
 * W层独立拖拽测评（8题）
 */
'use strict';

const W_BANK_FILE = 'data/w-layer-questions.json';
const W_ANSWERS_KEY = 'talentai_w_drag_answers';
const W_RESULT_KEY = 'talentai_w_drive_result';

let wBank = null;
let currentIdx = 0;
let answers = {};
let dragUI = null;

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
}

function formatProgress(bank, idx) {
  const tpl = bank.progress_text || '第{current}题，共{total}题';
  const total = (bank.questions || []).length;
  return tpl.replace('{current}', String(idx + 1)).replace('{total}', String(total));
}

function updateProgress() {
  const total = wBank?.questions?.length || 8;
  const pct = Math.round(((currentIdx + 1) / total) * 100);
  const fill = document.getElementById('prog-fill');
  const progText = document.getElementById('prog-text');
  if (fill) fill.style.width = pct + '%';
  if (progText) progText.textContent = formatProgress(wBank, currentIdx);
}

function setNextButton(ready) {
  const btn = document.getElementById('nextBtn');
  if (!btn || !wBank) return;
  btn.disabled = !ready;
  btn.textContent = ready ? wBank.next_button_active : wBank.next_button_inactive;
  btn.classList.toggle('w-next-ready', ready);
}

function saveAnswers() {
  try {
    localStorage.setItem(W_ANSWERS_KEY, JSON.stringify(answers));
  } catch (e) {}
}

function restoreAnswers() {
  try {
    const raw = localStorage.getItem(W_ANSWERS_KEY);
    if (raw) answers = JSON.parse(raw) || {};
  } catch (e) {
    answers = {};
  }
}

function renderQuestion() {
  const questions = wBank.questions || [];
  if (currentIdx >= questions.length) {
    showResults();
    return;
  }

  const q = questions[currentIdx];
  const scenarioEl = document.getElementById('question-scenario');
  const titleEl = document.getElementById('question-text');
  const mount = document.getElementById('w-drag-mount');
  const prevBtn = document.getElementById('prevBtn');

  if (scenarioEl) {
    if (q.scene) {
      scenarioEl.style.display = 'block';
      scenarioEl.textContent = q.scene;
    } else {
      scenarioEl.style.display = 'none';
    }
  }
  if (titleEl) titleEl.textContent = q.question || '';

  if (dragUI) dragUI.destroy();
  const saved = answers[q.id] || null;
  const isComplete = window.WLayerScoring?.isWRankAnswerComplete
    ? WLayerScoring.isWRankAnswerComplete(saved)
    : !!(saved && saved.rank1 && saved.rank2 && saved.rank3 && saved.rank4 && saved.rank5);
  setNextButton(isComplete);

  dragUI = WDragUI.mountWDragQuestion(mount, wBank, q, saved, (ans, complete) => {
    if (complete && ans) {
      answers[q.id] = ans;
      saveAnswers();
    } else if (!complete) {
      delete answers[q.id];
      saveAnswers();
    }
    setNextButton(complete);
  });

  if (prevBtn) prevBtn.disabled = currentIdx === 0;
  updateProgress();
}

function renderDriveResults(wDrive) {
  const el = document.getElementById('drive-results');
  if (!el) return;

  let html = '';
  if (wDrive.intensityStatus) {
    html += `<p class="w-intensity-status">${wDrive.intensityStatus}</p>`;
  }
  if (wDrive.archetypeLabel) {
    html += `<p class="w-archetype-label"><span class="w-archetype-badge">${wDrive.archetypeLabel}</span></p>`;
  }

  const scoreEntries = Object.entries(wDrive.scores || {})
    .filter(([key]) => key !== 'curiosity')
    .sort((a, b) => b[1] - a[1]);

  scoreEntries.slice(0, 3).forEach(([key, score], idx) => {
    const label = WLayerScoring.resolveWDimLabel(key, wBank);
    const bar = WLayerScoring.buildDriveBar(score);
    const levelTag = wDrive.levels?.core?.includes(key) ? '核心'
      : wDrive.levels?.important?.includes(key) ? '重要' : '';
    html += `
      <div class="drive-row">
        <div class="drive-label">${idx === 0 ? '主驱动' : '副驱动'}：${label}${levelTag ? ` · ${levelTag}` : ''}</div>
        <div class="drive-bar">${bar}</div>
        <div class="drive-meta">${score}/10</div>
      </div>`;
  });
  el.innerHTML = html;
}

function showResults() {
  let pDims = {};
  try {
    pDims = JSON.parse(localStorage.getItem('talentai_p_dims') || '{}');
  } catch (e) {}
  const wDrive = WLayerScoring.calcWDragScores(wBank, answers, pDims);
  wDrive.rawAnswers = answers;
  try {
    localStorage.setItem(W_RESULT_KEY, JSON.stringify(wDrive));
    localStorage.setItem('talentai_w_scores', JSON.stringify(wDrive));
    localStorage.setItem('talentai_w_drag_completed', '1');
  } catch (e) {}

  renderDriveResults(wDrive);
  showScreen('result-screen');
}

function goNext() {
  const btn = document.getElementById('nextBtn');
  if (btn && btn.disabled) return;
  const questions = wBank.questions || [];
  if (currentIdx < questions.length - 1) {
    currentIdx++;
    renderQuestion();
  } else {
    showResults();
  }
}

function goPrev() {
  if (currentIdx > 0) {
    currentIdx--;
    renderQuestion();
  }
}

document.getElementById('nextBtn').addEventListener('click', goNext);
document.getElementById('prevBtn').addEventListener('click', goPrev);

document.getElementById('btnContinue').addEventListener('click', () => {
  const ret = new URLSearchParams(location.search).get('return');
  if (ret) window.location.href = ret;
  else if (document.referrer && document.referrer.includes('pwm-assessment')) {
    window.location.href = 'pwm-assessment.html';
  } else {
    window.location.href = 'pathfinder-unlock.html';
  }
});

(async function init() {
  try {
    const res = await fetch(W_BANK_FILE);
    if (!res.ok) throw new Error(W_BANK_FILE + ' ' + res.status);
    wBank = await res.json();
    restoreAnswers();
    renderQuestion();
  } catch (err) {
    console.error(err);
    alert('W层题库加载失败：' + (err.message || err));
  }
})();
