console.log('✅ wma-result-generator.js loaded (TalentAI 五层完整报告)');

// ── window 提前注册（防止文件中间报错导致底部注册失败）──
// 函数声明会被提升(hoisting)，setTimeout(0)时已可访问
setTimeout(function() {
  if (typeof wmaRenderAll === 'function') {
    window.wmaRenderAll = wmaRenderAll;
    console.log('✅ wmaRenderAll → window 注册成功');
  }
}, 0);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 总入口
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function wmaRenderAll(result, userData) {
  wmaRenderHeader(result, userData);
  wmaRenderS1_Identity(result);       // 模块1：你是谁（生态位+类型+族群）
  wmaRenderS2_Radar(result);          // 模块2：六维能力雷达图
  wmaRenderS3_FourPaths(result);      // 模块3：四条职业路径
  wmaRenderS4_Risk(result);           // 模块4：风险仪表盘
  wmaRenderS5_Action(result);         // 模块5：三阶段实践路径+错配警示
  wmaRenderUpgrade(result);           // 升级信号（条件触发）
  wmaRenderSocialProof();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 顶部横幅
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function wmaRenderHeader(result, userData) {
  setText('wma-report-time', new Date().toLocaleString('zh-CN'));
  setText('wma-age', (result.metadata?.age || userData?.age || '-') + '岁');

  const mins = estimateMins(userData?.timings);
  setText('wma-time', mins + ' 分钟');

  const res = result.wtResonance;
  if (res?.isResonant) setVisible('wma-badge-resonance', '⚡ W/T天赋共振', '#e8f5ee', '#1a5c35');
  if (result.burnoutWarning?.triggered) setVisible('wma-badge-burnout', '⚠️ 内耗预警', '#fff0f0', '#7b1a1a');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 模块1：你是谁
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function wmaRenderS1_Identity(result) {
  const box = document.getElementById('wma-identity');
  if (!box) return;

  const eco   = result.ecoPosition   || {};
  const tm    = result.tmType        || {};
  const tribe = result.tribeResult   || {};
  const mode  = result.careerMode    || {};
  const res   = result.wtResonance   || {};
  const burn  = result.burnoutWarning|| {};

  box.innerHTML = `
    ${identityCard('🌍 生态位归属', eco.label, eco.desc, '#eef5ff', '#2e6db4',
        eco.overrideReason === 'contextSeparation_LOG'
          ? '🔬 情境剥离：你的优势在抽象逻辑（T-LOG极高），最强赛道是纯理论深度，而非系统架构路径。'
          : null)}

    ${identityCard('🧠 思维/天赋类型', tm.label || '均衡型', tm.desc, '#f5f7fa', '#555',
        tm.careerModeLock ? '职业模式倾向锁定：' + tm.careerModeLock : null)}

    ${renderTribeSection(tribe)}

    ${identityCard('💼 职业模式', mode.label, mode.border ? '💬 ' + mode.border : '', '#e8f5ee', '#1a5c35',
        mode.redlineWarning || null)}

    ${renderResonanceSection(res)}

    ${!result.wSignalClear ? `
    <div style="background:#fff8e6;border-left:4px solid #7b5800;border-radius:8px;
         padding:12px 14px;margin-top:12px;font-size:14px;color:#7b5800;line-height:1.7;">
      🔍 <strong>迷茫期标识：</strong>你的内在驱动信号正在形成中，这是真实的状态，
      不是缺陷，而是你还需要更多真实体验来校准自己的方向。
    </div>` : ''}

    ${burn.triggered ? `
    <div style="background:#fff0f0;border-left:4px solid #7b1a1a;border-radius:8px;
         padding:12px 14px;margin-top:12px;font-size:14px;color:#7b1a1a;line-height:1.7;">
      ⚠️ <strong>内耗预警：</strong>${esc(burn.label || '')}
      <br><small>驱动力与性格加权均值 ${burn.score} 分（阈值60分触发）</small>
    </div>` : ''}
  `;
}

function identityCard(title, label, desc, bg, color, note) {
  if (!label) return '';
  return `
    <div style="background:${bg};border-left:4px solid ${color};border-radius:8px;
         padding:14px 16px;margin-bottom:12px;">
      <div style="font-size:12px;color:#888;margin-bottom:4px;">${title}</div>
      <div style="font-size:18px;font-weight:700;color:${color};">${esc(label)}</div>
      ${desc ? `<div style="font-size:13px;color:#555;margin-top:5px;line-height:1.7;">${esc(desc)}</div>` : ''}
      ${note ? `<div style="margin-top:8px;font-size:12px;padding:8px;background:rgba(0,0,0,0.04);
               border-radius:5px;color:#666;">${esc(note)}</div>` : ''}
    </div>
  `;
}

function renderTribeSection(tribe) {
  if (!tribe?.primary) return '';
  const tribeColor = {
    Helper:    ['#e8f5ee','#1a5c35'],
    Guardian:  ['#eef5ff','#2e6db4'],
    Creator:   ['#fff8e6','#7b5800'],
    Architect: ['#f3eeff','#4b0082'],
    Influencer:['#e6f7f9','#005f6b']
  };
  const p  = tribe.primary;
  const s  = tribe.secondary;
  const pc = tribeColor[p.key] || ['#f5f7fa','#333'];
  const sc = s ? (tribeColor[s.key] || ['#f5f7fa','#666']) : null;

  return `
    <div style="background:${pc[0]};border-left:4px solid ${pc[1]};border-radius:8px;
         padding:14px 16px;margin-bottom:12px;">
      <div style="font-size:12px;color:#888;margin-bottom:4px;">🫂 性格族群归属</div>
      <div style="font-size:18px;font-weight:700;color:${pc[1]};">主族群：${esc(p.name || p.key)}</div>
      <div style="font-size:12px;color:${pc[1]};margin-top:3px;">
        触发强度 ${Math.round(p.strength||0)}% · 享有 ×1.08 共振加成
      </div>
      ${p.needsArbitation ? `<div style="font-size:11px;color:#7b5800;margin-top:3px;">
        ⚡ VD/ED差距<15分，仲裁题已触发确认</div>` : ''}
      ${s && sc ? `
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid ${pc[1]}22;">
          <span style="font-size:13px;font-weight:600;color:${sc[1]};">
            次族群：${esc(s.name || s.key)}
          </span>
          <span style="font-size:12px;color:#888;margin-left:8px;">
            触发强度 ${Math.round(s.strength||0)}%（体现在文案中，不触发共振加成）
          </span>
        </div>` : ''}
    </div>
  `;
}

function renderResonanceSection(res) {
  if (!res) return '';
  const isR  = res.isResonant;
  const bg   = isR ? '#e8f5ee' : '#f5f7fa';
  const border = isR ? '#1a5c35' : '#ccc';
  const color  = isR ? '#1a5c35' : '#555';
  return `
    <div style="background:${bg};border-left:4px solid ${border};border-radius:8px;
         padding:14px 16px;margin-bottom:12px;">
      <div style="font-size:12px;color:#888;margin-bottom:4px;">⚡ W/T 天赋共振</div>
      <div style="font-size:16px;font-weight:700;color:${color};">${esc(res.label||'')}</div>
      ${isR ? `<div style="font-size:12px;color:#1a5c35;margin-top:4px;">
        乘数 ×1.12（优先于族群共振）
        · W主驱动：${res.wMaxDim} → T最强：${res.tMaxDim}
      </div>` : `<div style="font-size:13px;color:#666;margin-top:6px;line-height:1.7;">
        天赋决定起跑速度，热忱决定终点远近。
        若选择热忱赛道，借助AI工具补足天赋短板；
        若选择天赋赛道，用业余爱好对冲职业倦怠。
      </div>`}
    </div>
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 模块2：六维能力雷达图（100分制）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function wmaRenderS2_Radar(result) {
  const canvas = document.getElementById('wma-radar-chart');
  const matrix = result.sixDimMatrix;
  if (!canvas || !matrix) return;

  if (canvas._chartInst) { canvas._chartInst.destroy(); }

  const dimOrder = ['cognitiveStyle','creativity','resilience','leadership','futureAdaptation','systemBuilding'];
  const labels   = dimOrder.map(k => matrix[k]?.label || k);
  const data     = dimOrder.map(k => matrix[k]?.score || 0);

  canvas._chartInst = new Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: '综合能力',
        data,
        backgroundColor: 'rgba(46,109,180,0.15)',
        borderColor:     'rgba(46,109,180,1)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: 'rgba(46,109,180,1)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: { r: { min:0, max:100, ticks:{ stepSize:20, font:{size:10} } } },
      plugins: { legend:{ display:false } }
    }
  });

  // 六维得分列表
  const listEl = document.getElementById('wma-dim-list');
  if (listEl) {
    listEl.innerHTML = dimOrder.map(k => {
      const dim = matrix[k]; if (!dim) return '';
      const s   = dim.score || 0;
      const clr = s>=80?'#1a5c35': s>=60?'#2e6db4': '#7b1a1a';
      return `<div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:14px;font-weight:600;">${esc(dim.label)}</span>
          <span style="font-weight:700;color:${clr};">${Math.round(s)}分</span>
        </div>
        <div style="background:#eee;border-radius:4px;height:7px;overflow:hidden;">
          <div style="width:${s}%;height:100%;background:${clr};border-radius:4px;transition:width 0.6s;"></div>
        </div>
        <div style="font-size:12px;color:#888;margin-top:2px;">${esc(dim.desc||'')}</div>
      </div>`;
    }).join('');
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 模块3：四条职业路径
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function wmaRenderS3_FourPaths(result) {
  const box = document.getElementById('wma-four-paths');
  if (!box) return;
  const m = result.careerMatches || {};
  const paths = [
    { key:'main',       label:'🥇 主推路径',   color:'#2e6db4', bg:'#eef5ff' },
    { key:'stable',     label:'🛡️ 稳健路径',   color:'#1a5c35', bg:'#e8f5ee' },
    { key:'aiLeverage', label:'🤖 AI杠杆路径', color:'#005f6b', bg:'#e6f7f9' },
    { key:'venture',    label:'🚀 创业路径',    color:'#7b5800', bg:'#fff8e6' }
  ];

  box.innerHTML = paths.map(p => {
    const c = m[p.key];
    if (!c || c._isMissing) return buildMissingPath(p, c);
    return buildCareerCard(p, c, result);
  }).join('');
}

function buildMissingPath(p, c) {
  return `
    <div style="border:1px dashed #ccc;border-radius:12px;padding:16px;margin-bottom:16px;background:#fafafa;">
      <div style="font-weight:700;color:#888;margin-bottom:6px;">${p.label}</div>
      <div style="font-size:13px;color:#bbb;">${c?.reason || '该路径需满足特定条件才会解锁'}</div>
    </div>`;
}

function buildCareerCard(p, c, result) {
  const stability = c.strategicStabilityIndex;
  const mRed      = c._mRedline;
  const locHigh   = c.locationDependency === 'high';
  const isVenture = p.key === 'venture';
  const mode      = result.careerMode;

  return `
    <div style="border:1px solid #dde4f0;border-radius:12px;padding:18px;
         margin-bottom:16px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.05);">

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-weight:700;font-size:15px;color:#1b3a6b;">${p.label}</span>
        <span style="padding:4px 12px;border-radius:99px;font-size:12px;font-weight:700;
              background:${p.color};color:#fff;">匹配 ${c.matchScore||'--'}%</span>
      </div>

      <div style="font-size:18px;font-weight:700;color:#1b3a6b;margin-bottom:6px;">
        ${esc(c.name||'—')}
      </div>
      <p style="font-size:14px;color:#555;line-height:1.7;margin:0 0 12px;">
        ${esc(c.description||'—')}
      </p>

      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;">
        ${c.ecoPosition ? `<span style="background:#eef5ff;color:#1b3a6b;
          font-size:11px;padding:3px 10px;border-radius:99px;font-weight:600;">${esc(c.ecoPosition)}</span>` : ''}
        ${c.careerMode  ? `<span style="background:#e8f5ee;color:#1a5c35;
          font-size:11px;padding:3px 10px;border-radius:99px;font-weight:600;">${esc(c.careerMode)}</span>` : ''}
      </div>

      ${stability != null ? `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="font-size:13px;color:#666;">战略稳定指数</span>
          <span style="font-size:13px;font-weight:700;color:#2e6db4;">${stability}分</span>
        </div>
        <div style="background:#eee;border-radius:4px;height:6px;overflow:hidden;">
          <div style="width:${stability}%;height:100%;background:#2e6db4;border-radius:4px;"></div>
        </div>
      </div>` : ''}

      ${c.humanPremium||c.whyNewbieCanWin ? `
      <div style="background:#eef5ff;border-radius:8px;padding:12px;margin-bottom:12px;">
        <div style="font-size:12px;font-weight:700;color:#1b3a6b;margin-bottom:4px;">
          💡 人类溢价（AI无法替代你的部分）
        </div>
        <div style="font-size:13px;color:#333;line-height:1.6;">
          ${esc(c.humanPremium || c.whyNewbieCanWin || '')}
        </div>
      </div>` : ''}

      ${c.aiImpact ? `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
        ${chip('AI替代风险', c.aiImpact.replacementRisk!=null ? c.aiImpact.replacementRisk+'%' : '--')}
        ${chip('薪资范围', c.aiImpact.salaryRange||'--')}
        ${chip('行业趋势', c.aiImpact.growthRate||'--')}
      </div>` : ''}

      ${c.careerPath ? `<div style="font-size:13px;color:#2e6db4;margin-bottom:8px;">📈 ${esc(c.careerPath)}</div>` : ''}

      ${locHigh ? `<div style="font-size:13px;color:#7b5800;background:#fff8e6;padding:8px;
        border-radius:6px;margin-bottom:8px;">
        🏙 该职业具有极强产业集群效应，主要分布在一线城市，身处人才密度最高的地方复利积累更快。
      </div>` : ''}

      ${mRed?.triggered ? `<div style="font-size:13px;color:#7b1a1a;background:#fff0f0;
        padding:8px;border-radius:6px;margin-bottom:8px;">
        ⚠️ M层红线：${esc(mRed.warning||'')}
      </div>` : ''}

      ${isVenture && mode?.ventureL1 && !mode?.ventureL2 ? `
      <div style="font-size:13px;color:#7b5800;background:#fff8e6;padding:8px;border-radius:6px;">
        📋 创业待验证：建议2年内验证策略规划能力（M-STR）和情绪稳定性（P神经质反向）
      </div>` : ''}
    </div>
  `;
}

function chip(label, value) {
  return `<div style="flex:1;min-width:80px;background:#f5f7fa;border-radius:6px;
       padding:8px;text-align:center;border:1px solid #eee;">
    <div style="font-size:11px;color:#888;">${label}</div>
    <div style="font-size:13px;font-weight:700;color:#333;margin-top:2px;">${esc(String(value))}</div>
  </div>`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 模块4：风险仪表盘
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function wmaRenderS4_Risk(result) {
  const box = document.getElementById('wma-risk');
  if (!box) return;

  const main  = result.careerMatches?.main || {};
  const burn  = result.burnoutWarning || {};
  const mode  = result.careerMode || {};
  const aiR   = main.aiImpact?.replacementRisk ?? 50;
  const trend = main.trendScore ?? 70;

  const risks = [
    { label:'行业周期风险', level: trend>=80?'低':trend>=60?'中':'高',
      bg:   trend>=80?'#e8f5ee':trend>=60?'#fff8e6':'#fff0f0',
      color:trend>=80?'#1a5c35':trend>=60?'#7b5800':'#7b1a1a',
      hint: `行业趋势分 ${trend}分` },
    { label:'AI替代风险',  level: aiR<=20?'低':aiR<=40?'中':'高',
      bg:   aiR<=20?'#e8f5ee':aiR<=40?'#fff8e6':'#fff0f0',
      color:aiR<=20?'#1a5c35':aiR<=40?'#7b5800':'#7b1a1a',
      hint: `5年替代风险 ${aiR}%` },
    { label:'性格冲突风险', level: burn.triggered?'高':'低',
      bg:   burn.triggered?'#fff0f0':'#e8f5ee',
      color:burn.triggered?'#7b1a1a':'#1a5c35',
      hint: burn.triggered?'内耗预警触发':'能量结构匹配' },
    { label:'M层能力缺口', level: mode.mRskRedline?'高':'低',
      bg:   mode.mRskRedline?'#fff0f0':'#e8f5ee',
      color:mode.mRskRedline?'#7b1a1a':'#1a5c35',
      hint: mode.mRskRedline?'M-RSK<40，红线触发':'思维维度无红线' }
  ];

  const stabilities = ['main','stable','aiLeverage','venture']
    .map(k => result.careerMatches?.[k])
    .filter(c => c && !c._isMissing && c.strategicStabilityIndex != null);

  box.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      ${risks.map(r => `
        <div style="background:${r.bg};border-radius:10px;padding:14px;
             border-left:4px solid ${r.color};">
          <div style="font-size:12px;color:#888;margin-bottom:3px;">${r.label}</div>
          <div style="font-size:22px;font-weight:700;color:${r.color};">${r.level}</div>
          <div style="font-size:12px;color:#666;margin-top:3px;">${r.hint}</div>
        </div>`).join('')}
    </div>

    ${burn.triggered ? `
    <div style="background:#fff0f0;border:1px solid #f5c6c6;border-radius:10px;
         padding:14px;margin-bottom:14px;">
      <div style="font-weight:700;color:#7b1a1a;margin-bottom:6px;">⚠️ 内耗预警详情</div>
      <div style="font-size:14px;color:#555;">${esc(burn.label||'')}</div>
      <div style="font-size:12px;color:#888;margin-top:4px;">
        驱动力+性格加权均值：${burn.score}分（阈值<60触发）· 基础分惩罚上限 -8分
      </div>
    </div>` : ''}

    ${stabilities.length ? `
    <div>
      <div style="font-weight:700;color:#1b3a6b;margin-bottom:10px;">📊 战略稳定指数对比</div>
      ${stabilities.map(c => {
        const s = c.strategicStabilityIndex;
        const clr = s>=75?'#1a5c35': s>=55?'#2e6db4': '#7b1a1a';
        return `<div style="margin-bottom:10px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="font-size:13px;font-weight:600;">${esc(c.name)}</span>
            <span style="font-weight:700;color:${clr};">${Math.round(s)}分</span>
          </div>
          <div style="background:#eee;border-radius:4px;height:7px;overflow:hidden;">
            <div style="width:${s}%;height:100%;background:${clr};border-radius:4px;"></div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 模块5：三阶段实践路径 + 错配警示
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function wmaRenderS5_Action(result) {
  const box = document.getElementById('wma-action');
  if (!box) return;

  const age      = result.metadata?.age || 16;
  const ageGroup = result.metadata?.ageGroup || '16-18';
  const all      = result.careerMatches?.all || [];
  const burn     = result.burnoutWarning || {};

  const roadmaps = {
    '12-15': [
      { n:1, period:'12–18岁', title:'探索实践期', desc:'完成一个真实的小项目（用工具解决身边真实问题），从0到1完成一件事的体验。判断标准：有没有真实的人因此受益，或真实的价值被创造出来。' },
      { n:2, period:'18–22岁', title:'定向选择期', desc:'进入组织理解系统如何运转，明确生态位内的具体赛道方向。' },
      { n:3, period:'22–27岁', title:'能力放大期', desc:'借助平台放大个人价值，形成可量化的个人影响力资产。' }
    ],
    '16-18': [
      { n:1, period:'16–22岁', title:'能力建立期', desc:'参与真实团队，定向选择，在协作中确定自己在生态位中的角色。' },
      { n:2, period:'22–27岁', title:'平台放大期', desc:'借助平台积累资源网络，形成跨组织的影响力和资源整合能力。' },
      { n:3, period:'27岁以上', title:'独立跃迁期', desc:'特质真正释放，AI加持下独立作战能力最强，进入复利积累轨道。' }
    ],
    '18-25': [
      { n:1, period:'现在–22岁', title:'组织学习期', desc:'进入真实结构理解运转，积累不可复制的实战认知与人脉资产。' },
      { n:2, period:'22–27岁',   title:'平台合伙期', desc:'借助平台放大个人影响力，从「执行者」转型为「整合者」。' },
      { n:3, period:'27岁以上',  title:'自由跃迁期', desc:'独立作战成本极低，AI加持后可完成过去需要团队才能完成的工作。' }
    ]
  };
  const steps = roadmaps[ageGroup] || roadmaps['16-18'];

  // 合伙人对冲
  const s = result.scores || {};
  const wCO = s.W?.CO  || 0;
  const tEx = s.T?.['T-EXE'] || 0;
  const pCon= s.P?.conscientiousness || 0;
  const showPartner = wCO > 85 && tEx < 70 && pCon <= 40;

  // 错配警示
  const worst = all.length ? [...all].sort((a,b)=>(a.matchScore||0)-(b.matchScore||0))[0] : null;

  box.innerHTML = `
    <!-- 三阶段路线图 -->
    <div style="background:#eef5ff;border-radius:10px;padding:16px;margin-bottom:16px;">
      <div style="font-size:13px;color:#888;margin-bottom:12px;">
        年龄：${age}岁 · ${ageGroup}段 · 定制路线图
      </div>
      ${steps.map(s => `
        <div style="display:flex;gap:12px;margin-bottom:14px;">
          <div style="min-width:28px;width:28px;height:28px;border-radius:50%;
               background:#2e6db4;color:#fff;display:flex;align-items:center;
               justify-content:center;font-weight:700;font-size:13px;flex-shrink:0;">${s.n}</div>
          <div>
            <div style="font-weight:700;color:#1b3a6b;font-size:14px;">
              第${s.n}阶段（${s.period}）：${s.title}
            </div>
            <div style="font-size:13px;color:#555;margin-top:3px;line-height:1.6;">${s.desc}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- 合伙人对冲（条件触发） -->
    ${showPartner ? `
    <div style="background:#fff8e6;border-left:4px solid #7b5800;border-radius:8px;
         padding:14px;margin-bottom:16px;">
      <div style="font-weight:700;color:#7b5800;font-size:15px;margin-bottom:8px;">
        🤝 创意灵魂的最优战略
      </div>
      <div style="font-size:14px;color:#555;line-height:1.7;">
        你是一个纯粹的创意灵魂。你的低执行力和内耗风险，本质上是因为你的能量
        不该消耗在琐碎的行政事务上。你的战略出路不是补短板，而是通过
        AI自动化 + 寻找执行合伙人，把你从不擅长的工作中彻底解放。
      </div>
    </div>` : ''}

    <!-- 错配警示 -->
    <h3 style="color:#7b1a1a;margin:0 0 12px;">🚫 与你特质最不匹配的路径</h3>
    ${worst ? `
    <div style="background:#fff0f0;border:1px solid #f5c6c6;border-radius:10px;padding:16px;">
      <div style="font-size:16px;font-weight:700;color:#7b1a1a;margin-bottom:6px;">
        ${esc(worst.name||'—')}
      </div>
      <div style="font-size:13px;color:#888;margin-bottom:10px;">
        匹配分：${worst.matchScore||'--'}% · 建议回避
      </div>
      <div style="font-size:14px;color:#555;line-height:1.7;">
        <strong>能量损耗预测：</strong><br>
        ${burn.triggered && (worst.matchScore||0)<60
          ? `在「${esc(worst.name||'')}」这个环境里，你的能量结构会被持续消耗。
             与你最适合的路径相比，这里每工作3小时，你需要6小时独处才能回血。
             这不是努力的差距，是生态位的问题。`
          : '你能胜任这条路径，但你的能量结构在这里会被持续消耗，建议将它作为备选方向。'}
      </div>
    </div>` : '<p style="color:#aaa;font-size:14px;">暂无错配数据</p>'}
  `;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 升级信号（7种条件触发）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function wmaRenderUpgrade(result) {
  const box = document.getElementById('wma-upgrade');
  if (!box) return;
  const signals = result.upgradeSignals || [];
  if (!signals.length) return;

  const icons = {
    wt_separation:'🔀', burnout:'⚠️', close_scores:'🎯',
    unclear_signal:'🔍', execution_gap:'🤝', m_redline:'🚫', venture_gap:'🚀'
  };

  box.innerHTML = `
    <div style="background:linear-gradient(135deg,#1b3a6b,#2e6db4);border-radius:12px;padding:18px;">
      <div style="color:#fff;font-weight:700;font-size:16px;margin-bottom:12px;">
        💡 你的报告有以下信号，建议与导师深度探讨
      </div>
      ${signals.map(s => `
        <div style="background:rgba(255,255,255,0.12);border-radius:8px;
             padding:12px;margin-bottom:10px;">
          <div style="color:#fff;font-weight:600;font-size:14px;margin-bottom:3px;">
            ${icons[s.type]||'•'} ${esc(s.label)}
          </div>
          <div style="color:rgba(255,255,255,0.8);font-size:13px;">
            ${esc(s.guide)}
          </div>
        </div>`).join('')}
      <button onclick="alert('导师预约功能即将上线，请关注服务通知。')"
        style="width:100%;margin-top:8px;padding:12px;background:#fff;color:#1b3a6b;
               border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;">
        预约导师深度咨询 →
      </button>
    </div>
  `;
}

function wmaRenderSocialProof() {
  const box = document.getElementById('wma-social-proof');
  if (!box) return;
  box.innerHTML = `💡 已有 <strong>2,318</strong> 人通过完整五层测评找到方向 ·
    ⭐⭐⭐⭐⭐ <strong>4.9/5.0</strong>（基于 386 条真实评价）`;
}

// ── 工具函数 ──────────────────────────────────────
function setText(id, text) {
  const el = document.getElementById(id); if (el) el.textContent = text;
}
function setVisible(id, text, bg, color) {
  const el = document.getElementById(id); if (!el) return;
  el.textContent = text;
  Object.assign(el.style, {display:'inline-block', background:bg, color,
    padding:'3px 10px', borderRadius:'99px', fontWeight:'600', fontSize:'12px'});
}
function estimateMins(timings) {
  const vals = Object.values(timings||{});
  if (!vals.length) return '-';
  return Math.max(1, Math.round(vals.reduce((a,b)=>a+(Number(b)||0),0)/60));
}
function esc(str) {
  return String(str||'').replaceAll('&','&amp;').replaceAll('<','&lt;')
    .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");
}

// 底部再次注册（双保险）
window.wmaRenderAll = wmaRenderAll;
console.log('✅ wmaRenderAll 底部注册完成');

