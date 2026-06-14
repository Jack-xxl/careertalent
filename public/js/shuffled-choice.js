/**
 * 单选题选项随机排序（得分绑定选项内容，不绑定显示位置）
 */
'use strict';

const CHOICE_DISPLAY_MARKERS = ['①', '②', '③', '④', '⑤', '⑥'];

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 为本题生成本次测评内的固定随机顺序（同一会话内返回上一题顺序不变） */
function ensureChoiceOrder(questionId, options, keyFn, ordersMap) {
  if (ordersMap[questionId]) return ordersMap[questionId];
  const keys = (options || []).map((o) => keyFn(o));
  ordersMap[questionId] = shuffleArray(keys);
  return ordersMap[questionId];
}

function getShuffledOptions(questionId, options, keyFn, ordersMap) {
  const order = ensureChoiceOrder(questionId, options, keyFn, ordersMap);
  const byKey = {};
  (options || []).forEach((o) => { byKey[keyFn(o)] = o; });
  return order.map((k) => byKey[k]).filter(Boolean);
}

/**
 * @param {object} opts
 * @param {HTMLElement} opts.container
 * @param {Array} opts.shuffledOptions
 * @param {string|null} opts.selectedKey
 * @param {function} opts.keyFn
 * @param {function} opts.escapeHtml
 * @param {function} opts.onPick - (option) => void
 * @param {string} [opts.itemClass='m-option']
 */
function renderShuffledChoices(opts) {
  const {
    container,
    shuffledOptions,
    selectedKey,
    keyFn,
    escapeHtml,
    onPick,
    itemClass = 'm-option'
  } = opts;

  container.innerHTML = '';
  shuffledOptions.forEach((opt, idx) => {
    const key = keyFn(opt);
    const div = document.createElement('div');
    div.className = itemClass + (selectedKey === key ? ' selected' : '');
    const marker = CHOICE_DISPLAY_MARKERS[idx] || String(idx + 1);
    div.innerHTML =
      `<span class="m-option-code">${marker}</span>` +
      `<span class="m-option-text">${escapeHtml(typeof opt.text === 'string' ? opt.text : (opt.text?.['zh-CN'] || ''))}</span>`;
    div.addEventListener('click', () => onPick(opt, div, container));
    container.appendChild(div);
  });
}

function renderShuffledOptionCards(opts) {
  const {
    container,
    shuffledOptions,
    selectedKey,
    keyFn,
    escapeHtml,
    onPick
  } = opts;

  container.innerHTML = '';
  shuffledOptions.forEach((opt, idx) => {
    const key = keyFn(opt);
    const isSel = selectedKey === key;
    const marker = CHOICE_DISPLAY_MARKERS[idx] || String(idx + 1);
    const div = document.createElement('div');
    div.className = 'option-card' + (isSel ? ' selected' : '');
    div.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="font-bold text-purple-400 shrink-0">${marker}</span>
        <div class="flex-1 text-gray-200 leading-relaxed">${escapeHtml(opt.text || '')}</div>
      </div>`;
    div.onclick = () => onPick(opt, div, container);
    container.appendChild(div);
  });
}

if (typeof window !== 'undefined') {
  window.ShuffledChoice = {
    shuffleArray,
    ensureChoiceOrder,
    getShuffledOptions,
    renderShuffledChoices,
    renderShuffledOptionCards,
    CHOICE_DISPLAY_MARKERS
  };
}
