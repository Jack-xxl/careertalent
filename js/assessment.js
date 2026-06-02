/**
 * TalentAI T层测评系统 - 完整稳定版
 * 版本：Clean Stable Build
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 全局变量
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

let questionsData = null;
let currentDimensionIndex = 0;
let currentQuestionIndex = 0;

const dimensions = [
    { key: "T1_language", name: "语言智能" },
    { key: "T2_logic", name: "逻辑数学智能" },
    { key: "T3_spatial", name: "空间智能" },
    { key: "T4_music", name: "音乐智能" },
    { key: "T5_bodily", name: "身体动觉智能" },
    { key: "T6_interpersonal", name: "人际智能" },
    { key: "T7_intrapersonal", name: "内省智能" },
    { key: "T8_naturalist", name: "自然观察智能" }
];

let answers = {};
let questionStartTime = null;

// 初始化答案结构
dimensions.forEach(d => answers[d.key] = []);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 页面加载
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

window.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadQuestions();
        console.log("测评系统加载完成");
    } catch (err) {
        alert("题目加载失败：" + err.message);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 加载题目
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function loadQuestions() {
    const res = await fetch("data/t-layer-questions.json");

    if (!res.ok) {
        throw new Error("无法读取题库文件");
    }

    questionsData = await res.json();

    if (!questionsData.questions) {
        throw new Error("题库格式错误");
    }

    console.log("成功加载" + getTotalQuestionCount() + "题");
}

function getDimQuestionCount(dimIdx) {
    const key = dimensions[dimIdx].key;
    return questionsData.questions[key].length;
}

function getTotalQuestionCount() {
    return dimensions.reduce((sum, _, i) => sum + getDimQuestionCount(i), 0);
}

function getCurrentQuestionPosition() {
    let pos = 0;
    for (let i = 0; i < currentDimensionIndex; i++) {
        pos += getDimQuestionCount(i);
    }
    return pos + currentQuestionIndex + 1;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 开始测评
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

window.startAssessment = function () {

    document.getElementById("welcome-screen").classList.add("hidden");
    document.getElementById("question-screen").classList.remove("hidden");

    currentDimensionIndex = 0;
    currentQuestionIndex = 0;

    showQuestion();
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 显示题目
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

function showQuestion() {

    const dimension = dimensions[currentDimensionIndex];
    const dimQuestions = questionsData.questions[dimension.key];

    if (currentQuestionIndex >= dimQuestions.length) {
        if (currentDimensionIndex < dimensions.length - 1) {
            currentDimensionIndex++;
            currentQuestionIndex = 0;
            showQuestion();
            return;
        }
        completeAssessment();
        return;
    }

    const question = dimQuestions[currentQuestionIndex];
    if (!question) {
        nextQuestion();
        return;
    }

    document.getElementById("current-dimension").textContent = dimension.name;
    document.getElementById("question-text").textContent =
        question.question["zh-CN"] || question.question;

    document.getElementById("question-number").textContent =
        getCurrentQuestionPosition();

    renderOptions(question.options);

    updateProgress();

    const isFirst = currentDimensionIndex === 0 && currentQuestionIndex === 0;
    const prevBtn = document.getElementById("prev-btn");
    if (prevBtn) prevBtn.disabled = isFirst;

    questionStartTime = Date.now();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 渲染选项
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

function renderOptions(options) {

    const container = document.getElementById("options-container");
    container.innerHTML = "";

    options.forEach(opt => {

        const div = document.createElement("div");
        div.className = "option-card glass-card p-4 rounded-xl border border-gray-700";
        div.innerHTML = `
            <div class="font-semibold">${opt.id}. ${opt.text["zh-CN"] || opt.text}</div>
        `;

        div.onclick = () => selectAnswer(opt.id, div);

        container.appendChild(div);
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 选择答案
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

function selectAnswer(optionId, element) {

    const dimensionKey = dimensions[currentDimensionIndex].key;

    answers[dimensionKey][currentQuestionIndex] = optionId;

    document.querySelectorAll(".option-card").forEach(el =>
        el.classList.remove("selected")
    );

    element.classList.add("selected");

    updateProgress();

    setTimeout(() => nextQuestion(), 400);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 下一题
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

window.nextQuestion = function () {

    const dimLen = getDimQuestionCount(currentDimensionIndex);

    if (currentQuestionIndex < dimLen - 1) {
        currentQuestionIndex++;
    } else if (currentDimensionIndex < dimensions.length - 1) {
        currentDimensionIndex++;
        currentQuestionIndex = 0;
    } else {
        completeAssessment();
        return;
    }

    showQuestion();
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 上一题
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

window.previousQuestion = function () {

    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
    } else if (currentDimensionIndex > 0) {
        currentDimensionIndex--;
        currentQuestionIndex = getDimQuestionCount(currentDimensionIndex) - 1;
    }

    showQuestion();
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 进度
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getTotalAnswered() {
    let total = 0;
    dimensions.forEach(d => {
        total += answers[d.key].filter(Boolean).length;
    });
    return total;
}

function updateProgress() {
    const total = getTotalQuestionCount();
    const percent = (getTotalAnswered() / total) * 100;
    document.getElementById("progress-bar").style.width = percent + "%";
    document.getElementById("progress-text").textContent =
        getCurrentQuestionPosition() + "/" + total;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 完成测评
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━

function completeAssessment() {
    let unanswered = 0;
    dimensions.forEach((d, di) => {
        const len = getDimQuestionCount(di);
        for (let i = 0; i < len; i++) {
            if (!answers[d.key] || !answers[d.key][i]) unanswered++;
        }
    });
    if (unanswered > 0) {
        alert('尚有题目未完成，请继续作答。');
        return;
    }

    localStorage.setItem("talentai_answers", JSON.stringify(answers));
    localStorage.setItem("talentai_completed_at", new Date().toISOString());

    document.getElementById("question-screen").classList.add("hidden");
    document.getElementById("loading-screen").classList.remove("hidden");

    setTimeout(() => {
        window.location.href = "result.html";
    }, 800);
}
