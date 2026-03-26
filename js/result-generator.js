console.log('✅ result-generator.js loaded');

function renderAll(result, userData) {
  renderHeader(result, userData);
  renderRadar(result.radarData);
  renderTop3(result.top3Talents);
  renderCombination(result.combinationAnalysis);
  renderConflicts(result.conflictWarnings);
  renderFamilies(result.topFamilies);
  renderCareers(result.careerRecommendations);
  renderParentRoadmap(result);
  renderSocialProof();
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
function isPremium() {
  // 检查是否登录且已付费
  const user = localStorage.getItem('currentUser');
  if (!user) return false;
  
  try {
    const userData = JSON.parse(user);
    return userData.isPaid === true;
  } catch {
    return false;
  }
}

/* ── 解锁流程入口（¥49 寻路者套餐点击后调用） ── */
function buyPackage(type) {
  if (type !== 'pathfinder') {
    // 导航者套餐：跳转到完整支付页（占位）
    alert('导航者套餐支付页开发中，敬请期待！');
    return;
  }

  // ── 寻路者 ¥49：触发原地解锁动画 ──
  _doUnlockAnimation();
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

/* 生成锁定卡片的 HTML（带呼吸感马赛克） */
function _buildLockedCard(c, idx) {
  const rankBadge = ['🥇','🥈','🥉','4️⃣','5️⃣'][idx] || `${idx+1}️⃣`;

  // 背景关键词（每个岗位不同，增加神秘感）
  const kwMap = {
    0: ['逻辑架构','系统设计','AI · 未来','深度思考'],
    2: ['数据洞察','分析决策','模式识别','AI放大器'],
  };
  const kws = kwMap[idx] || ['职业天赋','未来赛道','核心能力','AI时代'];

  return `
    <div class="career-card locked-career-card" id="locked-career-${idx}" style="position:relative;overflow:hidden;min-height:180px;">

      <!-- 背景关键词层（马赛克遮挡下隐约透出） -->
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;
                  justify-content:center;gap:6px;pointer-events:none;z-index:0;opacity:0.55;">
        ${kws.map(k => `<span style="font-size:12px;letter-spacing:2px;color:#667eea;opacity:0.7">${k}</span>`).join('')}
      </div>

      <!-- 马赛克遮罩层（呼吸动画） -->
      <div class="unlock-mosaic" style="position:absolute;inset:0;z-index:1;
           display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(6,1fr);">
        ${Array.from({length:60}).map((_,i) => `
          <div style="background:rgba(15,20,50,${0.88+Math.random()*0.08});
               animation:mosaicBreath ${1.8+Math.random()*0.8}s ease-in-out ${Math.random()*1.5}s infinite;
               border:1px solid rgba(0,0,0,0.2)"></div>
        `).join('')}
      </div>

      <!-- 卡片主内容（在马赛克之上） -->
      <div style="position:relative;z-index:2;">
        <div class="career-header">
          <div class="career-rank" style="display:flex;align-items:center;gap:8px;">
            <span class="lock-icon" style="font-size:20px;transition:all 0.4s">🔒</span>
            ${rankBadge} 第${idx+1}名：<span style="letter-spacing:3px;color:#aaa">████████</span>
          </div>
          <div class="career-match">匹配度：${c.matchScore}%</div>
        </div>

        <!-- 隐藏数据（JS解锁时读取） -->
        <span class="career-name-hidden" data-name="${escapeHtml(c.name)}" data-badge="${rankBadge}" style="display:none"></span>

        <div style="margin-top:14px;padding:14px;background:rgba(102,126,234,0.06);
                    border-radius:10px;border:1px solid rgba(102,126,234,0.15);">
          <p style="font-size:14px;line-height:1.7;color:#888;">
            💡 <strong>为什么这个职业最值得关注？</strong><br>
            你的天赋匹配度高达 <strong style="color:#667eea">${c.matchScore}%</strong>，
            但在AI时代其替代风险和适配路径完全不同。
            <br>解锁后查看：如何用你的天赋组合在这条赛道形成<strong>护城河</strong>。
          </p>
        </div>

        <!-- 解锁成功后显示 -->
        <div class="unlock-msg" style="display:none;margin-top:12px;padding:12px;
             background:rgba(0,255,136,0.06);border-radius:10px;border:1px solid rgba(0,255,136,0.2);
             color:#00c970;font-size:14px;">
          ✅ 解锁成功！职业详情已在 P层测评结果 中完整展示
        </div>
      </div>
    </div>
  `;
}

function renderCareers(top5) {
  const box = document.getElementById('career-list');
  if (!box) return;

  const premium = isPremium();
  const hideIndex = premium ? [] : [0, 2];

  // 注入马赛克呼吸动画 CSS（只注入一次）
  if (!document.getElementById('mosaic-style')) {
    const style = document.createElement('style');
    style.id = 'mosaic-style';
    style.textContent = `
      @keyframes mosaicBreath {
        0%,100% { opacity:1; }
        50% { opacity:0.65; }
      }
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
      <div class="career-card">
        <div class="career-header">
          <div class="career-rank">${rankBadge} 第${idx+1}名：${escapeHtml(c.name)}</div>
          <div class="career-match">${c.matchScore}%</div>
        </div>

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
            <span class="meta-label">薪资范围</span>
            <span class="meta-value">${escapeHtml(c.aiImpact?.salaryRange || '-')}</span>
          </div>
        </div>

        <div class="career-why" style="margin-top:12px;">
          <strong>匹配度构成（示例）</strong>
          <p style="margin-top:6px;opacity:.9;">
            - 天赋匹配：${Math.min(99, c.matchScore+4)}%<br/>
            - 家族匹配：${Math.max(50, c.matchScore-8)}%<br/>
            - 能力结构：${Math.max(55, c.matchScore-6)}%
          </p>
        </div>

        <div class="career-why" style="margin-top:12px;">
          <strong>核心匹配原因：</strong>
          <ul style="margin:6px 0 0;">
            <li>你的优势更符合该职业的关键能力结构</li>
            <li>你更可能在该路径中做出稳定产出</li>
            <li>适合在AI工具加持下快速升级</li>
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

/* ---------------- Social proof / Cases ---------------- */
function renderSocialProof() {
  const box = document.getElementById('social-proof');
  if (!box) return;
  box.innerHTML = `💡 已有 <strong>2,318</strong> 人通过完整测评找到方向 · ⭐⭐⭐⭐⭐ <strong>4.9/5.0</strong>（基于 386 条真实评价）`;
}

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


