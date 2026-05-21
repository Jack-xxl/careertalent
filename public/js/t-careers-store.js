/**
 * T 层 Top1 / Top3 职业数据统一读写
 * 标准 key：t_career_snapshot | t_career_top1 | t_career_top3
 */
(function (global) {
  const KEY_SNAPSHOT = 't_career_snapshot';
  const KEY_TOP1 = 't_career_top1';
  const KEY_TOP3 = 't_career_top3';

  const LEGACY_LIST_KEYS = [
    'talentai_careers_full',
    'talentai_t_careers_raw',
    'talentai_careers',
    'talentai_top1_top3_snapshot'
  ];

  function normalizeCareerItem(c) {
    if (!c || typeof c !== 'object') return null;
    return {
      id: c.id || '',
      name: c.name || c.title || c.careerName || '未命名职业',
      matchScore: c.matchScore ?? c.score ?? c.match ?? '--',
      description: c.description || c.desc || '',
      aiImpact: c.aiImpact || {},
      whyNewbieCanWin: c.whyNewbieCanWin || '',
      keySkills: c.keySkills || [],
      careerPath: c.careerPath || ''
    };
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('[TCareersStore] set failed', key, e);
      return false;
    }
  }

  function safeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function parseCareer(raw) {
    if (!raw) return null;
    try {
      return normalizeCareerItem(JSON.parse(raw));
    } catch (e) {
      return null;
    }
  }

  /** 从完整职业列表写入标准快照（T 层结果页 / 支付成功时调用） */
  function saveFromCareerList(list) {
    if (!list || !list.length) return false;
    const normalized = list.map(normalizeCareerItem).filter(Boolean);
    if (!normalized.length) return false;

    const top1 = normalized[0];
    const top3 = normalized[2] || normalized[1] || normalized[0];
    const snapshot = {
      savedAt: new Date().toISOString(),
      list: normalized,
      top1,
      top3
    };

    safeSet(KEY_TOP1, JSON.stringify(top1));
    safeSet(KEY_TOP3, JSON.stringify(top3));
    safeSet(KEY_SNAPSHOT, JSON.stringify(snapshot));

    // 兼容旧逻辑
    safeSet('talentai_careers_full', JSON.stringify(normalized));
    safeSet(
      'talentai_careers',
      JSON.stringify(normalized.map((c) => ({ name: c.name, matchScore: c.matchScore })))
    );
    safeSet('talentai_t_careers_raw', JSON.stringify(normalized));
    return true;
  }

  function getTop1() {
    return parseCareer(safeGet(KEY_TOP1));
  }

  function getTop3() {
    return parseCareer(safeGet(KEY_TOP3));
  }

  function getSnapshot() {
    const raw = safeGet(KEY_SNAPSHOT);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function hasSnapshot() {
    return !!(getTop1() && getTop3());
  }

  function hasPLayerData() {
    return (
      safeGet('talentai_p_completed') === '1' ||
      !!safeGet('talentai_p_dims') ||
      !!safeGet('talentai_p_result')
    );
  }

  function parseLegacyList(raw) {
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data) && data.length) return data;
      if (data && Array.isArray(data.list) && data.list.length) return data.list;
      if (data && data.top1) {
        return [data.top1, data.top2, data.top3].filter(Boolean);
      }
    } catch (e) {}
    return null;
  }

  function migrateFromLegacy() {
    if (hasSnapshot()) return true;
    for (let i = 0; i < LEGACY_LIST_KEYS.length; i++) {
      const list = parseLegacyList(safeGet(LEGACY_LIST_KEYS[i]));
      if (list && list.length) return saveFromCareerList(list);
    }
    return false;
  }

  /** 支付成功：从已有 localStorage 职业列表写入 t_career_* */
  function persistFromStorage() {
    if (migrateFromLegacy()) return true;
    return false;
  }

  function getUnlockPair() {
    migrateFromLegacy();
    const top1 = getTop1();
    const top3 = getTop3();
    if (top1 && top3) return { top1, top3 };
    return null;
  }

  async function ensureFromAnswers() {
    if (hasSnapshot()) return getUnlockPair();
    const answersStr = safeGet('talentai_answers');
    if (!answersStr || typeof global.generateCompleteResult !== 'function') return null;

    let answers;
    try {
      answers = JSON.parse(answersStr);
    } catch (e) {
      return null;
    }

    try {
      const [qRes, cRes] = await Promise.all([
        fetch('data/t-layer-questions.json'),
        fetch('data/careers-database.json')
      ]);
      if (!qRes.ok || !cRes.ok) return null;
      const qJson = await qRes.json();
      const cJson = await cRes.json();
      const questionsData = qJson.questions ? qJson.questions : qJson;
      let timings = {};
      try {
        timings = JSON.parse(safeGet('talentai_timings') || '{}');
      } catch (e) {}

      const result = global.generateCompleteResult(answers, timings, questionsData, cJson);
      const list = result && result.careerRecommendations;
      if (list && list.length) {
        saveFromCareerList(list);
        return getUnlockPair();
      }
    } catch (e) {
      console.warn('[TCareersStore] ensureFromAnswers failed', e);
    }
    return null;
  }

  global.TCareersStore = {
    KEY_SNAPSHOT,
    KEY_TOP1,
    KEY_TOP3,
    normalizeCareerItem,
    saveFromCareerList,
    getTop1,
    getTop3,
    getSnapshot,
    hasSnapshot,
    hasPLayerData,
    persistFromStorage,
    migrateFromLegacy,
    getUnlockPair,
    ensureFromAnswers,
    // 兼容旧调用名
    persistTopCareersSnapshot: saveFromCareerList,
    persistTopCareersSnapshotFromStorage: persistFromStorage,
    loadTopCareersList: function () {
      const s = getSnapshot();
      return s && s.list ? s.list : null;
    },
    ensureTopCareersFromAnswers: ensureFromAnswers
  };
})(typeof window !== 'undefined' ? window : global);
