/**
 * TalentAI WMA层测评系统
 * W层(20题) + M层(16题) = 36题（A层已移除，见综合报告说明）
 */

'use strict';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 层配置
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let WMA_TOTAL_QUESTIONS = 36;
const WMA_BANK_VERSION = '2026-06-w20-m16';

const WMA_LAYERS = [
    {
        key:           'W',
        name:          'W层·驱动价值测评',
        file:          'data/w-layer-questions.json',
        totalQuestions: 20,
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
            nextTime: '16题 · 约10分钟'
        }
    },
    {
        key:           'M',
        name:          'M层·元智能测评',
        file:          'data/m-layer-questions.json',
        totalQuestions: 16,
        icon:          '🧠',
        color:         '#b060ff',
        badge:         'M层 · 元智能',
        timeEstimate:  '约10分钟',
        cheer: {
            emoji:    '🔥',
            title:    '全部完成！',
            subtitle: 'W层与M层测评已完成',
            desc:     '你的驱动价值与思维操作系统画像已生成。\n\n正在为你生成四层综合报告……',
            nextName: '四层综合报告',
            nextDesc: '天赋 × 性格 × 驱动 × 元智能',
            nextTime: '即将跳转'
        }
    }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 全局状态
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let wmaData = { W: null, M: null };

let currentLayerIdx   = 0;
let currentQuestionIdx = 0;
let answers = { W: {}, M: {} };
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

    invalidateStaleWmaProgress();
    restoreProgress();

    // 仅 ¥29 Navigator 已付费用户可进入 W/M；寻路者不得仅凭 wma_paid 误入
    const navigatorPaid = localStorage.getItem('talentai_navigator_paid') === 'true';

    try {
        await loadAllLayers();
        console.log(`✅ WMA题库加载完成 W:${wmaData.W.questions.length} M:${wmaData.M.questions.length}`);

        if (navigatorPaid) {
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
    syncLayerTotals();
    clampWmaProgress();
}

function syncLayerTotals() {
    let total = 0;
    WMA_LAYERS.forEach(layer => {
        const qs = wmaData[layer.key]?.questions;
        layer.totalQuestions = qs ? qs.length : 0;
        total += layer.totalQuestions;
    });
    WMA_TOTAL_QUESTIONS = total;
    return total;
}

function getCurrentLayerQuestions() {
    return wmaData[WMA_LAYERS[currentLayerIdx].key].questions;
}

function getGlobalWmaQuestionNumber() {
    let n = 0;
    for (let i = 0; i < currentLayerIdx; i++) {
        n += wmaData[WMA_LAYERS[i].key].questions.length;
    }
    return n + currentQuestionIdx + 1;
}

function clampWmaProgress() {
    const maxLayer = WMA_LAYERS.length - 1;
    currentLayerIdx = Math.max(0, Math.min(maxLayer, currentLayerIdx));
    const questions = getCurrentLayerQuestions();
    if (questions && questions.length) {
        currentQuestionIdx = Math.max(0, Math.min(questions.length - 1, currentQuestionIdx));
    } else {
        currentQuestionIdx = 0;
    }
}

function invalidateStaleWmaProgress() {
    try {
        if (localStorage.getItem('talentai_wma_bank_v') === WMA_BANK_VERSION) return;
        [
            'talentai_wma_progress',
            'talentai_wma_layer',
            'talentai_wma_q',
            'talentai_wma_timer',
            'talentai_wma_answers',
            'talentai_wma_completed_at',
            'talentai_wma_scores',
            'talentai_wma_result'
        ].forEach(k => localStorage.removeItem(k));
        localStorage.setItem('talentai_wma_bank_v', WMA_BANK_VERSION);
        currentLayerIdx = 0;
        currentQuestionIdx = 0;
        answers = { W: {}, M: {} };
    } catch (e) {}
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
    const totalPct = Math.round(totalAnswered / WMA_TOTAL_QUESTIONS * 100);

    let content;
    if (toLayerIdx === 0) {
        // 欢迎卡（第一次付费后）
        content = {
            emoji:    '✨',
            cheer:    '支付成功！开始深度测评',
            title:    '欢迎进入三层深度测评',
            desc:     `接下来${WMA_TOTAL_QUESTIONS}道题分两个层次完成。\n每层结束后会有短暂休息。\n\n放松心态，诚实作答——\n答案没有对错，只有更接近真实的你。`,
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
    setEl('trans-progress-label', `总体进度 ${totalAnswered}/${WMA_TOTAL_QUESTIONS}题`);

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

    if (!questions.length) return;

    if (currentQuestionIdx >= questions.length) {
        currentQuestionIdx = questions.length - 1;
    }

    const q = questions[currentQuestionIdx];
    if (!q) {
        if (currentQuestionIdx < questions.length - 1) {
            currentQuestionIdx++;
            renderQuestion();
        } else if (currentLayerIdx < WMA_LAYERS.length - 1) {
            showTransition(currentLayerIdx + 1);
        } else {
            startCalc();
        }
        return;
    }
    const totalAnswered = countAnswered();
    const totalPct = Math.round(totalAnswered / WMA_TOTAL_QUESTIONS * 100);

    // ── Header ──
    setEl('prog-text', `${totalAnswered}/${WMA_TOTAL_QUESTIONS}`);
    const progFill = document.getElementById('prog-fill');
    if (progFill) progFill.style.width = totalPct + '%';

    // ── 双Badge同步（header + 题目区）──
    setEl('current-layer-badge',   `${layer.icon} ${layer.badge}`);
    setEl('current-layer-badge-q', `${layer.icon} ${layer.badge}`);
    setEl('current-layer-q', `第 ${currentQuestionIdx + 1} / ${questions.length} 题`);
    setEl('question-number-global', String(getGlobalWmaQuestionNumber()));

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
        const lastLayerQs = wmaData[WMA_LAYERS[WMA_LAYERS.length - 1].key].questions;
        const isLastQ = currentLayerIdx === WMA_LAYERS.length - 1 &&
                        currentQuestionIdx === lastLayerQs.length - 1;
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
        const prevQs = getCurrentLayerQuestions();
        currentQuestionIdx = prevQs.length - 1;
        renderQuestion();
    }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 下一题（核心流程控制）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function nextQuestion() {
    const layer     = WMA_LAYERS[currentLayerIdx];
    const questions = getCurrentLayerQuestions();
    if (!questions.length) return;

    const q         = questions[currentQuestionIdx];
    const layerKey  = layer.key;

    if (!q) {
        if (currentQuestionIdx < questions.length - 1) {
            currentQuestionIdx++;
            renderQuestion();
        } else if (currentLayerIdx < WMA_LAYERS.length - 1) {
            showTransition(currentLayerIdx + 1);
        } else if (!isSubmitting) {
            isSubmitting = true;
            startCalc();
        }
        return;
    }

    // 未作答 → 不跳
    if (!answers[layerKey] || !answers[layerKey][q.id]) return;

    // 防止重复提交
    if (isSubmitting) return;

    const isLastInLayer = currentQuestionIdx >= questions.length - 1;
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
    const rawScores    = { W: {}, M: {} };
    const behavTags    = {};
    const flags        = {};

    ['W', 'M'].forEach(lk => {
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
    const normalized = { W: {}, M: {} };

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

    // ── AI适配参考指数（由 M 层 AI协作维度推算，A层测评已取消）──
    const M = normalized.M;
    const W = normalized.W;
    const aiIndex = Math.round(((M.AC || 5) / 10) * 100);

    const composite = {
        execution:   r10((W.W2 || 0) * 0.35 + (M.VR || 0) * 0.35 + (M.GM || 0) * 0.30),
        innovation:  r10((W.W4 || 0) * 0.35 + (M.CR || 0) * 0.30 + (W.W5 || 0) * 0.35),
        social:      r10((W.W3 || 0) * 0.40 + (M.VR || 0) * 0.20 + (M.AC || 0) * 0.40),
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

const WMA_RESULT_HREF = 'wma-result.html';
let wmaFinishTriggered = false;

function saveWmaResultsAndRedirect(result) {
    let scores = result;
    try {
        if (!scores) scores = calcScores();
    } catch (e) {
        console.error('calcScores 失败，使用兜底数据', e);
        scores = {
            aiIndex: 0,
            normalized: { W: {}, M: {} },
            completedAt: new Date().toISOString()
        };
    }

    try {
        const wRaw = answers.W || {};
        const looksLikeLetters = Object.values(wRaw).some(v => typeof v === 'string' && /^[A-Z]$/i.test(v));
        if (looksLikeLetters || Object.keys(wRaw).length === 0) {
            answers.W = calculateWScoresFromAnswers(wRaw);
        }
        if (scores.normalized && scores.normalized.M && Object.keys(scores.normalized.M).length) {
            answers.M = { ...scores.normalized.M };
        }
        localStorage.setItem('talentai_wma_scores', JSON.stringify(scores));
        localStorage.setItem('talentai_wma_answers', JSON.stringify(answers));
        localStorage.setItem('talentai_wma_completed_at', scores.completedAt || new Date().toISOString());
        localStorage.setItem('talentai_navigator_paid', 'true');
        localStorage.removeItem('talentai_wma_paid');
        try { localStorage.removeItem(WMA_PROGRESS_KEY); } catch (_) {}
    } catch (e) {
        console.error('localStorage 写入失败', e);
    }

    const db5 = document.getElementById('db5');
    if (db5) {
        const idx = scores.aiIndex != null ? scores.aiIndex : '--';
        db5.innerHTML =
            `AI适配指数 ${idx}/100 · 报告生成完成<br>` +
            `<a href="${WMA_RESULT_HREF}" style="color:#6ee7b7;font-size:11px;margin-top:4px;display:inline-block;">若未自动跳转，请点击此处查看报告 →</a>`;
    }

    setTimeout(() => {
        window.location.assign(WMA_RESULT_HREF);
    }, 700);
}

function finishWmaAssessment() {
    if (wmaFinishTriggered) return;
    wmaFinishTriggered = true;
    let result = null;
    try {
        result = calcScores();
    } catch (e) {
        console.error('结算计分异常', e);
    }
    saveWmaResultsAndRedirect(result);
}

function startCalc() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    wmaFinishTriggered = false;
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
        setTimeout(() => {
            const el = document.getElementById(step.id);
            if (el) el.classList.add('active');
        }, step.delay);

        setTimeout(() => {
            const el = document.getElementById(step.id);
            if (el) {
                el.classList.remove('active');
                el.classList.add('done');
                const ic = el.querySelector('.cs-ic');
                if (ic) ic.textContent = '✅';
            }
            if (i === steps.length - 1) {
                finishWmaAssessment();
            }
        }, step.delay + 600);
    });

    // 动画步骤异常时仍保证跳转结果页
    setTimeout(finishWmaAssessment, 5200);
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
            const maxLayer = WMA_LAYERS.length - 1;
            currentLayerIdx = Math.max(0, Math.min(maxLayer, Number(progress.layer) || 0));
            currentQuestionIdx = Math.max(0, Number(progress.q) || 0);
            if (progress.answers && typeof progress.answers === 'object') {
                answers.W = progress.answers.W || {};
                answers.M = progress.answers.M || {};
            }
        } else {
            const savedAnswers = localStorage.getItem('talentai_wma_answers');
            if (savedAnswers) answers = JSON.parse(savedAnswers);
            const savedLayer = localStorage.getItem('talentai_wma_layer');
            if (savedLayer !== null) {
                currentLayerIdx = Math.max(0, Math.min(WMA_LAYERS.length - 1, parseInt(savedLayer) || 0));
            }
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
    let n = 0;
    WMA_LAYERS.forEach(layer => {
        const qs = wmaData[layer.key]?.questions || [];
        const layerAnswers = answers[layer.key] || {};
        qs.forEach(q => {
            if (layerAnswers[q.id]) n++;
        });
    });
    return n;
}

