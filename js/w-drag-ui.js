/**
 * W层拖拽选题 UI（不渲染维度名称，仅选项描述）
 */
'use strict';

function escapeWHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function vibrateLight() {
  try {
    if (navigator.vibrate) navigator.vibrate(12);
  } catch (e) {}
}

function WDragQuestionUI(rootEl, bank, question, savedAnswer, onChange) {
  this.root = rootEl;
  this.bank = bank;
  this.question = question;
  this.onChange = onChange || function () {};
  this.slots = { 1: null, 2: null };
  this.dragState = null;
  this.longPressTimer = null;

  if (savedAnswer) {
    if (savedAnswer.slot1) this.slots[1] = savedAnswer.slot1;
    if (savedAnswer.slot2) this.slots[2] = savedAnswer.slot2;
  }

  this.render();
}

WDragQuestionUI.prototype.getPlacedCodes = function () {
  const codes = [];
  if (this.slots[1]) codes.push(this.slots[1]);
  if (this.slots[2]) codes.push(this.slots[2]);
  return codes;
};

WDragQuestionUI.prototype.isComplete = function () {
  return !!(this.slots[1] && this.slots[2]);
};

WDragQuestionUI.prototype.emitChange = function () {
  const answer = this.isComplete()
    ? { slot1: this.slots[1], slot2: this.slots[2] }
    : null;
  this.onChange(answer, this.isComplete());
};

WDragQuestionUI.prototype.placeInSlot = function (slotNum, code) {
  const other = slotNum === 1 ? 2 : 1;
  if (this.slots[other] === code) this.slots[other] = null;
  this.slots[slotNum] = code;
  vibrateLight();
  this.render();
  this.emitChange();
};

WDragQuestionUI.prototype.removeFromSlot = function (slotNum) {
  this.slots[slotNum] = null;
  this.render();
  this.emitChange();
};

WDragQuestionUI.prototype.returnToPool = function (code) {
  if (this.slots[1] === code) this.slots[1] = null;
  if (this.slots[2] === code) this.slots[2] = null;
  this.render();
  this.emitChange();
};

WDragQuestionUI.prototype.render = function () {
  const b = this.bank;
  const q = this.question;
  const placed = this.getPlacedCodes();

  this.root.innerHTML = `
    <p class="w-drag-instruction">${escapeWHtml(b.instruction)}</p>
    <div class="w-drag-layout">
      <div class="w-drag-col w-drag-col--options">
        <div class="w-drag-col-title">选项</div>
        <div class="w-options-pool" data-drop-pool="1"></div>
      </div>
      <div class="w-drag-col w-drag-col--slots">
        <div class="w-slot-wrap">
          <div class="w-slot-label">${escapeWHtml(b.slot1_label)}</div>
          <div class="w-slot" data-slot="1"></div>
        </div>
        <div class="w-slot-wrap">
          <div class="w-slot-label">${escapeWHtml(b.slot2_label)}</div>
          <div class="w-slot" data-slot="2"></div>
        </div>
      </div>
    </div>`;

  const pool = this.root.querySelector('.w-options-pool');
  const slotEls = {
    1: this.root.querySelector('[data-slot="1"]'),
    2: this.root.querySelector('[data-slot="2"]')
  };

  const makeCard = (opt, inSlot, slotNum) => {
    const card = document.createElement('div');
    card.className = 'w-option-card' + (inSlot ? ' w-option-card--placed' : '');
    card.draggable = true;
    card.dataset.code = opt.code;
    card.innerHTML = `<span class="w-option-code">${opt.code}</span><span class="w-option-text">${escapeWHtml(opt.text)}</span>`;
    this.bindCardEvents(card, opt.code, inSlot, slotNum);
    return card;
  };

  (q.options || []).forEach((opt) => {
    if (placed.includes(opt.code)) return;
    pool.appendChild(makeCard(opt, false, null));
  });

  [1, 2].forEach((sn) => {
    const code = this.slots[sn];
    const slotEl = slotEls[sn];
    if (code) {
      const opt = (q.options || []).find((o) => o.code === code);
      if (opt) {
        slotEl.classList.add('w-slot--filled');
        slotEl.appendChild(makeCard(opt, true, sn));
        return;
      }
    }
    slotEl.classList.remove('w-slot--filled');
    slotEl.innerHTML = `<span class="w-slot-hint">${escapeWHtml(sn === 1 ? b.slot1_hint : b.slot2_hint)}</span>`;
    this.bindSlotDrop(slotEl, sn);
  });

  this.bindPoolDrop(pool);
};

WDragQuestionUI.prototype.bindSlotDrop = function (slotEl, slotNum) {
  slotEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    slotEl.classList.add('w-slot--highlight');
  });
  slotEl.addEventListener('dragleave', () => slotEl.classList.remove('w-slot--highlight'));
  slotEl.addEventListener('drop', (e) => {
    e.preventDefault();
    slotEl.classList.remove('w-slot--highlight');
    const code = e.dataTransfer.getData('text/w-code') || (this.dragState && this.dragState.code);
    if (code) this.placeInSlot(slotNum, code);
    this.endPointerDrag();
  });
};

WDragQuestionUI.prototype.bindPoolDrop = function (poolEl) {
  poolEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    poolEl.classList.add('w-pool--highlight');
  });
  poolEl.addEventListener('dragleave', () => poolEl.classList.remove('w-pool--highlight'));
  poolEl.addEventListener('drop', (e) => {
    e.preventDefault();
    poolEl.classList.remove('w-pool--highlight');
    const code = e.dataTransfer.getData('text/w-code') || (this.dragState && this.dragState.code);
    if (code) this.returnToPool(code);
    this.endPointerDrag();
  });
};

WDragQuestionUI.prototype.bindCardEvents = function (card, code, inSlot, slotNum) {
  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/w-code', code);
    e.dataTransfer.effectAllowed = 'move';
    card.classList.add('w-option-card--dragging');
    this.dragState = { code, fromSlot: inSlot ? slotNum : null };
  });
  card.addEventListener('dragend', () => {
    card.classList.remove('w-option-card--dragging');
    this.root.querySelectorAll('.w-slot--highlight, .w-pool--highlight').forEach((el) => {
      el.classList.remove('w-slot--highlight', 'w-pool--highlight');
    });
    this.dragState = null;
  });

  let touchStart = null;
  card.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, code, fromSlot: inSlot ? slotNum : null };
    this.longPressTimer = setTimeout(() => {
      this.startPointerDrag(card, touchStart);
      try { e.preventDefault(); } catch (err) {}
    }, 320);
  }, { passive: false });

  card.addEventListener('touchmove', (e) => {
    if (!touchStart) return;
    const dx = Math.abs(e.touches[0].clientX - touchStart.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.y);
    if (dx > 8 || dy > 8) clearTimeout(this.longPressTimer);
    if (this.dragState && this.dragState.ghost) {
      e.preventDefault();
      this.movePointerDrag(e.touches[0].clientX, e.touches[0].clientY);
      this.highlightDropTarget(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: false });

  card.addEventListener('touchend', () => {
    clearTimeout(this.longPressTimer);
    if (this.dragState && this.dragState.ghost) {
      const last = this.dragState.lastPoint;
      if (last) this.dropAtPoint(last.x, last.y);
      this.endPointerDrag();
    }
    touchStart = null;
  });

  card.addEventListener('touchcancel', () => {
    clearTimeout(this.longPressTimer);
    this.endPointerDrag();
    touchStart = null;
  });

  if (inSlot && slotNum) {
    card.addEventListener('dblclick', () => this.removeFromSlot(slotNum));
  }
};

WDragQuestionUI.prototype.startPointerDrag = function (card, info) {
  vibrateLight();
  const rect = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.add('w-option-card--ghost');
  ghost.style.width = rect.width + 'px';
  document.body.appendChild(ghost);
  this.dragState = {
    code: info.code,
    fromSlot: info.fromSlot,
    ghost,
    lastPoint: { x: info.x, y: info.y }
  };
  card.classList.add('w-option-card--dragging');
  this.movePointerDrag(info.x, info.y);
};

WDragQuestionUI.prototype.movePointerDrag = function (x, y) {
  if (!this.dragState || !this.dragState.ghost) return;
  const g = this.dragState.ghost;
  g.style.left = x - g.offsetWidth / 2 + 'px';
  g.style.top = y - 24 + 'px';
  this.dragState.lastPoint = { x, y };
};

WDragQuestionUI.prototype.highlightDropTarget = function (x, y) {
  this.root.querySelectorAll('.w-slot--highlight, .w-pool--highlight').forEach((el) => {
    el.classList.remove('w-slot--highlight', 'w-pool--highlight');
  });
  const el = document.elementFromPoint(x, y);
  if (!el) return;
  const slot = el.closest('[data-slot]');
  const pool = el.closest('[data-drop-pool]');
  if (slot) slot.classList.add('w-slot--highlight');
  else if (pool) pool.classList.add('w-pool--highlight');
};

WDragQuestionUI.prototype.dropAtPoint = function (x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return;
  const slot = el.closest('[data-slot]');
  const pool = el.closest('[data-drop-pool]');
  const code = this.dragState.code;
  if (slot) this.placeInSlot(parseInt(slot.dataset.slot, 10), code);
  else if (pool) this.returnToPool(code);
};

WDragQuestionUI.prototype.endPointerDrag = function () {
  if (!this.dragState) return;
  if (this.dragState.ghost) this.dragState.ghost.remove();
  this.root.querySelectorAll('.w-option-card--dragging').forEach((c) => c.classList.remove('w-option-card--dragging'));
  this.root.querySelectorAll('.w-slot--highlight, .w-pool--highlight').forEach((el) => {
    el.classList.remove('w-slot--highlight', 'w-pool--highlight');
  });
  this.dragState = null;
};

WDragQuestionUI.prototype.destroy = function () {
  clearTimeout(this.longPressTimer);
  this.endPointerDrag();
  if (this.root) this.root.innerHTML = '';
};

function mountWDragQuestion(rootEl, bank, question, savedAnswer, onChange) {
  return new WDragQuestionUI(rootEl, bank, question, savedAnswer, onChange);
}

if (typeof window !== 'undefined') {
  window.WDragUI = { mountWDragQuestion, escapeWHtml };
}
