console.log('✅ result-generator.js loaded');

/** T 层展示用维度名称（雷达图与列表） */
const T_DIM_DISPLAY = {
  T1_language: { short: "T1", name: "语言智能", color: "#60a5fa" },
  T2_logic: { short: "T2", name: "逻辑智能", color: "#34d399" },
  T3_spatial: { short: "T3", name: "空间智能", color: "#f59e0b" },
  T4_music: { short: "T4", name: "音乐智能", color: "#f472b6" },
  T5_bodily: { short: "T5", name: "身体智能", color: "#f97316" },
  T6_interpersonal: { short: "T6", name: "人际智能", color: "#10b981" },
  T7_intrapersonal: { short: "T7", name: "内省智能", color: "#a78bfa" },
  T8_naturalist: { short: "T8", name: "自然智能", color: "#84cc16" }
};

const T_DIM_ORDER = [
  "T1_language", "T2_logic", "T3_spatial", "T4_music",
  "T5_bodily", "T6_interpersonal", "T7_intrapersonal", "T8_naturalist"
];

/** 优势天赋解读（仅天赋，无职业） */
const T_TALENT_INTERPRETATIONS = {
  T2_logic: {
    title: "逻辑智能",
    body: `
      <p>逻辑智能帮助孩子分析问题、理解规律并形成判断。</p>
      <p><strong>长期会影响：</strong></p>
      <ul>
        <li>判断力</li>
        <li>决策能力</li>
        <li>独立思考能力</li>
      </ul>
      <p>在 AI 时代，逻辑智能越强，越不容易被错误信息误导，也更容易识别风险与机会。</p>
    `
  },
  T1_language: {
    title: "语言智能",
    body: `
      <p>语言智能帮助孩子表达想法、沟通观点并建立影响力。</p>
      <p><strong>长期会影响：</strong></p>
      <ul>
        <li>表达能力</li>
        <li>沟通能力</li>
        <li>影响力</li>
        <li>领导力</li>
      </ul>
      <p>很多机会来自于：让别人理解自己的价值。</p>
    `
  },
  T6_interpersonal: {
    title: "人际智能",
    body: `
      <p>人际智能帮助孩子理解他人、建立信任并形成合作关系。</p>
      <p><strong>长期会影响：</strong></p>
      <ul>
        <li>亲子关系</li>
        <li>友情关系</li>
        <li>爱情与婚姻关系</li>
        <li>团队合作能力</li>
      </ul>
      <p>良好的人际关系是影响人生幸福感的重要因素之一。</p>
    `
  },
  T7_intrapersonal: {
    title: "内省智能",
    body: `
      <p>内省智能帮助孩子认识自己、发现优势并持续调整成长方向。</p>
      <p><strong>长期会影响：</strong></p>
      <ul>
        <li>自我认知能力</li>
        <li>情绪管理能力</li>
        <li>长期成长能力</li>
      </ul>
      <p>很多人努力多年却走错方向，本质上是不够了解自己。</p>
    `
  },
  T3_spatial: {
    title: "空间智能",
    body: `
      <p>空间智能帮助孩子理解形状、结构、位置关系与视觉信息。</p>
      <p><strong>长期会影响：</strong></p>
      <ul>
        <li>空间想象与构图能力</li>
        <li>对复杂结构的把握</li>
        <li>动手与设计的协调感</li>
      </ul>
    `
  },
  T4_music: {
    title: "音乐智能",
    body: `
      <p>音乐智能帮助孩子感知节奏、旋律与声音之美。</p>
      <p><strong>长期会影响：</strong></p>
      <ul>
        <li>节奏感与听觉敏感度</li>
        <li>对旋律与情绪的觉察</li>
        <li>表达中的韵律与感染力</li>
      </ul>
    `
  },
  T5_bodily: {
    title: "身体智能",
    body: `
      <p>身体智能帮助孩子协调动作、运用身体完成具体任务。</p>
      <p><strong>长期会影响：</strong></p>
      <ul>
        <li>身体协调与运动表现</li>
        <li>动手实践中的稳定性</li>
        <li>通过身体学习理解世界的方式</li>
      </ul>
    `
  },
  T8_naturalist: {
    title: "自然智能",
    body: `
      <p>自然智能帮助孩子观察自然现象、识别模式并理解系统变化。</p>
      <p><strong>长期会影响：</strong></p>
      <ul>
        <li>观察与归纳能力</li>
        <li>对环境与系统的敏感度</li>
        <li>持续探索与好奇心</li>
      </ul>
    `
  }
};

const LIFELONG_ABILITIES = [
  {
    key: "judgment",
    title: "判断力",
    dimKey: "T2_logic",
    dimLabel: "逻辑智能（T2）",
    color: "#34d399",
    body: `
      <p>帮助孩子独立思考、分析问题、判断信息真伪、做出理性决策。</p>
      <p>在信息爆炸和 AI 时代，判断力越强，越不容易被误导。</p>
    `
  },
  {
    key: "expression",
    title: "表达力",
    dimKey: "T1_language",
    dimLabel: "语言智能（T1）",
    color: "#60a5fa",
    body: `
      <p>帮助孩子表达想法、展示价值、沟通合作、获得机会。</p>
      <p>很多机会不仅来自能力，更来自于能否清晰表达自己。</p>
    `
  },
  {
    key: "happiness",
    title: "幸福力",
    dimKey: "T6_interpersonal",
    dimLabel: "人际智能（T6）",
    color: "#10b981",
    body: `
      <p>人际智能是建立良好人际关系的重要基础。帮助孩子建立亲情、友情、爱情与团队关系。</p>
      <p>大量研究发现：良好的人际关系，是影响人生幸福感和生活满意度的重要因素之一。</p>
    `
  },
  {
    key: "cognition",
    title: "认知力",
    dimKey: "T7_intrapersonal",
    dimLabel: "内省智能（T7）",
    color: "#a78bfa",
    body: `
      <p>帮助孩子认识自己、调整方向、持续成长。</p>
      <p>认知力越强，越容易找到适合自己的成长道路。</p>
    `
  }
];

const KEY_GROWTH_DIMS = ["T2_logic", "T1_language", "T6_interpersonal", "T7_intrapersonal"];
const ADVANTAGE_MIN_PCT = 75;

/** 0–10 制转 0–100 整数展示 */
function toDisplayPct(raw) {
  const n = Number(raw) || 0;
  if (n <= 10) return Math.round(n * 10);
  return Math.round(n);
}

const GROWTH_REMINDER_LOW_COPY = {
  T2_logic: {
    title: "逻辑智能",
    affects: ["判断力", "分析能力", "决策能力"],
    suggest: "建议在成长过程中有意识地培养孩子的逻辑思维与独立思考能力。"
  },
  T1_language: {
    title: "语言智能",
    affects: ["表达能力", "沟通能力", "影响力"],
    suggest: "建议增加阅读、表达和沟通训练。"
  },
  T6_interpersonal: {
    title: "人际智能",
    affects: ["亲情关系", "友情关系", "团队合作能力"],
    suggest: "建议增加真实社交、合作与沟通体验。"
  },
  T7_intrapersonal: {
    title: "内省智能",
    affects: ["自我认知", "情绪管理", "人生方向选择"],
    suggest: "建议培养反思、总结和自我观察习惯。"
  }
};

function renderAll(result, userData) {
  renderHeader(result, userData);
  if (result.radarData) renderRadar(result.radarData);
  renderRadarScoreList(result.scores);
  const advantageKeys = renderAdvantageTalents(result.scores);
  renderTalentInterpretations(advantageKeys, result.scores);
  renderLifelongAbilities(result.scores);
  renderGrowthReminder(result.scores);
  renderParentRoadmap(result);

  // 后台仍保存 T 分与职业数据，供 P 层与寻路者解锁流程使用（本页不展示职业）
  try {
    if (result.scores) {
      localStorage.setItem('talentai_t_scores', JSON.stringify(result.scores));
      console.log('✅ T层8维天赋分已保存:',
        Object.fromEntries(Object.entries(result.scores).map(([k,v])=>[k, v.displayScore])));
    }
    if (result.careerRecommendations && result.careerRecommendations.length > 0) {
      localStorage.setItem('talentai_t_careers_raw', JSON.stringify(result.careerRecommendations));
      if (window.TCareersStore) {
        TCareersStore.saveFromCareerList(result.careerRecommendations);
      }
    }
  } catch(e) { console.warn('保存T层分数失败:', e); }
}

function renderHeader(result, userData) {
  const now = new Date();
  const reportTime = document.getElementById('report-time');
  if (reportTime) reportTime.textContent = now.toLocaleString('zh-CN');

  const minutes = estimateMinutes(userData.timings);
  const ct = document.getElementById('completion-time');
  if (ct) ct.textContent = minutes;

  const countEl = document.getElementById('completion-count');
  if (countEl) countEl.textContent = '32/32';
}

function estimateMinutes(timings) {
  const vals = Object.values(timings || {});
  if (vals.length === 0) return '-';
  const seconds = vals.reduce((a,b)=>a+(Number(b)||0),0);
  return Math.max(1, Math.round(seconds/60));
}

function talentDimBar(name, val, color, desc) {
  const pct = toDisplayPct(val);
  return `
    <div class="dim-bar-wrap">
      <div class="dim-bar-label">
        <div class="left">
          <span>${name}</span>
          <small>${desc || ""}</small>
        </div>
        <strong style="color:${color}">${pct}</strong>
      </div>
      <div class="dim-bar-track">
        <div class="dim-bar-fill" data-pct="${pct}" style="background:${color}"></div>
      </div>
    </div>
  `;
}

function animateTalentBars() {
  const wrap = document.getElementById("talent-bars");
  if (!wrap) return;
  wrap.querySelectorAll(".dim-bar-fill").forEach(el => {
    const pct = el.getAttribute("data-pct") || "0";
    requestAnimationFrame(() => { el.style.width = pct + "%"; });
  });
}

function renderTalentBars(scores) {
  const barsEl = document.getElementById("talent-bars");
  if (!barsEl || !scores) return;

  const entries = T_DIM_ORDER.map((k) => ({
    key: k,
    score: Number(scores[k]?.displayScore ?? 0) || 0,
    ...T_DIM_DISPLAY[k]
  }));

  barsEl.innerHTML = entries.map(e =>
    talentDimBar(e.name, e.score, e.color, e.desc)
  ).join("");
  animateTalentBars();

  const top3 = [...entries].sort((a, b) => b.score - a.score).slice(0, 3);
  const chipsEl = document.getElementById("talent-top3-chips");
  if (chipsEl) {
    chipsEl.innerHTML = top3.map(e =>
      `<span class="chip">${e.name} ${toDisplayPct(e.score)}</span>`
    ).join("");
  }

  const profileEl = document.getElementById("talent-profile");
  if (profileEl) {
    let profile = "你的 T 层分布较均衡，说明你具备多维度的潜力。";
    if (top3.length) {
      profile = `你的前三大天赋分别是 <strong>${top3[0].name}</strong>、<strong>${top3[1]?.name || "-"}</strong>、<strong>${top3[2]?.name || "-"}</strong>。这意味着你在这些维度对应的任务中，更容易进入高效区、持续区和优势区。`;
    }
    profileEl.innerHTML = `
      <h3>天赋画像</h3>
      <p>${profile}</p>
      <p style="margin-top:10px">职业匹配中，T 层主要负责两件事：一是判断你是否具备职业资格线，二是识别你最容易形成长期优势的方向。</p>
    `;
  }
}

/* ---------------- Radar（固定尺寸，不随悬停/窗口变化） ---------------- */
var _radarChartInstance = null;

function getScoreEntries(scores) {
  if (!scores) return [];
  return T_DIM_ORDER.map((key) => {
    const score = Number(scores[key]?.displayScore ?? 0) || 0;
    return {
      key,
      score,
      displayPct: toDisplayPct(score),
      ...T_DIM_DISPLAY[key]
    };
  }).sort((a, b) => b.displayPct - a.displayPct || a.key.localeCompare(b.key));
}

/**
 * 优势天赋选取：
 * 1) 全部 ≥75 分；
 * 2) 若不足 3 项，按分数从高到低按档补足至至少 3 项（某一档同分则整档并入）；
 * 3) ≥75 已达 3 项及以上时不再补足。
 */
function pickAdvantageEntries(entries) {
  if (!entries.length) return { items: [], balanced: false };

  const sorted = [...entries];
  const high = sorted.filter((e) => e.displayPct >= ADVANTAGE_MIN_PCT);

  if (high.length >= 3) {
    return { items: high, balanced: false };
  }

  const seen = new Set();
  const items = [];

  const addTier = (tier) => {
    tier.forEach((e) => {
      if (!seen.has(e.key)) {
        seen.add(e.key);
        items.push(e);
      }
    });
  };

  addTier(high);

  let i = 0;
  while (i < sorted.length && items.length < 3) {
    const pct = sorted[i].displayPct;
    const tier = [];
    while (i < sorted.length && sorted[i].displayPct === pct) {
      tier.push(sorted[i]);
      i++;
    }
    addTier(tier);
  }

  return { items, balanced: high.length === 0 };
}

function renderAdvantageTalents(scores) {
  const listEl = document.getElementById('advantage-talent-list');
  const noteEl = document.getElementById('advantage-talent-note');
  const headingEl = document.getElementById('advantage-section-heading');
  if (!listEl) return [];

  const entries = getScoreEntries(scores);
  const { items, balanced } = pickAdvantageEntries(entries);

  if (headingEl) {
    headingEl.textContent = balanced ? '② 当前相对优势天赋' : '② 当前优势天赋';
  }

  listEl.innerHTML = items.length
    ? items
        .map(
          (e) =>
            `<li class="advantage-talent-item"><span class="advantage-name">${e.name}</span><span class="advantage-score">（${e.displayPct}）</span></li>`
        )
        .join('')
    : '<li class="advantage-talent-item"><span class="advantage-name">—</span></li>';

  if (noteEl) {
    if (balanced) {
      noteEl.style.display = 'block';
      noteEl.innerHTML =
        '孩子目前没有出现特别突出的单一天赋，整体能力分布较为均衡。未来的发展方向，需要结合性格特征、驱动力、思维模式以及成长经历综合判断。';
    } else {
      noteEl.style.display = 'none';
      noteEl.innerHTML = '';
    }
  }

  return items.map((e) => e.key);
}

function renderTalentInterpretations(advantageKeys, scores) {
  const box = document.getElementById('talent-interpretations');
  if (!box) return;

  const orderedKeys = advantageKeys && advantageKeys.length
    ? [...advantageKeys]
    : getScoreEntries(scores).map((e) => e.key);

  const blocks = orderedKeys
    .filter((k) => T_TALENT_INTERPRETATIONS[k])
    .map((k) => {
      const copy = T_TALENT_INTERPRETATIONS[k];
      return `
        <article class="talent-interpret-card">
          <h3>【${copy.title}】</h3>
          <div class="talent-interpret-body">${copy.body}</div>
        </article>
      `;
    });

  box.innerHTML = blocks.length
    ? blocks.join('')
    : '<p class="section-desc">暂无优势天赋解读数据。</p>';
}

function renderLifelongAbilities(scores) {
  const box = document.getElementById('lifelong-abilities');
  if (!box) return;

  const entries = getScoreEntries(scores);
  const byKey = Object.fromEntries(entries.map((e) => [e.key, e]));

  box.innerHTML = LIFELONG_ABILITIES.map((item) => {
    const linked = byKey[item.dimKey];
    const scoreNote = linked
      ? `<span class="lifelong-score">当前 ${linked.name}：${linked.displayPct}</span>`
      : '';
    return `
      <article class="lifelong-card">
        <h3 class="lifelong-title" style="border-color:${item.color}">${item.title}</h3>
        <p class="lifelong-dim">对应：${item.dimLabel}</p>
        ${scoreNote}
        <div class="lifelong-body">${item.body}</div>
      </article>
    `;
  }).join('');
}

function renderRadarScoreList(scores) {
  const el = document.getElementById('radar-score-list');
  if (!el || !scores) return;

  const byKey = Object.fromEntries(getScoreEntries(scores).map((e) => [e.key, e]));
  el.innerHTML = T_DIM_ORDER.map((key) => {
    const e = byKey[key];
    if (!e) return '';
    return `<li class="radar-score-item"><span class="radar-score-name">${e.name}</span><span class="radar-score-val">${e.displayPct}</span></li>`;
  }).join('');
}

function renderRadar(radarData) {
  const canvas = document.getElementById('radar-chart');
  if (!canvas) return;

  const container = canvas.parentElement;
  if (container) {
    container.classList.add('radar-container');
  }

  const engineNameToKey = {
    "语言智能": "T1_language",
    "逻辑数学智能": "T2_logic",
    "逻辑智能": "T2_logic",
    "空间智能": "T3_spatial",
    "音乐智能": "T4_music",
    "身体动觉智能": "T5_bodily",
    "身体智能": "T5_bodily",
    "人际智能": "T6_interpersonal",
    "内省智能": "T7_intrapersonal",
    "自然观察智能": "T8_naturalist",
    "自然智能": "T8_naturalist"
  };

  const labels = radarData.map((x) => {
    const key = x.dimensionKey || engineNameToKey[x.dimension];
    const meta = T_DIM_DISPLAY[key];
    return meta ? `${meta.short} ${meta.name}` : x.dimension;
  });
  const data = radarData.map((x) => toDisplayPct(x.displayScore));

  // 固定宽高，避免 hover 或 resize 导致图表反复缩小
  const size = Math.min(500, (container && container.clientWidth) || 500);
  canvas.width = size;
  canvas.height = size;

  if (_radarChartInstance) {
    _radarChartInstance.destroy();
    _radarChartInstance = null;
  }

  _radarChartInstance = new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: '你的天赋得分',
        data,
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderColor: 'rgba(102, 126, 234, 1)',
        borderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: false,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 28, right: 40, bottom: 28, left: 36 }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 20,
            callback: (v) => (Number(v) % 20 === 0 ? v : '')
          },
          pointLabels: {
            font: { size: 12 },
            padding: 10
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const pct = toDisplayPct(ctx.raw);
              return `${ctx.label}: ${pct}`;
            }
          }
        }
      }
    }
  });
}

/* ---------------- Top3 ---------------- */
function renderTop3(top3) {
  const box = document.getElementById('top3-talents');
  if (!box) return;

  box.innerHTML = top3.map(t => {
    return `
      <div class="talent-card rank-${t.rank}">
        <div class="talent-rank">${t.medal} 第${t.rank}名</div>
        <h3>${t.dimensionName}</h3>
        <div class="talent-score">
          <span class="score-value">${t.score.toFixed(1)}</span>
          <span class="score-max">/10</span>
        </div>
        <div class="talent-percent">${t.relativeLevel}</div>

        <div class="talent-desc" style="margin-top:10px;">
          <strong>这意味着什么</strong>
          <p style="margin:6px 0 0;">${t.meaning}</p>
        </div>

        <div class="talent-how" style="margin-top:10px;">
          <strong>如何发挥这项天赋</strong>
          <ul style="margin:6px 0 0;">
            ${t.how.map(x => `<li>${x}</li>`).join('')}
          </ul>
        </div>

        <div class="talent-careers" style="margin-top:10px;">
          <strong>适合的职业方向</strong>
          <p style="margin:6px 0 0;">${t.careers.join('、')}</p>
        </div>
      </div>
    `;
  }).join('');
}

function renderCombination(analysis) {
  const box = document.getElementById('talent-combination');
  if (!box) return;

  box.innerHTML = `
    <h3>💎 你的天赋组合特点</h3>
    <div class="combination-type"><strong>${analysis.combinationType}</strong></div>
    <p style="margin-top:8px;">${analysis.description}</p>

    ${analysis.fit && analysis.fit.length ? `
      <div style="margin-top:10px;">
        <strong>这种组合特别适合：</strong>
        <ul style="margin:6px 0 0;">
          ${analysis.fit.map(x=>`<li>${x}</li>`).join('')}
        </ul>
      </div>
    `:''}

    <div style="margin-top:10px;">
      <strong>技能迁移建议</strong>
      <p style="margin:6px 0 0;">🆕 ${analysis.migrateTip}</p>
    </div>
  `;
}

function renderConflicts(warnings) {
  const card = document.getElementById('conflict-warnings');
  const list = document.getElementById('conflict-list');
  if (!card || !list) return;

  if (!warnings || warnings.length === 0) return;

  list.innerHTML = warnings.map(w => `<li>${w}</li>`).join('');
  card.style.display = 'block';
}

/* ---------------- Families ---------------- */
function renderFamilies(familiesSorted) {
  const box = document.getElementById('career-families');
  if (!box) return;

  // 只展示前8个（其实就8个）
  const list = (familiesSorted || []).slice(0, 8);

  box.innerHTML = list.map((f, idx) => `
    <div class="family-card ${idx===0?'recommended':''}">
      ${idx===0?'<div class="recommend-badge">最匹配</div>':''}
      <h3>${f.icon} ${f.familyName}</h3>
      <div class="family-score">
        <div class="score-bar"><div class="score-fill" style="width:${f.matchScore}%"></div></div>
        <span class="score-text">${f.matchScore}%</span>
      </div>
      <p class="family-desc" style="margin-top:8px;">🆕 技能迁移建议：${f.migrateTip || '—'}</p>
    </div>
  `).join('');
}

/* ---------------- Careers ---------------- */
function isPathfinderPaid() {
  return (
    localStorage.getItem('talentai_premium') === '1' ||
    localStorage.getItem('talentai_paid') === '1' ||
    localStorage.getItem('talentai_p_paid') === '1'
  );
}

/* ── 解锁流程入口（¥29 寻路者套餐：跳转微信支付页，付成功后由 payment 页进入 P 层测评） ── */
function buyPackage(type) {
  if (type !== 'pathfinder') {
    window.location.href = 'wma_payment.html';
    return;
  }
  window.location.href = 'payment.html?package=pathfinder';
}

function _doUnlockAnimation() {
  // 播放 Web Audio 解锁音效
  _playSFX_unlock();

  // 找到两张锁定卡片
  const card1 = document.getElementById('locked-career-0');
  const card3 = document.getElementById('locked-career-2');

  // 第1名解锁
  setTimeout(() => _dissolveCard(card1, 0), 400);
  // 第3名解锁
  setTimeout(() => _dissolveCard(card3, 2), 1200);

  // 写入已付费状态
  setTimeout(() => {
    localStorage.setItem('talentai_premium', '1');
  }, 800);

  // 解锁完成后跳转P层测评
  setTimeout(() => {
    _showRedirectBanner();
  }, 2400);

  setTimeout(() => {
    window.location.href = 'p-layer.html'; // ← 改成你的P层测评页路径
  }, 4000);
}

function _dissolveCard(card, idx) {
  if (!card) return;

  // 移除马赛克遮罩
  const mosaic = card.querySelector('.unlock-mosaic');
  if (mosaic) {
    mosaic.style.transition = 'opacity 0.8s ease';
    mosaic.style.opacity = '0';
    setTimeout(() => mosaic.remove(), 900);
  }

  // 锁图标变解锁
  const lockIco = card.querySelector('.lock-icon');
  if (lockIco) {
    lockIco.textContent = '🔓';
    lockIco.style.filter = 'drop-shadow(0 0 10px #00ff88)';
  }

  // 揭晓职业名称（从隐藏数据属性读取）
  const nameEl = card.querySelector('.career-name-hidden');
  const rankEl = card.querySelector('.career-rank');
  if (nameEl && rankEl) {
    const realName = nameEl.dataset.name;
    const rankBadge = nameEl.dataset.badge;
    setTimeout(() => {
      _typeReveal(rankEl, `${rankBadge} 第${idx+1}名：${realName} ✨`, 40);
    }, 700);
  }

  // 解锁成功标记
  setTimeout(() => {
    const unlockMsg = card.querySelector('.unlock-msg');
    if (unlockMsg) {
      unlockMsg.style.display = 'block';
      unlockMsg.style.animation = 'fadeInUp 0.5s ease';
    }
  }, 1200);
}

function _typeReveal(el, text, speed) {
  el.textContent = '';
  let i = 0;
  const t = setInterval(() => {
    if (i < text.length) { el.textContent += text[i]; i++; }
    else clearInterval(t);
  }, speed);
}

function _showRedirectBanner() {
  // 在页面顶部插入跳转提示横幅
  const banner = document.createElement('div');
  banner.style.cssText = `
    position:fixed; top:0; left:0; right:0; z-index:9999;
    background:linear-gradient(135deg,#0a1628,#1a3060);
    border-bottom:2px solid rgba(240,192,96,0.6);
    padding:16px 24px; text-align:center;
    font-family:monospace; font-size:14px; color:#f0c060;
    animation:slideDown 0.4s ease;
  `;
  banner.innerHTML = `
    <style>@keyframes slideDown{from{transform:translateY(-100%)}to{transform:translateY(0)}}</style>
    🔓 解锁成功！正在跳转到 P层性格测评... &nbsp;
    <span id="countdown-num" style="font-size:18px;font-weight:700">3</span>
  `;
  document.body.prepend(banner);

  // 倒计时
  let n = 3;
  const cd = setInterval(() => {
    n--;
    const el = document.getElementById('countdown-num');
    if (el) el.textContent = n;
    if (n <= 0) clearInterval(cd);
  }, 500);
}

function _playSFX_unlock() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, type, start, dur, vol) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = type; osc.frequency.value = freq;
      const t = ctx.currentTime + start;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.start(t); osc.stop(t + dur);
    };
    play(440, 'square', 0.0,  0.06, 0.08);
    play(880, 'square', 0.08, 0.06, 0.08);
    play(1320,'square', 0.16, 0.08, 0.10);
    play(1760,'sine',   0.26, 0.15, 0.12);
    [523,659,784,1047].forEach((f,i) => play(f,'sine', 0.44+i*0.04, 0.4, 0.06));
  } catch(e) {}
}

function _buildMosaicCells(count, cellClass) {
  const cls = cellClass || 'mosaic-cell';
  const palette = [
    'rgba(42, 28, 88, 0.94)', 'rgba(55, 36, 110, 0.92)', 'rgba(36, 24, 78, 0.96)',
    'rgba(68, 48, 130, 0.9)', 'rgba(30, 22, 68, 0.95)', 'rgba(82, 58, 148, 0.88)'
  ];
  return Array.from({ length: count }).map(() => {
    const dur = (1.2 + Math.random() * 1.4).toFixed(2);
    const delay = (Math.random() * 2).toFixed(2);
    const bg = palette[Math.floor(Math.random() * palette.length)];
    return '<div class="' + cls + '" style="--mosaic-dur:' + dur + 's;--mosaic-delay:' + delay + 's;background:' + bg + '"></div>';
  }).join('');
}

/* 生成锁定卡片（第1/3名：深紫渐变 + 动画马赛克 + 局部遮挡名称/匹配度） */
function _buildLockedCard(c, idx) {
  const rankBadge = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][idx] || `${idx + 1}️⃣`;
  const kwMap = {
    0: ['逻辑架构', '系统设计', 'AI · 未来', '深度思考'],
    2: ['数据洞察', '分析决策', '模式识别', 'AI放大器']
  };
  const kws = kwMap[idx] || ['职业天赋', '未来赛道', '核心能力', 'AI时代'];
  const mosaicCells = _buildMosaicCells(96, 'mosaic-cell');
  const nameMosaicCells = _buildMosaicCells(12, 'mosaic-cell mosaic-cell--mini');
  const matchMosaicCells = _buildMosaicCells(8, 'mosaic-cell mosaic-cell--mini');

  const salaryLabel = window.FormatLabels ? FormatLabels.formatSalaryValue(c.aiImpact?.salaryRange) : (c.aiImpact?.salaryRange || '—');
  const repRisk = c.aiImpact?.replacementRisk != null ? `${c.aiImpact.replacementRisk}%` : '—';
  const newbie = c.aiImpact?.newbieAdvantage != null ? `${c.aiImpact.newbieAdvantage}%` : '—';

  return `
    <div class="career-card locked-career-card" id="locked-career-${idx}" data-pdf-block="career">
      <div class="locked-career-ghost" aria-hidden="true">
        <div class="ghost-match-big">${c.matchScore}%</div>
        <div class="ghost-desc">${escapeHtml(c.description || '该职业与你的天赋结构高度契合，解锁后可查看完整解读与 AI 时代路径。')}</div>
        <div class="ghost-meta-row">
          <span class="ghost-tag">AI替代风险 ${repRisk}</span>
          <span class="ghost-tag">新人优势 ${newbie}</span>
          <span class="ghost-tag">薪资 ${salaryLabel}</span>
        </div>
      </div>
      <div class="locked-career-keywords" aria-hidden="true">
        ${kws.map((k) => `<span>${k}</span>`).join('')}
      </div>
      <div class="unlock-mosaic" aria-hidden="true">${mosaicCells}</div>
      <div class="locked-career-body">
        <div class="locked-career-header">
          <span class="lock-icon" aria-hidden="true">🔒</span>
          <span class="locked-career-rank">${rankBadge} 第${idx + 1}名：
            <span class="locked-field-mask locked-name-field">
              <span class="locked-field-text">${escapeHtml(c.name)}</span>
              <span class="field-mosaic field-mosaic--name" aria-hidden="true">${nameMosaicCells}</span>
            </span>
          </span>
          <span class="locked-career-match">匹配度：
            <span class="locked-field-mask locked-match-field">
              <strong class="locked-field-text">${c.matchScore}%</strong>
              <span class="field-mosaic field-mosaic--match" aria-hidden="true">${matchMosaicCells}</span>
            </span>
          </span>
        </div>
        <span class="career-name-hidden" data-name="${escapeHtml(c.name)}" data-badge="${rankBadge}" hidden></span>
        <div class="locked-career-hint">
          <p>💡 <strong>为什么这个职业值得关注？</strong></p>
          <p style="margin-top:8px">你的天赋匹配度高达 <span class="match-highlight">${c.matchScore}%</span>，但在 AI 时代其替代风险和适配路径完全不同。解锁后查看：如何用你的天赋组合在这条赛道形成<strong>护城河</strong>。</p>
        </div>
      </div>
    </div>
  `;
}

const T_DIM_LABELS = {
  T1_language: '语言智能',
  T2_logic: '逻辑数学',
  T3_spatial: '空间智能',
  T4_music: '音乐智能',
  T5_bodily: '身体动觉',
  T6_interpersonal: '人际智能',
  T7_intrapersonal: '内省智能',
  T8_naturalist: '自然观察'
};

function mapCareerDimKey(k) {
  if (k && k.includes('_') && k.startsWith('T')) return k;
  const map = {
    T1: 'T1_language', T2: 'T2_logic', T3: 'T3_spatial', T4: 'T4_music',
    T5: 'T5_bodily', T6: 'T6_interpersonal', T7: 'T7_intrapersonal', T8: 'T8_naturalist'
  };
  return map[k] || k;
}

/** 匹配度构成：仅展示 T 层实测维度分 + AI 适配（无家族/能力结构等未采集项） */
function buildMatchCompositionHtml(c, scores) {
  const parts = [];
  parts.push(
    `<p style="margin-top:4px;font-size:14px;"><strong>综合匹配度：${c.matchScore}%</strong></p>`
  );

  const req = c.requiredAbilities || {};
  const dimLines = Object.entries(req)
    .map(([key, target]) => {
      const dimKey = mapCareerDimKey(key);
      const user = scores?.[dimKey]?.displayScore;
      if (user == null || target == null) return null;
      const label = T_DIM_LABELS[dimKey] || dimKey;
      return `${label}：${Number(user).toFixed(1)} / 10（本职业关键要求 ${target}）`;
    })
    .filter(Boolean)
    .slice(0, 4);

  if (dimLines.length) {
    parts.push(
      `<p style="margin-top:8px;opacity:.92;font-size:13px;line-height:1.55;">` +
      `<strong>T 层核心天赋得分</strong><br/>${dimLines.join('<br/>')}</p>`
    );
  }

  const ai = c.aiImpact || {};
  const aiBits = [];
  if (ai.newbieAdvantage != null) aiBits.push(`新人优势 ${ai.newbieAdvantage}%`);
  if (ai.collaborationPotential != null) aiBits.push(`人机协作潜力 ${ai.collaborationPotential}%`);
  if (ai.replacementRisk != null) aiBits.push(`AI 替代风险 ${ai.replacementRisk}%`);
  if (aiBits.length) {
    parts.push(
      `<p style="margin-top:8px;opacity:.92;font-size:13px;line-height:1.55;">` +
      `<strong>AI 时代适配</strong><br/>${aiBits.join(' · ')}</p>`
    );
  }

  return parts.join('');
}

function renderCareers(top5, scores) {
  const box = document.getElementById('career-list');
  if (!box) return;

  // T 层结果页：第 1、3 名职业始终锁定；完整内容在 pathfinder-unlock.html
  const hideIndex = [0, 2];

  // 注入锁定卡片辅助动画 CSS（主样式在 result.css）
  if (!document.getElementById('mosaic-style')) {
    const style = document.createElement('style');
    style.id = 'mosaic-style';
    style.textContent = `
      .locked-career-card { cursor:default; }
      @keyframes fadeInUp {
        from { opacity:0; transform:translateY(8px); }
        to   { opacity:1; transform:translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  box.innerHTML = top5.map((c, idx) => {
    const rankBadge = ['🥇','🥈','🥉','4️⃣','5️⃣'][idx] || `${idx+1}️⃣`;
    const wear = wearLevelFromMatch(c.matchScore);
    const sim = buildAISim(c);

    // 锁定卡片
    if (hideIndex.includes(idx)) {
      return _buildLockedCard(c, idx);
    }

    // 展示职业（第2/4/5）
    return `
      <div class="career-card career-card--open" data-pdf-block="career">
        <div class="career-header">
          <div class="career-rank">${rankBadge} 第${idx+1}名：${escapeHtml(c.name)}</div>
        </div>
        <div class="career-match">${c.matchScore}%</div>

        <p class="career-desc">${escapeHtml(c.description || '—')}</p>

        <div class="career-meta">
          <div class="meta-item">
            <span class="meta-label">AI替代风险</span>
            <span class="meta-value">${(c.aiImpact?.replacementRisk ?? '-')}${c.aiImpact?.replacementRisk != null ? '%' : ''}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">新人优势</span>
            <span class="meta-value">${(c.aiImpact?.newbieAdvantage ?? '-')}${c.aiImpact?.newbieAdvantage != null ? '%' : ''}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">${window.FormatLabels ? FormatLabels.salaryMetaLabel() : '薪资范围（参考）'}</span>
            <span class="meta-value">${escapeHtml(window.FormatLabels ? FormatLabels.formatSalaryValue(c.aiImpact?.salaryRange) : (c.aiImpact?.salaryRange || '-'))}</span>
          </div>
        </div>

        <div class="career-why" style="margin-top:12px;">
          <strong>匹配度构成</strong>
          ${buildMatchCompositionHtml(c, scores)}
        </div>

        <div class="career-why" style="margin-top:12px;">
          <strong>核心匹配原因：</strong>
          <ul style="margin:6px 0 0;">
            <li>你的 T 层天赋得分与该职业关键维度要求较为一致</li>
            <li>你更可能在该路径中做出稳定产出</li>
            <li>适合在 AI 工具加持下快速升级</li>
          </ul>
        </div>

        <div class="career-why" style="margin-top:12px;">
          <strong>需要补齐：</strong>
          <ul style="margin:6px 0 0;">
            <li>⚠️ 商业理解（了解业务场景）</li>
            <li>⚠️ 沟通技巧（讲给非技术人听）</li>
          </ul>
        </div>

        <div class="career-why" style="margin-top:12px;">
          <strong>情绪磨损风险：</strong> ${wear.dot} ${wear.text}
          <span style="margin-left:10px;opacity:.9;">能耗等级：${wear.energy}x</span>
        </div>

        <div class="career-why" style="margin-top:12px;">
          <strong>AI演化模拟（5年预测）</strong>
          <pre style="white-space:pre-wrap;margin-top:6px;">${sim}</pre>
        </div>

        ${c.whyNewbieCanWin ? `
          <div class="career-why" style="margin-top:12px;">
            <strong>💡 为什么新人有优势？</strong>
            <p style="margin-top:6px;">${escapeHtml(c.whyNewbieCanWin)}</p>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function wearLevelFromMatch(matchScore) {
  // 这里暂时用匹配度模拟“磨损”，后期你接 P 层会更准
  if (matchScore >= 88) return { dot:'🟢', text:'低', energy:'1.5' };
  if (matchScore >= 80) return { dot:'🟡', text:'中', energy:'2.5' };
  return { dot:'🔴', text:'高', energy:'4.5' };
}

function buildAISim(c) {
  const r = c.aiImpact?.replacementRisk ?? 45;
  const vol = r >= 55 ? '高' : r >= 35 ? '中' : '低';
  const decay = r >= 55 ? '高' : r >= 35 ? '中高' : '低';
  const need = '需要持续学习AI工具';

  return [
    '┌─────────────────────────────┐',
    `│ 如果选择 ${c.name || '该职业'}：`,
    `│ • 5年替代风险：${r}%`,
    `│ • 收入波动性：${vol}`,
    `│ • 技能折旧率：${decay}`,
    `│ • ${need}`,
    '└─────────────────────────────┘'
  ].join('\n');
}

/* ---------------- Parent ---------------- */
function renderGrowthReminder(scores) {
  const box = document.getElementById('growth-reminder');
  if (!box) return;

  const entries = getScoreEntries(scores);
  const keyEntries = KEY_GROWTH_DIMS.map((k) => entries.find((e) => e.key === k)).filter(Boolean);
  const pcts = keyEntries.map((e) => e.displayPct);
  const maxPct = Math.max(...pcts, 0);
  const minPct = Math.min(...pcts, 0);
  const avgPct = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : 0;

  const intro = `
    <div class="growth-reminder-intro">
      <p>TalentAI 不只关注已经突出的优势天赋，也关注孩子未来成长中值得重点培养的关键能力。</p>
      <p>如果某些关键能力当前相对较弱，家长可以从现在开始有意识地训练和提升，帮助孩子形成更完整的能力结构，拥有更好的未来竞争力。</p>
    </div>
  `;

  const fourBalanced = pcts.length === 4 && maxPct - minPct <= 5;
  const lowKeys = keyEntries
    .filter((e) => e.displayPct < maxPct - 5 && e.displayPct < avgPct - 2)
    .map((e) => e.key);

  let focusHtml = '<h3 class="growth-reminder-subtitle">当前值得重点关注的能力</h3>';

  if (fourBalanced || !lowKeys.length) {
    focusHtml += `
      <div class="growth-reminder-balanced insight-box">
        <p>孩子目前关键成长能力发展较为均衡。</p>
        <p>建议继续保持优势发挥，同时通过长期实践不断提升综合能力。</p>
      </div>
    `;
  } else {
    focusHtml += '<div class="growth-reminder-alerts">';
    lowKeys.forEach((k) => {
      const copy = GROWTH_REMINDER_LOW_COPY[k];
      const meta = T_DIM_DISPLAY[k];
      if (!copy) return;
      focusHtml += `
        <article class="growth-reminder-card">
          <h4>${copy.title}${meta ? `（${meta.short}）` : ''}</h4>
          <p><strong>${copy.title}会影响：</strong></p>
          <ul>${copy.affects.map((a) => `<li>${a}</li>`).join('')}</ul>
          <p class="growth-reminder-suggest">${copy.suggest}</p>
        </article>
      `;
    });
    focusHtml += '</div>';
  }

  box.innerHTML = intro + focusHtml;
}

function renderParentRoadmap(result) {
  const box = document.getElementById('parent-roadmap');
  if (!box) return;

  box.innerHTML = `
    <div class="insight-box" style="margin-top:12px;">
      <p>12–18 岁是价值观与自我认知形成的关键期。完成 P、W、M 层测评后，可结合性格、驱动力与思维模式，更全面地理解孩子的成长特点。</p>
    </div>
  `;
}

/* ---------------- Cases ---------------- */
function renderCasesDemo() {
  const box = document.getElementById('case-cards');
  if (!box) return;

  box.innerHTML = `
    <div class="warning-box">
      <p><strong>案例说明：</strong>两个逻辑能力都是8.5的人</p>
      <p style="opacity:.9;">A同学：压力敏感 + 完美主义 → 不适合创业，更适合大公司产品经理</p>
      <p style="opacity:.9;">B同学：稳定 + 行动导向 → 更适合创业，试错快、恢复快</p>
      <p style="margin-top:8px;"><strong>总结：</strong>天赋只是基础，真正的路径需要4层综合分析。</p>
    </div>
  `;
}

/* ---------------- Utils ---------------- */
function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'","&#39;");
}


