console.log('✅ result-generator.js loaded');

function renderAll(result, userData) {
  renderHeader(result, userData);
  renderTalentBars(result.scores);
  if (result.radarData) renderRadar(result.radarData);
  renderTop3(result.top3Talents);
  renderCombination(result.combinationAnalysis);
  renderConflicts(result.conflictWarnings);
  renderCareers(result.careerRecommendations, result.scores);
  renderParentRoadmap(result);
  renderCasesDemo();

  // ✅ 保存T层8维天赋分数 → 供 talent_p_layer.html 读取，实现真实T+P动态联动
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

  // completion time（从timings粗略推算）
  const minutes = estimateMinutes(userData.timings);
  const ct = document.getElementById('completion-time');
  if (ct) ct.textContent = minutes;

  const label = document.getElementById('talent-label');
  if (label) label.textContent = result.metadata.talentLabel || '-';

  const nick = document.getElementById('talent-nickname');
  if (nick) nick.textContent = `“${result.metadata.talentNickname || '多元发展型'}”`;
}

function estimateMinutes(timings) {
  const vals = Object.values(timings || {});
  if (vals.length === 0) return '-';
  const seconds = vals.reduce((a,b)=>a+(Number(b)||0),0);
  return Math.max(1, Math.round(seconds/60));
}

const T_DIM_META = {
  T1_language: { name: "语言智能", color: "#60a5fa", desc: "表达、理解、叙事能力" },
  T2_logic: { name: "逻辑数学智能", color: "#34d399", desc: "分析、推理、建模能力" },
  T3_spatial: { name: "空间智能", color: "#f59e0b", desc: "视觉结构、空间构建能力" },
  T4_music: { name: "音乐智能", color: "#f472b6", desc: "节奏、旋律、声音感知能力" },
  T5_bodily: { name: "身体动觉智能", color: "#f97316", desc: "动作控制、身体执行能力" },
  T6_interpersonal: { name: "人际智能", color: "#10b981", desc: "理解他人、建立连接能力" },
  T7_intrapersonal: { name: "内省智能", color: "#a78bfa", desc: "自我觉察、独立反思能力" },
  T8_naturalist: { name: "自然观察智能", color: "#84cc16", desc: "自然模式、系统观察能力" }
};

function talentDimBar(name, val, color, desc) {
  const score = Number(val) || 0;
  const pct = Math.max(0, Math.min(100, Math.round(score * 10)));
  return `
    <div class="dim-bar-wrap">
      <div class="dim-bar-label">
        <div class="left">
          <span>${name}</span>
          <small>${desc || ""}</small>
        </div>
        <strong style="color:${color}">${score.toFixed(1)}</strong>
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

  const entries = Object.keys(T_DIM_META).map(k => ({
    key: k,
    score: Number(scores[k]?.displayScore ?? 0) || 0,
    ...T_DIM_META[k]
  }));

  barsEl.innerHTML = entries.map(e =>
    talentDimBar(e.name, e.score, e.color, e.desc)
  ).join("");
  animateTalentBars();

  const top3 = [...entries].sort((a, b) => b.score - a.score).slice(0, 3);
  const chipsEl = document.getElementById("talent-top3-chips");
  if (chipsEl) {
    chipsEl.innerHTML = top3.map(e =>
      `<span class="chip">${e.name} ${e.score.toFixed(1)}</span>`
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

function renderRadar(radarData) {
  const canvas = document.getElementById('radar-chart');
  if (!canvas) return;

  const container = canvas.parentElement;
  if (container) {
    container.classList.add('radar-container');
  }

  const labels = radarData.map(x => x.dimension);
  const data = radarData.map(x => x.displayScore);

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
          max: 10,
          ticks: { stepSize: 2 },
          pointLabels: {
            font: { size: 12 },
            padding: 10
          }
        }
      },
      plugins: { legend: { display: false } }
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

/* ── 解锁流程入口（¥49 寻路者套餐：跳转微信支付页，付成功后由 payment 页进入 P 层测评） ── */
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
function renderParentRoadmap(result) {
  const box = document.getElementById('parent-roadmap');
  if (!box) return;

  const top1 = result.top3Talents?.[0];
  const score = top1?.score?.toFixed(1) ?? '-';
  const name = top1?.dimensionName ?? '天赋';

  box.innerHTML = `
    <div class="warning-box" style="margin-top:12px;">
      <p><strong>🎯 家长专属：成长路线图（雏形）</strong></p>
      <p>例如：您的孩子在T层表现出的 <strong>${name}</strong> 极佳（${score}分）</p>
      <ul>
        <li>✅ 培养方向：结合该天赋的优势路径做项目与作品</li>
        <li>⚠️ 需要关注：W层驱动力尚未测评（决定孩子能否长期投入）</li>
        <li>💡 关键期：12-18岁是驱动力形成期</li>
      </ul>
      <p style="margin-top:8px;">解锁完整测评，获取：📄《家长针对性培养方案》🎯基于5层综合分析的教育建议📈3-5年成长路线图</p>
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
      <p style="margin-top:8px;"><strong>总结：</strong>天赋只是基础，真正的路径需要5层综合分析。</p>
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


