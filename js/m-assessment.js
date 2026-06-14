/**

 * M层独立单选测评（24题）

 */

'use strict';



const M_BANK_FILE = 'data/m-layer-questions.json';

const M_ANSWERS_KEY = 'talentai_m_choice_answers';

const M_ORDERS_KEY = 'talentai_m_choice_orders';

const M_RESULT_KEY = 'talentai_m_drive_result';



let mBank = null;

let currentIdx = 0;

let answers = {};

let optionOrders = {};

let choiceLock = false;



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

  const total = mBank?.questions?.length || 24;

  const pct = Math.round(((currentIdx + 1) / total) * 100);

  const fill = document.getElementById('prog-fill');

  const progText = document.getElementById('prog-text');

  if (fill) fill.style.width = pct + '%';

  if (progText) progText.textContent = formatProgress(mBank, currentIdx);

}



function saveProgress() {

  try {

    localStorage.setItem(M_ANSWERS_KEY, JSON.stringify(answers));

    localStorage.setItem(M_ORDERS_KEY, JSON.stringify(optionOrders));

  } catch (e) {}

}



function restoreProgress() {

  try {

    const rawA = localStorage.getItem(M_ANSWERS_KEY);

    if (rawA) answers = JSON.parse(rawA) || {};

    const rawO = localStorage.getItem(M_ORDERS_KEY);

    if (rawO) optionOrders = JSON.parse(rawO) || {};

  } catch (e) {

    answers = {};

    optionOrders = {};

  }

}



function resetSessionIfNew() {

  const qs = new URLSearchParams(location.search);

  if (qs.get('restart') === '1') {

    answers = {};

    optionOrders = {};

    try {

      localStorage.removeItem(M_ANSWERS_KEY);

      localStorage.removeItem(M_ORDERS_KEY);

      localStorage.removeItem(M_RESULT_KEY);

    } catch (e) {}

  }

}



function renderQuestion() {

  choiceLock = false;

  const questions = mBank.questions || [];

  if (currentIdx >= questions.length) {

    showResults();

    return;

  }



  const q = questions[currentIdx];

  const descEl = document.getElementById('m-description');

  const titleEl = document.getElementById('question-text');

  const container = document.getElementById('options-container');

  const prevBtn = document.getElementById('prevBtn');



  if (descEl && currentIdx === 0) {

    descEl.textContent = mBank.description || '';

    descEl.style.display = 'block';

  } else if (descEl) {

    descEl.style.display = 'none';

  }



  if (titleEl) titleEl.textContent = q.question || '';



  const selected = answers[q.id] || null;

  const shuffled = ShuffledChoice.getShuffledOptions(

    q.id,

    q.options || [],

    (o) => o.code,

    optionOrders

  );



  ShuffledChoice.renderShuffledChoices({

    container,

    shuffledOptions: shuffled,

    selectedKey: selected,

    keyFn: (o) => o.code,

    escapeHtml,

    onPick: (opt, div, box) => {

      if (choiceLock) return;

      choiceLock = true;

      answers[q.id] = opt.code;

      saveProgress();

      box.querySelectorAll('.m-option').forEach((o) => o.classList.remove('selected'));

      div.classList.add('selected');

      setTimeout(() => {

        goNext();

        choiceLock = false;

      }, 380);

    }

  });



  if (prevBtn) prevBtn.disabled = currentIdx === 0;

  updateProgress();

}



function escapeHtml(s) {

  return String(s || '')

    .replace(/&/g, '&amp;')

    .replace(/</g, '&lt;')

    .replace(/>/g, '&gt;')

    .replace(/"/g, '&quot;');

}



function showResults() {

  const mDrive = MLayerScoring.calcMChoiceScores(mBank, answers);

  mDrive.rawAnswers = answers;

  try {

    localStorage.setItem(M_RESULT_KEY, JSON.stringify(mDrive));
    localStorage.setItem('talentai_m_scores', JSON.stringify(mDrive));
    localStorage.setItem('talentai_m_choice_completed', '1');

    localStorage.removeItem(M_ORDERS_KEY);

  } catch (e) {}



  const dom = mDrive.dominant_modes || [];

  const domEl = document.getElementById('dominant-label');

  if (domEl && dom.length) {

    domEl.innerHTML =

      '主导思维模式：' +

      dom.map((d) => `<span class="dominant-tag">${d.name} ${d.percentage}%</span>`).join('');

  }



  const radarEl = document.getElementById('radar-chart');

  if (radarEl) radarEl.innerHTML = MLayerScoring.buildRadarSvg(mDrive, 300);



  const listEl = document.getElementById('dim-list');

  if (listEl) {

    const rows = Object.keys(mDrive.dimensions || {})

      .map((k) => mDrive.dimensions[k])

      .sort((a, b) => b.percentage - a.percentage);

    listEl.innerHTML = rows

      .map((d) => `<div class="dim-row"><span>${d.name}</span><span class="dim-pct">${d.percentage}%</span></div>`)

      .join('');

  }



  showScreen('result-screen');

}



function goNext() {

  const questions = mBank.questions || [];

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



document.getElementById('prevBtn').addEventListener('click', goPrev);



document.getElementById('btnContinue').addEventListener('click', () => {

  const ret = new URLSearchParams(location.search).get('return');

  if (ret) window.location.href = ret;

  else window.location.href = 'wma-result.html';

});



(async function init() {

  try {

    resetSessionIfNew();

    const res = await fetch(M_BANK_FILE);

    if (!res.ok) throw new Error(M_BANK_FILE + ' ' + res.status);

    mBank = await res.json();

    restoreProgress();

    renderQuestion();

  } catch (err) {

    console.error(err);

    alert('M层题库加载失败：' + (err.message || err));

  }

})();


