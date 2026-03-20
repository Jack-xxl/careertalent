/**
 * TalentAI 职业生态引擎 - 三层输出
 * 用户五层 → 职业生态(一级) → 职业方向(二级) → 具体职业(三级)
 */

(function (global) {
  "use strict";

  const CAREER_FAMILIES = [
    "Creator", "Solver", "Organizer", "Influencer",
    "Explorer", "Builder", "Helper", "Operator"
  ];

  /** 8 大职业生态 - 展示名称 */
  const ECOSYSTEM_LABELS = {
    Creator: "创造生态",
    Solver: "解决生态",
    Organizer: "运营生态",
    Influencer: "影响赋能生态",
    Explorer: "探索生态",
    Builder: "守护生态",
    Helper: "服务生态",
    Operator: "执行生态"
  };

  /** 职业方向（二级）：track_id → direction_id */
  const TRACK_TO_DIRECTION = {
    ai_engineering: "ai_tech",
    software_engineering: "ai_tech",
    data_science: "ai_tech",
    cyber_security: "ai_tech",
    advanced_tech_rd: "ai_tech",
    product_management: "ai_product",
    educational_content_design: "ai_edu",
    education_growth: "ai_edu",
    digital_content_creation: "content",
    visual_design_branding: "content",
    digital_art_entertainment: "content",
    business_operations: "business",
    business_dev_sales: "business",
    marketing_branding: "business",
    strategy_consulting: "strategy",
    project_management: "operations",
    entrepreneurship_leadership: "entrepreneurship",
    investment_capital: "investment",
    scientific_research: "research",
    social_policy_research: "research",
    user_behavioral_research: "research",
    intelligent_manufacturing: "build",
    engineering_design: "build",
    architecture_urban: "build",
    new_energy_tech: "build",
    healthcare: "service",
    family_social_support: "service",
    ecommerce_platform_ops: "operations",
    business_automation_ops: "operations",
    logistics_system_ops: "operations"
  };

  /** 职业方向 - 展示名称 */
  const DIRECTION_NAMES = {
    ai_tech: "AI技术",
    ai_product: "AI产品",
    ai_edu: "AI教育",
    content: "内容创作",
    business: "商业增长",
    strategy: "战略与咨询",
    operations: "运营执行",
    entrepreneurship: "创业与领导",
    investment: "投资与资本",
    research: "研究",
    build: "制造与建造",
    service: "服务与帮助"
  };

  const FAMILY_TO_SPEC = {
    creator: "Creator", solver: "Solver", organizer: "Organizer",
    influencer: "Influencer", explorer: "Explorer", guardian: "Solver", builder: "Builder",
    helper: "Helper", operator: "Operator"
  };

  /** 按 Family 的 Career Score 权重：ability / motiv(W) / mind(M)，使 Creator 更吃 W、Solver 更吃 ability */
  const FAMILY_WEIGHTS = {
    Solver:   { ability: 0.75, motiv: 0.15, mind: 0.07 },
    Creator:  { ability: 0.60, motiv: 0.30, mind: 0.07 },
    Organizer: { ability: 0.50, motiv: 0.25, mind: 0.15 },
    Influencer: { ability: 0.50, motiv: 0.25, mind: 0.15 },
    Explorer: { ability: 0.55, motiv: 0.20, mind: 0.15 },
    Builder:   { ability: 0.55, motiv: 0.20, mind: 0.15 },
    Helper:    { ability: 0.50, motiv: 0.25, mind: 0.15 },
    Operator:  { ability: 0.50, motiv: 0.25, mind: 0.15 }
  };

  // 职业库 career_track_id → tracks-database 中的 canonical track_id（仅 4 条）
  // 使内容/视觉/游戏/教育等职业使用向量 T/P 匹配，区分不同认知型（如语言+空间型）
  const TRACK_ID_TO_CANONICAL = {
    digital_content_creation: "content_creation",
    educational_content_design: "content_creation",
    visual_design_branding: "visual_design",
    digital_art_entertainment: "visual_design",
    game_content_design: "visual_design",
    ai_engineering: "ai_engineering",
    software_engineering: "ai_engineering",
    data_science: "ai_engineering",
    cyber_security: "ai_engineering",
    advanced_tech_rd: "ai_engineering",
    compute_infra: "ai_engineering",
    blockchain_tech: "ai_engineering",
    education_growth: "education",
    healthcare: "education",
    social_service: "education",
    animal_health: "education",
    entrepreneurship_leadership: "entrepreneurship"
  };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function safeGet(obj, path, fallback) {
    try {
      return path.split(".").reduce((o, k) => o?.[k], obj) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Track 画像加载与向量匹配基础（v3.1）
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let _TRACKS_CACHE = null;

  async function loadTracksDB() {
    if (_TRACKS_CACHE) return _TRACKS_CACHE;
    try {
      const res = await fetch("data/tracks-database.json");
      const data = await res.json();
      _TRACKS_CACHE = {};
      (data.tracks || []).forEach((t) => {
        if (t.track_id) _TRACKS_CACHE[t.track_id] = t;
      });
    } catch (e) {
      console.warn("[TalentAI] loadTracksDB failed:", e);
      _TRACKS_CACHE = {};
    }
    return _TRACKS_CACHE;
  }

  function normalizeUserT(userT) {
    if (!userT) {
      return {
        T1: 0, T2: 0, T3: 0, T4: 0,
        T5: 0, T6: 0, T7: 0, T8: 0
      };
    }
    if (userT.T1 !== undefined) return userT;
    return {
      T1: userT.T1_language   || 0,
      T2: userT.T2_logic      || 0,
      T3: userT.T3_spatial    || 0,
      T4: userT.T4_music      || 0,
      T5: userT.T5_body       || 0,
      T6: userT.T6_social     || 0,
      T7: userT.T7_creativity || 0,
      T8: userT.T8_nature     || 0
    };
  }

  // 将页面 W 格式 { VD, RD, TD, ED, SD, CO } 或 { W1..W7 } 转为引擎 v2.1 七维 W1-W7 (0-100)
  // 存储若为 0-10（WMA 归一化），需乘 10 与 abilityScore(0-100) 同尺度，否则 Career Score 被压低
  function normalizeUserW(userW) {
    if (!userW) return { W1: 50, W2: 50, W3: 50, W4: 50, W5: 50, W6: 50, W7: 50 };
    const to100 = (v) => {
      const n = Number(v);
      if (n > 10) return clamp(n, 0, 100); // 已是 0-100
      return Math.round((n || 5) * 10);     // 0-10 → 0-100
    };
    if (userW.W1 !== undefined) {
      return {
        W1: to100(userW.W1), W2: to100(userW.W2), W3: to100(userW.W3),
        W4: to100(userW.W4), W5: to100(userW.W5), W6: to100(userW.W6), W7: to100(userW.W7)
      };
    }
    return {
      W1: to100(userW.RD),   W2: to100(userW.SD),   W3: to100(userW.TD),
      W4: to100(userW.ED),   W5: to100(userW.CO),   W6: to100(userW.VD),   W7: to100(userW.TD)
    };
  }

  // W 层向量匹配（含软惩罚 + 人格校验）
  function computeW_Match(userW, userP, careerWWeights) {
    const w = normalizeUserW(userW);
    const p = userP || {};
    const C = p.conscientiousness ?? p.C ?? 50;
    const A = p.agreeableness ?? p.A ?? 50;
    let sum = 0, total = 0;
    Object.entries(careerWWeights || {}).forEach(([dim, weight]) => {
      if (!weight) return;
      sum += (w[dim] ?? 50) * weight;
      total += weight;
    });
    const rawW = total > 0 ? sum / total : 50;
    const minBasic = Math.min(
      w["W1"] ?? 50,
      w["W2"] ?? 50,
      w["W3"] ?? 50
    );
    const W_base = 0.85 + 0.15 * (minBasic / 100);
    let P_factor = 1.0;
    const W6 = w["W6"] ?? 0;
    const W7 = w["W7"] ?? 0;
    if (W6 > 80 || W7 > 80) {
      if (C < 55) {
        P_factor = 0.75;
      } else if (A <= 40 && C < 65) {
        P_factor = 0.80;
      }
    }
    return rawW * W_base * P_factor;
  }

  // 从 localStorage 中读取原始 T 维度向量（displayScore）
  function loadUserTVector() {
    try {
      if (typeof localStorage === "undefined") return null;
      const raw = JSON.parse(localStorage.getItem("talentai_t_scores") || "{}");
      return {
        T1: raw.T1_language?.displayScore        || 0,
        T2: raw.T2_logic?.displayScore           || 0,
        T3: raw.T3_spatial?.displayScore         || 0,
        T4: raw.T4_music?.displayScore           || 0,
        T5: raw.T5_bodily?.displayScore          || 0,
        T6: raw.T6_interpersonal?.displayScore   || 0,
        T7: raw.T7_intrapersonal?.displayScore   || 0,
        T8: raw.T8_naturalist?.displayScore      || 0
      };
    } catch (e) {
      return null;
    }
  }

  function loadUserWVector() {
    try {
      if (typeof localStorage === "undefined") return null;
      const raw = JSON.parse(localStorage.getItem("talentai_wma_answers") || "{}");
      const W = raw.W || {};
      // 若 W5 是字符串说明存的是选项字母（A/B/C/D），不是分数，需重新答题
      if (typeof W.W5 === "string") return null;
      // 已经是新格式 W1-W7 数字，直接返回
      if (W.W1 !== undefined) return W;
      // 旧格式 VD/RD/TD/ED/SD/CO → 转为 W1-W7（0-10 尺度，与 normalizeUserW 一致）
      if (W.RD !== undefined || W.VD !== undefined) {
        return {
          W1: (W.RD || 0) * 10,
          W2: (W.SD || 0) * 10,
          W3: (W.TD || 0) * 10,
          W4: (W.ED || 0) * 10,
          W5: Math.max(0, 10 - (W.SD || 0)) * 10,
          W6: (W.VD || 0) * 10,
          W7: (W.TD || 0) * 8
        };
      }
      return null;
    } catch (e) { return null; }
  }

  function loadUserPVector() {
    try {
      if (typeof localStorage === "undefined") return null;
      const raw = JSON.parse(localStorage.getItem("talentai_wma_answers") || "{}");
      if (raw.P && raw.P.openness !== undefined) return raw.P;
      return null;
    } catch (e) { return null; }
  }

  function loadUserMVector() {
    try {
      if (typeof localStorage === "undefined") return null;
      const raw = JSON.parse(localStorage.getItem("talentai_wma_answers") || "{}");
      if (raw.M && raw.M["M-SYS"] !== undefined) return raw.M;
      return null;
    } catch (e) { return null; }
  }

  function computeT_VectorMatch(userT, requiredT) {
    if (!requiredT || !Object.keys(requiredT).length) return 50;
    const t = normalizeUserT(userT);
    let weightedSum = 0, totalWeight = 0;
    Object.entries(requiredT).forEach(([dim, weight]) => {
      if (!weight) return;
      const score = (t[dim] || 0) * 10; // 0-10 → 0-100
      weightedSum += score * weight;
      totalWeight += weight;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 50;
  }

  function computeP_VectorMatch(userP, requiredP) {
    if (!requiredP || !Object.keys(requiredP).length) return 50;
    const p = userP || {};
    let weightedSum = 0, totalWeight = 0;
    Object.entries(requiredP).forEach(([dim, weight]) => {
      if (!weight) return;
      const score = p[dim] || 50;
      const absW = Math.abs(weight);
      weightedSum += (weight < 0 ? (100 - score) : score) * absW;
      totalWeight += absW;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 50;
  }

  function normalizeUserM(userM) {
    if (!userM) return { "M-SYS": 50, "M-STR": 50, "M-RSK": 50, "M-INT": 50, "M-MET": 50 };
    if (userM["M-SYS"] !== undefined) return userM;
    const to100 = (v) => Math.round((Number(v) || 5) * 10);
    return {
      "M-SYS": to100(userM.AC),
      "M-STR": to100(userM.ST),
      "M-RSK": to100(userM.VR),
      "M-INT": to100(userM.CR),
      "M-MET": to100(typeof userM.GM === "number" && typeof userM.EB === "number" ? (userM.GM + userM.EB) / 2 : (userM.GM || userM.EB || 5))
    };
  }

  function computeM_VectorMatch(userM, requiredM) {
    if (!requiredM || !Object.keys(requiredM).length) return 50;
    const m = normalizeUserM(userM);
    let weightedSum = 0, totalWeight = 0;
    Object.entries(requiredM).forEach(([dim, weight]) => {
      if (!weight) return;
      const raw = m[dim];
      const score = typeof raw === "number" ? (raw <= 10 ? raw * 10 : raw) : 50;
      weightedSum += score * weight;
      totalWeight += weight;
    });
    return totalWeight > 0 ? weightedSum / totalWeight : 50;
  }

  function computeThresholdFactor(userT, abilityGates) {
    if (!abilityGates || !Object.keys(abilityGates).length) return 1.0;
    const t = normalizeUserT(userT);
    let totalPenalty = 0, count = 0;
    Object.entries(abilityGates).forEach(([dim, threshold]) => {
      const score = (t[dim] || 0) * 10;
      if (score < threshold) {
        totalPenalty += (threshold - score) / threshold;
      }
      count++;
    });
    return Math.max(0.75, 1.0 - (totalPenalty / count) * 0.5);
  }

  function normalizeCareers(careers) {
    if (Array.isArray(careers)) return careers;
    if (careers && typeof careers === "object") return Object.values(careers);
    return [];
  }

  function getCareerFamily(c) {
    const f = (c.career_family || c.family || "creator").toLowerCase();
    return FAMILY_TO_SPEC[f] || CAREER_FAMILIES[0];
  }

  function getCareerTrack(c) {
    return c.career_track || c.family || "General";
  }

  function getCareerFit(c) {
    const ft = Number(c.fit_T) || 0.75;
    const fp = Number(c.fit_P) || 0.75;
    const fw = Number(c.fit_W) || 0.75;
    const fm = Number(c.fit_M) || 0.75;
    const fa = Number(c.fit_A) || 0.75;
    return { fit_T: clamp(ft, 0.5, 1), fit_P: clamp(fp, 0.5, 1), fit_W: clamp(fw, 0.5, 1), fit_M: clamp(fm, 0.5, 1), fit_A: clamp(fa, 0.5, 1) };
  }

  function calcTScore(userT, req) {
    const keys = Object.keys(req || {});
    if (!keys.length) return 70;
    let total = 0, count = 0, hardPenalty = 1, bonus = 0;
    keys.forEach((k) => {
      const need = Number(req[k] || 0);
      const have = Number(safeGet(userT, k, 6) || 6);
      if (need <= 0) return;
      const ratio = have / need;
      let localScore;
      if (have >= need) {
        localScore = 100 + Math.min((have - need) * 6, 12);
        if (have >= 8.5 && need >= 7.4) bonus += Math.min((have - need) * 2.5, 5);
      } else {
        localScore = Math.pow(clamp(ratio, 0, 1), 1.45) * 100;
        const gap = need - have;
        if (gap > 1.8) hardPenalty *= 0.8;
        else if (gap > 1) hardPenalty *= 0.9;
      }
      total += localScore;
      count++;
    });
    const base = count ? total / count : 50;
    return clamp(base * hardPenalty + bonus, 0, 100);
  }

  const FAMILY_P = {
    Creator: { O: 0.3, E: 0.18, C: 0.14, A: 0.1, NINV: 0.12 },
    Solver: { O: 0.18, C: 0.24, E: 0.1, A: 0.08, NINV: 0.2 },
    Organizer: { O: 0.1, C: 0.28, E: 0.12, A: 0.16, NINV: 0.18 },
    Influencer: { O: 0.18, C: 0.1, E: 0.28, A: 0.16, NINV: 0.08 },
    Explorer: { O: 0.3, C: 0.14, E: 0.1, A: 0.08, NINV: 0.12 },
    Builder: { O: 0.1, C: 0.3, E: 0.08, A: 0.1, NINV: 0.24 },
    Helper: { O: 0.1, C: 0.14, E: 0.18, A: 0.26, NINV: 0.12 },
    Operator: { O: 0.08, C: 0.24, E: 0.1, A: 0.1, NINV: 0.24 }
  };
  const FAMILY_W = {
    Creator: { ED: 0.28, CO: 0.28, VD: 0.18, RD: 0.14, SD: 0.06, TD: 0.06 },
    Solver: { VD: 0.24, CO: 0.24, RD: 0.2, SD: 0.16, ED: 0.1, TD: 0.06 },
    Organizer: { SD: 0.28, VD: 0.22, TD: 0.18, CO: 0.16, RD: 0.1, ED: 0.06 },
    Influencer: { ED: 0.24, TD: 0.22, RD: 0.18, VD: 0.16, CO: 0.12, SD: 0.08 },
    Explorer: { CO: 0.28, ED: 0.22, VD: 0.18, SD: 0.12, RD: 0.1, TD: 0.1 },
    Builder: { SD: 0.28, VD: 0.24, CO: 0.16, RD: 0.12, TD: 0.1, ED: 0.1 },
    Helper: { VD: 0.3, TD: 0.22, ED: 0.2, SD: 0.1, CO: 0.1, RD: 0.08 },
    Operator: { SD: 0.26, RD: 0.22, VD: 0.18, CO: 0.16, ED: 0.1, TD: 0.08 }
  };
  const FAMILY_M = {
    Creator: { CR: 0.24, GM: 0.2, VR: 0.18, AC: 0.18, ST: 0.12, EB: 0.08 },
    Solver: { ST: 0.26, GM: 0.18, VR: 0.18, AC: 0.14, CR: 0.14, EB: 0.1 },
    Organizer: { VR: 0.24, ST: 0.2, GM: 0.16, AC: 0.16, CR: 0.1, EB: 0.14 },
    Influencer: { AC: 0.18, VR: 0.18, GM: 0.18, CR: 0.16, EB: 0.14, ST: 0.12 },
    Explorer: { CR: 0.22, ST: 0.2, GM: 0.18, AC: 0.16, VR: 0.14, EB: 0.1 },
    Builder: { EB: 0.26, ST: 0.2, VR: 0.16, GM: 0.14, AC: 0.12, CR: 0.08 },
    Helper: { EB: 0.2, VR: 0.18, GM: 0.18, AC: 0.14, ST: 0.14, CR: 0.1 },
    Operator: { VR: 0.24, ST: 0.18, GM: 0.16, AC: 0.16, EB: 0.14, CR: 0.08 }
  };

  function calcPScore(userP, family) {
    const p = FAMILY_P[family] || FAMILY_P.Creator;
    const vals = {
      O: (userP.O || 65) / 10,
      C: (userP.C || 65) / 10,
      E: (userP.E || 65) / 10,
      A: (userP.A || 65) / 10,
      NINV: (100 - (userP.N || 45)) / 10
    };
    let total = 0;
    Object.entries(p).forEach(([k, w]) => {
      total += (vals[k] || 5) * w * 10;
    });
    return clamp(total, 0, 100);
  }

  function calcWScore(userW, family) {
    const w = FAMILY_W[family] || FAMILY_W.Creator;
    let total = 0;
    Object.entries(w).forEach(([k, weight]) => {
      total += (userW[k] || 5) * weight * 10;
    });
    return clamp(total, 0, 100);
  }

  function calcMScore(userM, family) {
    const m = FAMILY_M[family] || FAMILY_M.Creator;
    let total = 0;
    Object.entries(m).forEach(([k, weight]) => {
      total += (userM[k] || 5) * weight * 10;
    });
    return clamp(total, 0, 100);
  }

  function calcAIScore(aiIndex, aDims, composite) {
    const ai = Number(aiIndex || 55);
    const a3 = Number(aDims?.A3 || 5);
    const a4 = Number(aDims?.A4 || 5);
    const leverage = Number(composite?.ai_leverage || 5);
    return clamp(ai * 0.55 + a3 * 4 + a4 * 2.5 + leverage * 1.8, 0, 100);
  }

  /**
   * 用户五层分数（0-100），用于展示与职业级 Career Score
   * P = 五维性格平均：开放性、尽责性、外向性、宜人性、情绪稳定性(100-N)
   */
  function computeUserLayerScores100(userScores) {
    const T_KEYS = ["T1_language", "T2_logic", "T3_spatial", "T4_music", "T5_bodily", "T6_interpersonal", "T7_intrapersonal", "T8_naturalist"];
    const tSum = T_KEYS.reduce((acc, k) => acc + (Number(safeGet(userScores.tScores, `${k}.displayScore`, 6)) || 6), 0);
    const userT = T_KEYS.length ? clamp((tSum / T_KEYS.length) * 10, 0, 100) : 70;

    const userP = (() => {
      const O = Number(userScores.pScores?.O ?? 65);
      const C = Number(userScores.pScores?.C ?? 65);
      const E = Number(userScores.pScores?.E ?? 65);
      const A = Number(userScores.pScores?.A ?? 65);
      const N = Number(userScores.pScores?.N ?? 45);
      const emotionalStability = 100 - N;
      return clamp((O + C + E + A + emotionalStability) / 5, 0, 100);
    })();

    const userW = (() => {
      const w = userScores.normalized?.W || {};
      const vals = Object.values(w).filter((v) => typeof v === "number");
      if (!vals.length) return 70;
      return clamp((vals.reduce((a, b) => a + b, 0) / vals.length) * 10, 0, 100);
    })();

    const userM = (() => {
      const m = userScores.normalized?.M || {};
      const vals = Object.values(m).filter((v) => typeof v === "number");
      if (!vals.length) return 70;
      return clamp((vals.reduce((a, b) => a + b, 0) / vals.length) * 10, 0, 100);
    })();

    const userA = calcAIScore(userScores.aiIndex, userScores.normalized?.A, userScores.composite);
    return { T: userT, P: userP, W: userW, M: userM, A: userA };
  }

  /**
   * Step 1: 计算各 Career Family 得分
   * 五层综合: T 28% + P 15% + W 22% + M 17% + A 18%
   */
  function calculateCareerFamilyScore(userScores, careers) {
    const list = normalizeCareers(careers);
    const userT = {};
    ["T1_language","T2_logic","T3_spatial","T4_music","T5_bodily","T6_interpersonal","T7_intrapersonal","T8_naturalist"].forEach((k) => {
      userT[k] = Number(safeGet(userScores.tScores, `${k}.displayScore`, 6)) || 6;
    });
    const userP = userScores.pScores || {};
    const userW = userScores.normalized?.W || {};
    const userM = userScores.normalized?.M || {};
    const aScore = calcAIScore(userScores.aiIndex, userScores.normalized?.A, userScores.composite);

    const familyScores = {};
    CAREER_FAMILIES.forEach((f) => (familyScores[f] = 0));

    list.forEach((c) => {
      const family = getCareerFamily(c);
      const t = calcTScore(userT, c.requiredAbilities || c.req || {});
      const p = calcPScore(userP, family);
      const w = calcWScore(userW, family);
      const m = calcMScore(userM, family);
      const score = 0.28 * t + 0.15 * p + 0.22 * w + 0.17 * m + 0.18 * aScore;
      if (!familyScores[family]) familyScores[family] = 0;
      familyScores[family] = Math.max(familyScores[family], score);
    });

    return Object.entries(familyScores)
      .filter(([, v]) => v > 0)
      .map(([family, score]) => ({ family, score: Math.round(score) }))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Step 2 & 3: 选 Top 3 Families → 每个职业算 Career Score → 按 Career Score 排序
   * Career Score = 0.30*(User_T*fit_T) + 0.20*(User_P*fit_P) + 0.20*(User_W*fit_W) + 0.20*(User_M*fit_M) + 0.10*(User_A*fit_A)
   */
  async function matchCareersThreeLevel(userScores, careers, userPreferences) {
    const list = normalizeCareers(careers);
    if (!list.length) return { careerResults: [], topFamilies: [], topTracks: [], extendedPool: [], topCareers: [], debug: {} };

    const userT = {};
    ["T1_language", "T2_logic", "T3_spatial", "T4_music", "T5_bodily", "T6_interpersonal", "T7_intrapersonal", "T8_naturalist"].forEach(
      (k) => {
        userT[k] = Number(safeGet(userScores.tScores, `${k}.displayScore`, 6)) || 6;
      }
    );
    const userW = loadUserWVector() || userScores.normalized?.W || { W1: 50, W2: 50, W3: 50, W4: 50, W5: 50, W6: 50, W7: 50 };
    const userP = loadUserPVector() || userScores.pScores || { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 };
    const userM = loadUserMVector() || userScores.normalized?.M || {};
    const userPForMatch = {
      ...userP,
      openness: userP.openness ?? userP.O ?? 50,
      conscientiousness: userP.conscientiousness ?? userP.C ?? 50,
      extraversion: userP.extraversion ?? userP.E ?? 50,
      agreeableness: userP.agreeableness ?? userP.A ?? 50,
      neuroticism: userP.neuroticism ?? userP.N ?? 50
    };

    console.log("[userP] 引擎拿到的P层数据", userP);

    const user100 = computeUserLayerScores100(userScores);
    const tracksDB = await loadTracksDB();

    const familyRanked = calculateCareerFamilyScore(userScores, list);
    const topFamilies = familyRanked.slice(0, 3).map((x) => x.family);

    // 创业指数：W5 自主 + W4 成长 + W7 领导，用于创业赛道加分
    const wNorm = normalizeUserW(userW);
    const entrepreneurIndex =
      0.4 * (wNorm["W5"] || 0) +
      0.3 * (wNorm["W4"] || 0) +
      0.3 * (wNorm["W7"] || 0);

    // Career Score 权重：按 Family 使用 FAMILY_WEIGHTS（Solver 重 ability，Creator 重 motiv/W）
    const WEIGHTS = { ABILITY: 0.50, W: 0.20, M: 0.20, A: 0.10 }; // 仅用于 refineScore 等中间量
    const trackScores = {};
    const careersByTrack = {};
    const allScoredCareers = [];

    list.forEach((c) => {
      const family = getCareerFamily(c);
      const track = getCareerTrack(c);
      const trackKey = `${family}::${track}`;

      const fit = getCareerFit(c);
      let T_match = null;
      let mScore;
      const mUsing = c.m_weights && Object.keys(c.m_weights).length > 0 ? "vector" : "legacy";
      if (mUsing === "vector") {
        mScore = computeM_VectorMatch(userM, c.m_weights);
      } else {
        mScore = user100.M * fit.fit_M;
      }
      const matchT = clamp(Math.round(user100.T * fit.fit_T), 0, 100);
      const matchP = clamp(Math.round(user100.P * fit.fit_P), 0, 100);
      const matchW = clamp(Math.round(user100.W * fit.fit_W), 0, 100);
      const matchM = clamp(Math.round(mScore), 0, 100);
      const matchA = clamp(Math.round(user100.A * fit.fit_A), 0, 100);

      // 两段式得分：baseScore = abilityScore 决定大方向，refineScore 决定同一方向内排序
      let baseScore;
      const trackId = c.career_track_id || c.track_id;
      const canonicalTrackId = (trackId && TRACK_ID_TO_CANONICAL[trackId]) || trackId;
      // 优先使用 localStorage 中的原始 T 维度向量，否则退回到当前 userT 平均结构
      const nT = loadUserTVector() || normalizeUserT(userT);
      if (canonicalTrackId && tracksDB[canonicalTrackId]) {
        const trackMeta = tracksDB[canonicalTrackId];
        T_match = computeT_VectorMatch(nT, trackMeta.required_T || {});
        const P_match = computeP_VectorMatch(userPForMatch, trackMeta.required_P || {});
        const threshold = computeThresholdFactor(nT, trackMeta.ability_gates || {});
        const abilityScore = (0.7 * T_match + 0.3 * P_match) * threshold;
        baseScore = abilityScore;
        if (threshold < 1) {
          console.log("[thresholdFactor]", { career: c.name, track_id: trackId, canonical: canonicalTrackId, threshold: threshold.toFixed(2) });
        }
        console.log("[WMA AbilityScore]", {
          career: c.name,
          track_id: trackId,
          canonical: canonicalTrackId,
          T_match: T_match.toFixed(1),
          P_match: P_match.toFixed(1),
          AbilityScore: abilityScore.toFixed(1)
        });
      } else {
        const userT_avg = user100.T;
        const userP_avg = user100.P;
        const fit_T = fit.fit_T;
        const fit_P = fit.fit_P;
        T_match = user100.T * fit_T;
        // 无 canonical track 时用 T/P 拟合作为能力分（WEIGHTS 无 T/P，用 0.5/0.5）
        baseScore = 0.5 * (userT_avg * fit_T) + 0.5 * (userP_avg * fit_P);
      }
      const userW_avg = user100.W;

      // W 层匹配：优先使用职业级 w_weights 进行向量匹配，否则退回旧算法
      let wScore;
      if (c.w_weights && Object.keys(c.w_weights).length > 0) {
        wScore = computeW_Match(userW, userPForMatch, c.w_weights);
        console.log("[W_Match]", {
          career: c.name,
          wScore: wScore.toFixed(1),
          using: "vector"
        });
      } else {
        wScore = userW_avg * fit.fit_W;
        console.log("[W_Match]", {
          career: c.name,
          wScore: wScore.toFixed(1),
          using: "legacy"
        });
      }

      console.log("[M_Match]", c.name, mUsing, mScore.toFixed(1));

      const refineScore =
        WEIGHTS.W * wScore +
        WEIGHTS.M * mScore +
        WEIGHTS.A * (user100.A * fit.fit_A);

      // 最终 Career Score：按 Family 使用 FAMILY_WEIGHTS（ability/motiv/mind 已 0-100，加权平均即 0-100，勿再乘 100）
      const abilityForFormula = baseScore || 0; // baseScore 即 abilityScore (0-100)
      const fw = FAMILY_WEIGHTS[family] || FAMILY_WEIGHTS["Organizer"];
      const weightSum = fw.ability + fw.motiv + fw.mind;
      let careerScore =
        weightSum > 0
          ? (fw.ability * abilityForFormula + fw.motiv * wScore + fw.mind * mScore) / weightSum
          : 0;

      // 创业加权：当创业指数较高时，明显放大创业/领导相关岗位的权重
      if (entrepreneurIndex >= 75) {
        const trackIdForBoost = c.career_track_id || c.track_id;
        const canonicalForBoost = (trackIdForBoost && TRACK_ID_TO_CANONICAL[trackIdForBoost]) || trackIdForBoost;
        const familyLower = String(family || "").toLowerCase();
        const nameLower =
          String(c.name_en || c.name_zh || c.name || "").toLowerCase();

        const isEntrepreneurialCareer =
          canonicalForBoost === "entrepreneurship" ||
          familyLower.includes("entrepreneurship") ||
          familyLower.includes("startup") ||
          familyLower.includes("leadership") ||
          /创业|创始|创业者|founder|startup|ceo/i.test(nameLower);

        if (isEntrepreneurialCareer) {
          // 1.4 倍系数 + 15 分偏好（再由后面的 clamp 限制在 0~100）
          careerScore = careerScore * 1.4 + 15;
        }
      }
      console.log("[FamilyScore]", c.name, family,
        "ability:", (fw.ability * abilityForFormula).toFixed(1),
        "motiv:", (fw.motiv * wScore).toFixed(1),
        "final:", careerScore.toFixed(1));

      if (!careersByTrack[trackKey]) {
        careersByTrack[trackKey] = [];
        trackScores[trackKey] = 0;
      }
      trackScores[trackKey] = Math.max(trackScores[trackKey], careerScore);
      const scored = {
        ...c,
        family,
        track,
        trackKey,
        careerScore,
        baseScore,
        refineScore,
        debugT_match: T_match != null ? Math.round(T_match * 10) / 10 : null,
        debugWScore: Math.round(wScore * 10) / 10,
        matchScore: Math.round(clamp(careerScore, 0, 100)),
        scoreContributions: {
          ability: Math.round(fw.ability * abilityForFormula),
          motiv: Math.round(fw.motiv * wScore),
          mind: Math.round(fw.mind * mScore),
          t: matchT,
          p: matchP,
          w: Math.round(fw.motiv * wScore),
          m: Math.round(fw.mind * mScore),
          a: matchA
        },
        matchScores: { t: matchT, p: matchP, w: matchW, m: matchM, a: matchA },
        scores: {
          t: Math.round(user100.T),
          p: Math.round(user100.P),
          w: Math.round(user100.W),
          m: Math.round(user100.M),
          a: Math.round(user100.A)
        }
      };
      careersByTrack[trackKey] = careersByTrack[trackKey] || [];
      careersByTrack[trackKey].push(scored);
      allScoredCareers.push(scored);
    });

    // 创业指数调试：确认创业者加分是否触发（W 为原始 0-10 尺度）
    const entrepreneurCareer = allScoredCareers.find((c) => c.name === "创业者");
    const idxRaw = 0.4 * (userW.W5 || 0) + 0.3 * (userW.W4 || 0) + 0.3 * (userW.W7 || 0);
    console.log("W5:", userW.W5, "W4:", userW.W4, "W7:", userW.W7);
    console.log("创业指数(原始W):", idxRaw);
    console.log("M-STR:", userM["M-STR"]);
    console.log("创业者 careerScore:", entrepreneurCareer?.careerScore);
    console.log("entrepreneurIndex(归一化0-100):", entrepreneurIndex);
    const tid = entrepreneurCareer ? (entrepreneurCareer.career_track_id || entrepreneurCareer.track_id) : "";
    console.log("创业者 track_id:", tid || undefined);
    console.log("canonical:", tid ? (TRACK_ID_TO_CANONICAL[tid] || tid) : undefined);

    const topTracks = Object.entries(trackScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    // Step: 候选池先保证每个 Creator 子赛道至少 2–3 个，再按 baseScore 填满至 CAND_LIMIT
    const CAND_LIMIT = 40;
    const CREATOR_SUBTRACKS = [
      "digital_content_creation",
      "visual_design_branding",
      "digital_art_entertainment",
      "game_content_design",
      "educational_content_design"
    ];
    const MIN_PER_TRACK = 3;
    const guaranteedIds = new Set();
    const guaranteed = [];
    CREATOR_SUBTRACKS.forEach((trackId) => {
      const inTrack = allScoredCareers.filter(
        (c) => (c.career_track_id || c.track_id) === trackId
      );
      const top = [...inTrack]
        .sort((a, b) => (b.baseScore || 0) - (a.baseScore || 0))
        .slice(0, MIN_PER_TRACK);
      top.forEach((c) => {
        const id = c.career_id || c.id;
        if (!guaranteedIds.has(id)) {
          guaranteedIds.add(id);
          guaranteed.push(c);
        }
      });
    });
    // 创业指数高时保证创业赛道进入候选池，以便 careerScore 加成后能进 Top3
    if (entrepreneurIndex >= 85) {
      const inTrack = allScoredCareers.filter(
        (c) => (c.career_track_id || c.track_id) === "entrepreneurship_leadership"
      );
      const top = [...inTrack]
        .sort((a, b) => (b.careerScore || 0) - (a.careerScore || 0))
        .slice(0, MIN_PER_TRACK);
      top.forEach((c) => {
        const id = c.career_id || c.id;
        if (!guaranteedIds.has(id)) {
          guaranteedIds.add(id);
          guaranteed.push(c);
        }
      });
    }
    const rest = allScoredCareers
      .filter((c) => !guaranteedIds.has(c.career_id || c.id))
      .sort((a, b) => (b.baseScore || 0) - (a.baseScore || 0));
    let allScored = [...guaranteed, ...rest.slice(0, Math.max(0, CAND_LIMIT - guaranteed.length))];

    if (userPreferences && userPreferences.length > 0) {
      const PREF_KEYWORDS = {
        Technology: ["technology", "技术", "ai", "software", "engineering", "工程", "研发", "算法", "ai engineering", "data science", "cyber security"],
        Business: ["business", "商业", "产品", "product", "运营", "管理", "marketing", "营销"],
        Education: ["education", "教育", "学习", "learning", "培训", "课程", "ai education"],
        Entrepreneurship: ["entrepreneurship", "创业", "founder", "startup", "创始人"],
        Creative: ["creative", "创意", "创作", "content", "design", "设计", "视觉", "brand", "品牌"],
        Research: ["research", "研究", "科研", "研究员", "technology research"],
        "Stable Profession": ["stable", "稳定", "compliance", "合规", "审计", "安全", "governance", "risk"]
      };
      const prefBoost = 1.18;
      const keywords = userPreferences.flatMap((p) => PREF_KEYWORDS[p] || [p.toLowerCase()]);
      allScored.forEach((c) => {
        const name = (c.name || "").toLowerCase();
        const track = (c.track || "").toLowerCase();
        const desc = (c.description || "").toLowerCase();
        const match = keywords.some((kw) => name.includes(kw) || track.includes(kw) || desc.includes(kw));
        if (match) c.careerScore *= prefBoost;
      });
    }

    const TRACK_BOOST = 5;
    allScored.forEach((c) => {
      if (topTracks.includes(c.trackKey)) {
        c.careerScore = clamp(c.careerScore + TRACK_BOOST, 0, 100);
      }
    });

    // 排序：优先 careerScore（FAMILY_WEIGHTS 已体现 ability/motiv/mind），再按 refineScore 打破平局
    allScored.sort((a, b) => {
      const cs = (b.careerScore || 0) - (a.careerScore || 0);
      if (cs !== 0) return cs;
      return (b.refineScore || 0) - (a.refineScore || 0);
    });

    const TOP3_MIN = 65;
    const highMatch = allScored.filter((x) => x.careerScore >= TOP3_MIN);
    let topCareers = (highMatch.length >= 3 ? highMatch.slice(0, 3) : allScored.slice(0, 3)).map((x) => ({
      ...x,
      matchScore: Math.round(clamp(x.careerScore, 0, 100))
    }));

    // 保证：在创业指数极高时，Top3 至少包含一个创业赛道职业
    if (entrepreneurIndex >= 90) {
      const hasEntrepreneurshipInTop3 = topCareers.some((c) => {
        const trackId = c.career_track_id || c.track_id;
        const canonical = (trackId && TRACK_ID_TO_CANONICAL[trackId]) || trackId;
        return canonical === "entrepreneurship";
      });

      if (!hasEntrepreneurshipInTop3) {
        const bestEntre = allScored
          .filter((c) => {
            const trackId = c.career_track_id || c.track_id;
            const canonical = (trackId && TRACK_ID_TO_CANONICAL[trackId]) || trackId;
            return canonical === "entrepreneurship";
          })
          .sort((a, b) => (b.careerScore || 0) - (a.careerScore || 0))[0];

        if (bestEntre) {
          const replaced = [...topCareers];
          // 用创业职业替换第三名（分数最低的那一个）
          replaced[replaced.length - 1] = {
            ...bestEntre,
            matchScore: Math.round(clamp(bestEntre.careerScore, 0, 100))
          };
          topCareers = replaced;
        }
      }
    }

    // 扩展职业池：只显示与 Top3 同 Family；不足 9 个时才用第一生态、再不足用第二生态补充
    // 必须从全部已打分职业 allScoredCareers 里筛，否则 40 人池里同 family 除 Top3 外可能为 0（全被 Helper 补满）
    const ecosystemByCareerScore = {};
    allScored.forEach((c) => {
      const fam = c.family;
      if (!ecosystemByCareerScore[fam]) ecosystemByCareerScore[fam] = 0;
      ecosystemByCareerScore[fam] = Math.max(ecosystemByCareerScore[fam], c.careerScore);
    });
    const ecosystemScoresForPool = Object.entries(ecosystemByCareerScore)
      .map(([family, score]) => ({ family, score: Math.round(clamp(score, 0, 100)) }))
      .filter((e) => e.score >= 55)
      .sort((a, b) => b.score - a.score);
    const top3Families = new Set(topCareers.map((t) => t.family));
    const firstEcoFamily = ecosystemScoresForPool[0]?.family;
    const secondEcoFamily = ecosystemScoresForPool[1]?.family;
    const top3Ids = new Set(topCareers.map((t) => t.career_id || t.id));
    const notInTop3 = (x) => !top3Ids.has(x.career_id || x.id);
    const sourceForExtended = allScoredCareers;
    let extendedCandidates = sourceForExtended.filter((x) => notInTop3(x) && top3Families.has(x.family));
    extendedCandidates.sort((a, b) => (b.careerScore || 0) - (a.careerScore || 0));
    const EXTENDED_TARGET = 9;
    if (extendedCandidates.length < EXTENDED_TARGET && firstEcoFamily) {
      const supplement = sourceForExtended.filter(
        (x) => notInTop3(x) && x.family === firstEcoFamily && !extendedCandidates.some((e) => (e.career_id || e.id) === (x.career_id || x.id))
      );
      supplement.sort((a, b) => (b.careerScore || 0) - (a.careerScore || 0));
      extendedCandidates = [...extendedCandidates, ...supplement].sort((a, b) => (b.careerScore || 0) - (a.careerScore || 0));
    }
    if (extendedCandidates.length < EXTENDED_TARGET && secondEcoFamily) {
      const supplement = sourceForExtended.filter(
        (x) => notInTop3(x) && x.family === secondEcoFamily && !extendedCandidates.some((e) => (e.career_id || e.id) === (x.career_id || x.id))
      );
      supplement.sort((a, b) => (b.careerScore || 0) - (a.careerScore || 0));
      extendedCandidates = [...extendedCandidates, ...supplement].sort((a, b) => (b.careerScore || 0) - (a.careerScore || 0));
    }
    const extendedPool = extendedCandidates.slice(0, 10).map((x) => ({
      ...x,
      matchScore: Math.round(clamp(x.careerScore, 0, 100))
    }));

    const careerResults = [...topCareers, ...extendedPool].map((x) => ({
      ...x,
      family: x.family.toLowerCase().replace(/builder/i, "guardian")
    }));

    const directionScores = {};
    allScored.forEach((c) => {
      const trackId = c.career_track_id || (c.trackKey && c.trackKey.split("::")[1] ? c.trackKey.split("::")[1].toLowerCase().replace(/\s+/g, "_") : "");
      const dirId = TRACK_TO_DIRECTION[trackId] || "operations";
      if (!directionScores[dirId]) directionScores[dirId] = 0;
      directionScores[dirId] = Math.max(directionScores[dirId], c.careerScore);
    });
    const ECO_MIN = 55;
    const DIR_MIN = 50;
    const directionRanked = Object.entries(directionScores)
      .map(([id, score]) => ({ directionId: id, directionName: DIRECTION_NAMES[id] || id, score: Math.round(clamp(score, 0, 100)) }))
      .filter((d) => d.score >= DIR_MIN)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const ecosystemScores = Object.entries(ecosystemByCareerScore)
      .map(([family, score]) => ({ family, ecosystemLabel: ECOSYSTEM_LABELS[family] || family, score: Math.round(clamp(score, 0, 100)) }))
      .filter((e) => e.score >= ECO_MIN)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const debugPayload = {
      userScores: {
        T: Math.round(user100.T),
        P: Math.round(user100.P),
        W: Math.round(user100.W),
        M: Math.round(user100.M),
        A: Math.round(user100.A)
      },
      careerFamilyScores: familyRanked,
      careerTrackScores: Object.entries(trackScores)
        .sort((a, b) => b[1] - a[1])
        .map(([k, score]) => ({ track: k, score: Math.round(score) })),
      topCareersDetail: topCareers.map((c) => ({
        name: c.name,
        careerScore: Math.round(c.careerScore),
        matchScore: c.matchScore,
        T_contrib: c.scoreContributions?.t,
        P_contrib: c.scoreContributions?.p,
        W_contrib: c.scoreContributions?.w,
        M_contrib: c.scoreContributions?.m,
        A_contrib: c.scoreContributions?.a
      }))
    };

    if (typeof console !== "undefined" && console.group) {
      console.group("[TalentAI] 职业匹配调试");
      console.log("User Scores (0-100)", debugPayload.userScores);
      console.log("Career Family Scores", debugPayload.careerFamilyScores);
      console.log("Career Track Scores", debugPayload.careerTrackScores);
      console.log("Career Score for each recommended career", debugPayload.topCareersDetail);
      console.log("Formula: Career Score = FAMILY_WEIGHTS[family].ability*abilityScore + .motiv*wScore + .mind*mScore; sorted by careerScore then refineScore.");
      console.log("推荐职业 Top3:", topCareers.map(c => c.name));
      topCareers.forEach((c, i) => {
        console.log(`[Top3-${i + 1}]`, {
          name: c.name,
          family: c.family,
          track_id: c.career_track_id || c.track_id,
          T_match: c.debugT_match,
          AbilityScore: c.baseScore != null ? Math.round(c.baseScore * 10) / 10 : null,
          wScore: c.debugWScore
        });
      });
      console.groupEnd();
    }

    return {
      careerResults,
      topCareers,
      topFamilies,
      topTracks: topTracks.map((k) => k.split("::")[1] || k),
      extendedPool,
      highMatchCount: highMatch.length,
      ecosystemScores,
      topDirections: directionRanked.slice(0, 3),
      directionScores: directionRanked,
      debug: debugPayload
    };
  }

  global.TalentAI = global.TalentAI || {};
  global.TalentAI.CareerMatching = {
    CAREER_FAMILIES,
    ECOSYSTEM_LABELS,
    DIRECTION_NAMES,
    TRACK_TO_DIRECTION,
    calculateCareerFamilyScore,
    matchCareersThreeLevel,
    getCareerFamily,
    getCareerTrack,
    computeUserLayerScores100
  };

  // 暴露调试用向量匹配工具
  global.TalentAI.Debug = global.TalentAI.Debug || {};
  Object.assign(global.TalentAI.Debug, {
    loadTracksDB,
    normalizeUserT,
    computeT_VectorMatch,
    computeP_VectorMatch,
    computeThresholdFactor
  });
})(typeof window !== "undefined" ? window : globalThis);
