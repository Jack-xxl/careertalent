/**
 * TalentAI WMA层测评系统 - 完整修复版 v2.0
 * W层(28题) + M层(20题) + A层(20题) = 68题
 *
 * 修复清单：
 * 1. CO维度超10分 → 双向维度正确归一化
 * 2. 提前触发结算 → 严格题号边界判断
 * 3. 层标题不同步 → header + 题目区双badge同步
 * 4. 层间过渡题号残留 → 进入过渡卡时强制重置题号
 * 5. 自动跳题触发过早 → 延迟后二次校验答案存在
 */

'use strict';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 层配置
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WMA_LAYERS = [
    {
        key:           'W',
        name:          'W层·驱动价值测评',
        file:          'data/w-layer-questions.json',
        totalQuestions: 28,
        icon:          '🧭',
        color:         '#f0c060',
        badge:         'W层 · 价值驱动',
        timeEstimate:  '约15分钟',
        cheer: {
            emoji:    '🎯',
            title:    '太棒了！W层完成！',
            subtitle: '驱动价值画像已生成',
            desc:     '我们已经看见你真正在乎什么——\n金钱、影响力、稳定还是创造？\n\n接下来进入M层，测试你的思维操作系统。\n这是决定你能否在AI时代持续进化的关键层。',
            nextName: 'M层·元智能测评',
            nextDesc: '成长思维 · 认知重构 · 系统思维 · AI协作',
            nextTime: '20题 · 约12分钟'
        }
    },
    {
        key:           'M',
        name:          'M层·元智能测评',
        file:          'data/m-layer-questions.json',
        totalQuestions: 20,
        icon:          '🧠',
        color:         '#b060ff',
        badge:         'M层 · 元智能',
        timeEstimate:  '约12分钟',
        cheer: {
            emoji:    '🔥',
            title:    '一鼓作气！M层完成！',
            subtitle: '元智能画像已生成',
            desc:     '你的思维模式和认知结构已经被我们看见了。\n\n最后一层——A层，专门测试你在AI时代的适配力。\n只剩20题，完成后立即生成完整报告！',
            nextName: 'A层·AI适配力测评',
            nextDesc: 'AI认知定位 · 人机分工 · 放大策略 · 风险控制',
            nextTime: '20题 · 约10分钟'
        }
    },
    {
        key:           'A',
        name:          'A层·AI适配力测评',
        file:          'data/a-layer-questions.json',
        totalQuestions: 20,
        icon:          '🚀',
        color:         '#4499ee',
        badge:         'A层 · AI适配力',
        timeEstimate:  '约10分钟',
        cheer:         null   // 最后一层，答完直接进结算
    }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 全局状态
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let wmaData = { W: null, M: null, A: null };

let currentLayerIdx   = 0;
let currentQuestionIdx = 0;
let answers = { W: {}, M: {}, A: {} };
let timerSeconds  = 0;
let timerInterval = null;
let isSubmitting  = false;   // 防止重复触发结算

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 初始化
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

window.addEventListener('DOMContentLoaded', async () => {
    const qs = new URLSearchParams(window.location.search);
    const forceRestart = qs.get('restart') === '1';

    if (forceRestart) {
        try {
            localStorage.removeItem('talentai_wma_completed_at');
            localStorage.removeItem('talentai_wma_answers');
            localStorage.removeItem('talentai_wma_layer');
            localStorage.removeItem('talentai_wma_q');
            localStorage.removeItem('talentai_wma_timer');
            localStorage.removeItem('talentai_wma_scores');
            localStorage.removeItem('talentai_wma_result');
        } catch (e) {}
    }

    restoreProgress();

    // talentai_wma_paid：当前轮 WMA 测评资格；值为 '1' 或 'true'；talentai_navigator_paid 为五层商业授权标记
    const paidRaw = localStorage.getItem('talentai_wma_paid');
    const paid = paidRaw === '1' || paidRaw === 'true';

    try {
        await loadAllLayers();
        console.log(`✅ WMA题库加载完成 W:${wmaData.W.questions.length} M:${wmaData.M.questions.length} A:${wmaData.A.questions.length}`);

        if (paid) {
            renderQuestion();
            showScreen('question-screen');
            startTimer();
        } else {
            showScreen('payment-screen');
        }
    } catch (err) {
        console.error('题库加载失败', err);
        alert('题库加载失败，请检查 data/ 目录下的 JSON 文件是否存在。\n错误：' + err.message);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 加载题库
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function loadAllLayers() {
    const results = await Promise.all(
        WMA_LAYERS.map(layer =>
            fetch(layer.file).then(r => {
                if (!r.ok) throw new Error(`${layer.file} 返回 ${r.status}`);
                return r.json();
            })
        )
    );
    wmaData.W = results[0];
    wmaData.M = results[1];
    wmaData.A = results[2];
}

function getCurrentLayerQuestions() {
    return wmaData[WMA_LAYERS[currentLayerIdx].key].questions;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 付费
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

window.onPaySuccess = function () {
    try {
        localStorage.setItem('talentai_navigator_paid', 'true');
        localStorage.setItem('talentai_wma_paid', 'true');
        localStorage.setItem('talentai_wma_unlocked', 'true');
        localStorage.setItem('talentai_wma_paid_at', new Date().toISOString());
    } catch (e) {}
    // 从W层第一题开始，显示欢迎过渡卡
    currentLayerIdx    = 0;
    currentQuestionIdx = 0;
    showTransition(0);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 层间过渡卡
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function showTransition(toLayerIdx) {
    // ★ 关键：先设好目标层和题号，防止残留
    currentLayerIdx    = toLayerIdx;
    currentQuestionIdx = 0;

    const layer = WMA_LAYERS[toLayerIdx];
    const totalAnswered = countAnswered();
    const totalPct = Math.round(totalAnswered / 68 * 100);

    let content;
    if (toLayerIdx === 0) {
        // 欢迎卡（第一次付费后）
        content = {
            emoji:    '✨',
            cheer:    '支付成功！开始深度测评',
            title:    '欢迎进入三层深度测评',
            desc:     '接下来68道题分三个层次完成。\n每层结束后会有短暂休息。\n\n放松心态，诚实作答——\n答案没有对错，只有更接近真实的你。',
            nextName: layer.name,
            nextDesc: layer.badge + ' · ' + layer.timeEstimate,
            nextTime: `${layer.totalQuestions}道题`
        };
    } else {
        const prevCheer = WMA_LAYERS[toLayerIdx - 1].cheer;
        content = {
            emoji:    prevCheer.emoji,
            cheer:    prevCheer.title,
            title:    prevCheer.subtitle,
            desc:     prevCheer.desc,
            nextName: prevCheer.nextName,
            nextDesc: prevCheer.nextDesc,
            nextTime: prevCheer.nextTime
        };
    }

    setEl('trans-emoji',    content.emoji);
    setEl('trans-cheer',    content.cheer);
    setEl('trans-title',    content.title);
    setEl('trans-desc',     content.desc.replace(/\n/g, '<br>'));
    setEl('trans-next-name', content.nextName);
    setEl('trans-next-desc', content.nextDesc);
    setEl('trans-next-time', content.nextTime);
    setEl('trans-progress-pct',   totalPct + '%');
    setEl('trans-progress-label', `总体进度 ${totalAnswered}/68题`);

    const bar = document.getElementById('trans-progress-fill');
    if (bar) {
        bar.style.width = '0%';
        setTimeout(() => { bar.style.width = totalPct + '%'; }, 200);
    }

    showScreen('transition-screen');
}

window.startNextLayer = function () {
    startTimer();
    renderQuestion();
    showScreen('question-screen');
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 计时器
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timerSeconds++;
        const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
        const s = String(timerSeconds % 60).padStart(2, '0');
        setEl('timer-display', `${m}:${s}`);
        try { localStorage.setItem('talentai_wma_timer', timerSeconds); } catch (e) {}
    }, 1000);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 渲染题目
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function renderQuestion() {
    const layer     = WMA_LAYERS[currentLayerIdx];
    const questions = getCurrentLayerQuestions();
    const layerKey  = layer.key;

    // 边界保护
    if (currentQuestionIdx >= questions.length) {
        console.warn(`题号越界: layer=${layerKey} idx=${currentQuestionIdx} total=${questions.length}`);
        currentQuestionIdx = questions.length - 1;
    }

    const q = questions[currentQuestionIdx];
    const totalAnswered = countAnswered();
    const totalPct = Math.round(totalAnswered / 68 * 100);

    // ── Header ──
    setEl('prog-text', `${totalAnswered}/68`);
    const progFill = document.getElementById('prog-fill');
    if (progFill) progFill.style.width = totalPct + '%';

    // ── 双Badge同步（header + 题目区）──
    setEl('current-layer-badge',   `${layer.icon} ${layer.badge}`);
    setEl('current-layer-badge-q', `${layer.icon} ${layer.badge}`);
    setEl('current-layer-q', `第 ${currentQuestionIdx + 1} / ${layer.totalQuestions} 题`);
    setEl('question-number-global', `全局第 ${totalAnswered + 1} 题`);

    // ── 题目文字 ──
    const qText = (q.question && q.question['zh-CN']) ? q.question['zh-CN'] : (q.question || '');
    setEl('question-text', qText);

    // ── 情境描述（可选）──
    const scenarioEl = document.getElementById('question-scenario');
    if (scenarioEl) {
        const scenario = q.scenario ? (q.scenario['zh-CN'] || q.scenario) : null;
        scenarioEl.style.display = scenario ? 'block' : 'none';
        if (scenario) scenarioEl.textContent = scenario;
    }

    // ── 强迫二选一标识 ──
    const forceEl = document.getElementById('force-choice-label');
    if (forceEl) forceEl.style.display = (q.type === 'force_choice') ? 'block' : 'none';

    // ── 选项 ──
    const container = document.getElementById('options-container');
    if (!container) return;
    container.innerHTML = '';

    const currentAnswer = answers[layerKey][q.id];
    const letters = ['A', 'B', 'C', 'D', 'E'];

    q.options.forEach((opt, i) => {
        const optText = opt.text ? (opt.text['zh-CN'] || opt.text) : '';
        const optSub  = opt.sub  ? (opt.sub['zh-CN']  || opt.sub)  : '';
        const isSelected = currentAnswer === opt.id;

        const div = document.createElement('div');
        div.className = `option-card glass-card p-5 rounded-xl flex items-start gap-4 border border-gray-700${isSelected ? ' selected' : ''}`;
        div.innerHTML = `
            <div class="opt-letter flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
                 style="background:${isSelected ? 'rgba(102,126,234,0.3)' : 'rgba(255,255,255,0.06)'};color:${isSelected ? '#a78bfa' : '#9ca3af'}">
                ${letters[i]}
            </div>
            <div class="flex-1">
                <div class="font-medium leading-relaxed">${optText}</div>
                ${optSub ? `<div class="text-sm text-gray-400 mt-1">${optSub}</div>` : ''}
            </div>
            ${isSelected ? '<div class="text-purple-400 flex-shrink-0">✓</div>' : ''}
        `;
        div.addEventListener('click', () => selectAnswer(opt.id, q.id, layerKey));
        container.appendChild(div);
    });

    // ── 导航按钮 ──
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');

    if (prevBtn) {
        prevBtn.disabled = (currentLayerIdx === 0 && currentQuestionIdx === 0);
    }
    if (nextBtn) {
        nextBtn.disabled = !currentAnswer;
        const isLastQ = currentLayerIdx === WMA_LAYERS.length - 1 &&
                        currentQuestionIdx === WMA_LAYERS[WMA_LAYERS.length - 1].totalQuestions - 1;
        nextBtn.textContent = isLastQ ? '提交报告 ✓' : '下一题 →';
        nextBtn.style.opacity = currentAnswer ? '1' : '0.4';
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 选择答案
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function selectAnswer(optId, qId, layerKey) {
    answers[layerKey][qId] = optId;
    saveProgress();
    renderQuestion();  // 先刷新高亮
    // 400ms后自动跳下一题，给用户看清选择
    setTimeout(() => {
        // 二次确认答案已经写入再跳
        if (answers[layerKey][qId]) {
            nextQuestion();
        }
    }, 400);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 上一题
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

window.prevQuestion = function () {
    if (currentQuestionIdx > 0) {
        currentQuestionIdx--;
        renderQuestion();
    } else if (currentLayerIdx > 0) {
        currentLayerIdx--;
        currentQuestionIdx = WMA_LAYERS[currentLayerIdx].totalQuestions - 1;
        renderQuestion();
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 下一题（核心流程控制）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function nextQuestion() {
    const layer     = WMA_LAYERS[currentLayerIdx];
    const questions = getCurrentLayerQuestions();
    const q         = questions[currentQuestionIdx];
    const layerKey  = layer.key;

    // 未作答 → 不跳
    if (!answers[layerKey] || !answers[layerKey][q.id]) return;

    // 防止重复提交
    if (isSubmitting) return;

    const isLastInLayer = currentQuestionIdx >= layer.totalQuestions - 1;
    const isLastLayer   = currentLayerIdx >= WMA_LAYERS.length - 1;

    // ★ 情况1：最后一层最后一题 → 直接结算（不先 saveProgress，避免把选项字母写入后再被 startCalc 覆盖前用户已看到旧数据）
    if (isLastInLayer && isLastLayer) {
        isSubmitting = true;
        startCalc();
        return;
    }

    // ★ 情况2：本层最后一题但不是最后层 → 过渡卡
    if (isLastInLayer) {
        saveProgress();
        // ★ 重置题号在showTransition里处理（currentQuestionIdx = 0）
        showTransition(currentLayerIdx + 1);
        return;
    }

    // ★ 情况3：普通题 → 下一题
    currentQuestionIdx++;
    renderQuestion();
}

// 暴露给HTML按钮
window.nextQuestion = nextQuestion;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 计分引擎
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calcScores() {
    const rawScores    = { W: {}, M: {}, A: {} };
    const behavTags    = {};
    const flags        = {};

    ['W', 'M', 'A'].forEach(lk => {
        const questions   = wmaData[lk].questions;
        const layerAnswers = answers[lk] || {};

        questions.forEach(q => {
            const selectedId = layerAnswers[q.id];
            if (!selectedId) return;

            const opt = q.options.find(o => o.id === selectedId);
            if (!opt) return;

            // 累加维度分
            if (opt.scoring) {
                Object.entries(opt.scoring).forEach(([dim, val]) => {
                    rawScores[lk][dim] = (rawScores[lk][dim] || 0) + val;
                });
            }
            // 累加行为标签
            if (opt.behavioral_tags) {
                Object.entries(opt.behavioral_tags).forEach(([tag, val]) => {
                    behavTags[tag] = (behavTags[tag] || 0) + val;
                });
            }
            // 累加flags
            if (opt.flags) {
                Object.entries(opt.flags).forEach(([flag, val]) => {
                    flags[flag] = (flags[flag] || 0) + val;
                });
            }
        });
    });

    // ── 归一化到 0~10，严格 clamp ──
    const normalized = { W: {}, M: {}, A: {} };

    // W层
    wmaData.W.metadata.dimensions.forEach(d => {
        const raw = rawScores.W[d.id] || 0;
        let val;
        if (d.max_score && d.max_score > 0) {
            val = (raw / d.max_score) * 10;
        } else {
            val = 0;
        }
        normalized.W[d.id] = clamp10(val);
    });

    // M层
    wmaData.M.metadata.dimensions.forEach(d => {
        const raw = rawScores.M[d.id] || 0;
        const val = (d.max_score && d.max_score > 0) ? (raw / d.max_score) * 10 : 0;
        normalized.M[d.id] = clamp10(val);
    });

    // A层
    wmaData.A.metadata.dimensions.forEach(d => {
        const raw = rawScores.A[d.id] || 0;
        const val = (d.max_score && d.max_score > 0) ? (raw / d.max_score) * 10 : 0;
        normalized.A[d.id] = clamp10(val);
    });

    // ── AI适配总指数（0~100）──
    const aVals   = Object.values(normalized.A);
    const aiIndex = aVals.length > 0
        ? Math.round(aVals.reduce((a, b) => a + b, 0) / aVals.length * 10)
        : 0;

    // ── 五维复合指标 ──
    const W = normalized.W;
    const M = normalized.M;
    const A = normalized.A;

    const composite = {
        execution:   r10((W.W2 || 0) * 0.35 + (M.VR || 0) * 0.35 + (M.GM || 0) * 0.30),
        innovation:  r10((W.W4 || 0) * 0.35 + (M.CR || 0) * 0.30 + (W.W5 || 0) * 0.35),
        social:      r10((W.W3 || 0) * 0.40 + (M.VR || 0) * 0.20 + (A.A2 || 0) * 0.40),
        ai_leverage: r10((aiIndex / 10) * 0.50 + (M.AC || 0) * 0.30 + (W.W4 || 0) * 0.20),
        resilience:  r10((W.W2 || 0) * 0.35 + (M.GM || 0) * 0.35 + (M.CR || 0) * 0.30)
    };

    // ── 风险等级 ──
    const riskScore =
        (behavTags['ai_dependency']      || 0) * 2.5 +
        (behavTags['blind_trust']        || 0) * 2.0 +
        (flags['think_outsource']        || 0) * 2.0 +
        (flags['fixed_mindset']          || 0) * 1.5;
    const riskLevel = riskScore >= 6 ? 'high' : riskScore >= 3 ? 'medium' : 'low';

    return {
        raw:           rawScores,
        normalized,
        aiIndex,
        composite,
        behavioralTags: behavTags,
        flags,
        riskLevel,
        riskScore:     Math.round(riskScore * 10) / 10,
        answeredCount: countAnswered(),
        timeSec:       timerSeconds,
        completedAt:   new Date().toISOString()
    };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// W 层：根据选项字母 (W01:'A'...) 计算 W1-W7 维度分数并归一化到 0-100
// 使用已加载的 wmaData.W，避免 fetch 失败导致 completion 不写入
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function calculateWScoresFromAnswers(wLayerAnswers) {
    const questions = (wmaData.W && wmaData.W.questions) ? wmaData.W.questions : [];
    const scores = { W1: 0, W2: 0, W3: 0, W4: 0, W5: 0, W6: 0, W7: 0 };

    for (const q of questions) {
        const selectedOptionId = wLayerAnswers[q.id];
        if (!selectedOptionId) continue;

        const option = (q.options || []).find(o => o.id === selectedOptionId);
        if (!option || !option.scoring) continue;

        for (const [dim, val] of Object.entries(option.scoring)) {
            if (scores[dim] !== undefined) {
                scores[dim] += Number(val) || 0;
            }
        }
    }

    const maxPerDim = 8.0;
    for (const key of Object.keys(scores)) {
        scores[key] = Math.min(100, Math.max(0, Math.round((scores[key] / maxPerDim) * 100)));
    }
    return scores;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 计算动画 → 保存 → 跳转
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function startCalc() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    showScreen('loading-screen');

    const steps = [
        { id: 'cs0', delay: 300  },
        { id: 'cs1', delay: 1000 },
        { id: 'cs2', delay: 1700 },
        { id: 'cs3', delay: 2400 },
        { id: 'cs4', delay: 3100 },
        { id: 'cs5', delay: 3800 }
    ];

    steps.forEach((step, i) => {
        // 激活
        setTimeout(() => {
            const el = document.getElementById(step.id);
            if (el) el.classList.add('active');
        }, step.delay);

        // 完成
        setTimeout(() => {
            const el = document.getElementById(step.id);
            if (el) {
                el.classList.remove('active');
                el.classList.add('done');
                const ic = el.querySelector('.cs-ic');
                if (ic) ic.textContent = '✅';
            }

            // 最后一步：计算 + 保存 + 跳转（必须先算 W 分数再写，避免被 saveProgress 的字母格式覆盖）
            if (i === steps.length - 1) {
                const result = calcScores();
                try {
                    // 用当前选项字母 (W01:'A', ...) 计算 W1-W7 数字分数，用已加载的 wmaData.W 不依赖 fetch
                    answers.W = calculateWScoresFromAnswers(answers.W || {});

                    if (result.normalized && result.normalized.M && Object.keys(result.normalized.M).length) {
                        answers.M = { ...result.normalized.M };
                    }
                    if (result.normalized && result.normalized.A && Object.keys(result.normalized.A).length) {
                        answers.A = { ...result.normalized.A };
                    }
                    localStorage.setItem('talentai_wma_scores',       JSON.stringify(result));
                    localStorage.setItem('talentai_wma_answers',      JSON.stringify(answers));
                    localStorage.setItem('talentai_wma_completed_at', result.completedAt);
                    localStorage.removeItem('talentai_wma_paid');
                    try { localStorage.removeItem(WMA_PROGRESS_KEY); } catch (_) {}
                } catch (e) {
                    console.error('localStorage写入失败', e);
                }

                const db5 = document.getElementById('db5');
                if (db5) db5.textContent = `AI适配指数 ${result.aiIndex}/100 · 报告生成完成`;

                setTimeout(() => {
                    window.location.href = 'wma-result.html';
                }, 900);
            }
        }, step.delay + 600);
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 进度保存 / 恢复（答题中只写 progress，不覆盖最终答案；完成时只写 talentai_wma_answers 且 W 为数字）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const WMA_PROGRESS_KEY = 'talentai_wma_progress';

function saveProgress() {
    try {
        const progress = { layer: currentLayerIdx, q: currentQuestionIdx, answers: JSON.parse(JSON.stringify(answers)) };
        localStorage.setItem(WMA_PROGRESS_KEY, JSON.stringify(progress));
        localStorage.setItem('talentai_wma_layer', String(currentLayerIdx));
        localStorage.setItem('talentai_wma_q', String(currentQuestionIdx));
    } catch (e) {}
}

function restoreProgress() {
    try {
        const savedProgress = localStorage.getItem(WMA_PROGRESS_KEY);
        if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            currentLayerIdx = Math.max(0, Math.min(2, Number(progress.layer) || 0));
            currentQuestionIdx = Math.max(0, Number(progress.q) || 0);
            if (progress.answers && typeof progress.answers === 'object') {
                answers.W = progress.answers.W || {};
                answers.M = progress.answers.M || {};
                answers.A = progress.answers.A || {};
            }
        } else {
            const savedAnswers = localStorage.getItem('talentai_wma_answers');
            if (savedAnswers) answers = JSON.parse(savedAnswers);
            const savedLayer = localStorage.getItem('talentai_wma_layer');
            if (savedLayer !== null) currentLayerIdx = Math.max(0, Math.min(2, parseInt(savedLayer) || 0));
            const savedQ = localStorage.getItem('talentai_wma_q');
            if (savedQ !== null) currentQuestionIdx = Math.max(0, parseInt(savedQ) || 0);
        }
        const savedTimer = localStorage.getItem('talentai_wma_timer');
        if (savedTimer) timerSeconds = parseInt(savedTimer) || 0;
    } catch (e) {
        console.error('进度恢复失败', e);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 屏幕切换
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 工具函数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function setEl(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function clamp10(val) {
    return Math.round(Math.min(10, Math.max(0, val)) * 10) / 10;
}

function r10(val) {
    return Math.round(Math.min(10, Math.max(0, val)) * 10) / 10;
}

function countAnswered() {
    return Object.keys(answers.W).length +
           Object.keys(answers.M).length +
           Object.keys(answers.A).length;
}

