console.log('✅ result.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
  console.log('=== 开始生成结果 ===');

  try {
    const userData = loadUserData();
    if (!userData) {
      showError('未找到测评数据，请先完成测评！');
      return;
    }

    const [questionsData, careersData] = await loadDataFiles();

    // ✅ 调用引擎生成完整结构结果
    const result = generateCompleteResult(
      userData.answers,
      userData.timings,
      questionsData,
      careersData
    );

    // ✅ 立即把最新职业数据存入localStorage（确保payment.html能读到）
    try {
      if (result.careerRecommendations && result.careerRecommendations.length > 0) {
        // 简版（name + matchScore，供payment.html快速读取）
        localStorage.setItem('talentai_careers', JSON.stringify(
          result.careerRecommendations.map(c => ({ name: c.name, matchScore: c.matchScore }))
        ));
        // 完整版（含aiImpact、description等，供支付后展示完整卡片）
        localStorage.setItem('talentai_careers_full', JSON.stringify(result.careerRecommendations));
        console.log('✅ 职业数据已更新:', result.careerRecommendations[0]?.name, result.careerRecommendations[2]?.name);
      }
    } catch(e) { console.warn('存储职业数据失败', e); }

    // ✅ 渲染整页（由 result-generator.js 实现）
    renderAll(result, userData);

    // 显示主内容
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';

    console.log('=== 页面渲染完成 ===');
  } catch (err) {
    console.error('❌ 生成结果失败:', err);
    showError('结果生成失败：' + err.message);
  }
});

function loadUserData() {
  const answersStr = localStorage.getItem('talentai_answers');
  const timingsStr = localStorage.getItem('talentai_timings');
  const completedAt = localStorage.getItem('talentai_completed_at');

  console.log('读取localStorage:', {
    answers: answersStr ? '✅' : '❌',
    timings: timingsStr ? '✅' : '❌',
    completedAt: completedAt ? '✅' : '❌'
  });

  if (!answersStr) return null;

  let answers;
  let timings;

  try {
    answers = JSON.parse(answersStr);
  } catch {
    console.warn('answers JSON解析失败');
    return null;
  }

  try {
    timings = timingsStr ? JSON.parse(timingsStr) : {};
  } catch {
    timings = {};
  }

  return { answers, timings, completedAt };
}

async function loadDataFiles() {
  const qRes = await fetch('data/t-layer-questions.json');
  if (!qRes.ok) throw new Error('题库加载失败：t-layer-questions.json');

  const cRes = await fetch('data/careers-database.json');
  if (!cRes.ok) throw new Error('职业库加载失败：careers-database.json');

  const qJson = await qRes.json();
  const cJson = await cRes.json();

  const questionsData = qJson.questions ? qJson.questions : qJson;
  const careersData = cJson;

  return [questionsData, careersData];
}

function showError(message) {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.innerHTML = `
      <div class="error-message">
        <h2>❌ ${message}</h2>
        <button onclick="window.location.href='assessment.html'" class="retry-button">
          返回重新测评
        </button>
      </div>
    `;
  } else {
    alert(message);
  }
}

function buyPackage(packageType) {
  console.log('购买套餐:', packageType);
  window.location.href =
    'https://careertalent-1.onrender.com/payment.html?package=' + encodeURIComponent(packageType);
}


