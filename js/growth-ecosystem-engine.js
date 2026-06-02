/**
 * TalentAI 成长生态引擎（四层模型：T + P + W + M，不含 A）
 * 生态总分 = T核心天赋×55% + W驱动力×25% + P人格修正×10% + M成长潜力×10%
 */
(function (global) {
  "use strict";

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  const T_KEYS = {
    T1: "T1_language",
    T2: "T2_logic",
    T3: "T3_spatial",
    T4: "T4_music",
    T5: "T5_bodily",
    T6: "T6_interpersonal",
    T7: "T7_intrapersonal",
    T8: "T8_naturalist"
  };

  const GROWTH_ECOSYSTEM_DEFS = {
    Creator: {
      id: "Creator",
      nameZh: "创造生态",
      nameEn: "Creator",
      tagline: "用创意与表达，把内在想法变成可见作品。",
      representative: "Steve Jobs",
      careers: ["内容创作", "产品设计", "品牌表达"],
      T: { T1_language: 1, T3_spatial: 1, T7_intrapersonal: 1 },
      W: { W5: 0.5, W7: 0.5 },
      M: null,
      P: null
    },
    Explorer: {
      id: "Explorer",
      nameZh: "探索生态",
      nameEn: "Explorer",
      tagline: "在未知边界中持续提问、验证与进化。",
      representative: "Albert Einstein",
      careers: ["科学研究", "战略分析", "前沿探索"],
      T: { T2_logic: 1, T7_intrapersonal: 1, T8_naturalist: 1 },
      W: null,
      M: { ST: 1 },
      P: null
    },
    Solver: {
      id: "Solver",
      nameZh: "解决生态",
      nameEn: "Solver",
      tagline: "拆解复杂问题，构建清晰可行的解决路径。",
      representative: "Elon Musk",
      careers: ["系统架构", "工程方案", "技术攻坚"],
      T: { T2_logic: 1, T3_spatial: 1 },
      W: null,
      M: { CR: 1 },
      P: null
    },
    Influencer: {
      id: "Influencer",
      nameZh: "影响生态",
      nameEn: "Influencer",
      tagline: "通过表达与连接，影响他人并整合资源。",
      representative: "Barack Obama",
      careers: ["公众表达", "社群运营", "传播策略"],
      T: { T1_language: 1, T6_interpersonal: 1 },
      W: { W3: 0.5, W7: 0.5 },
      M: null,
      P: null
    },
    Organizer: {
      id: "Organizer",
      nameZh: "组织生态",
      nameEn: "Organizer",
      tagline: "搭建秩序与流程，推动团队稳定高效交付。",
      representative: "Tim Cook",
      careers: ["项目管理", "运营协调", "组织建设"],
      T: { T2_logic: 1, T6_interpersonal: 1 },
      W: { W4: 0.5, W1: 0.5 },
      M: null,
      P: null
    },
    Guardian: {
      id: "Guardian",
      nameZh: "守护生态",
      nameEn: "Guardian",
      tagline: "在规则、责任与稳定中守护长期价值。",
      representative: "Ruth Bader Ginsburg",
      careers: ["合规治理", "风险管理", "制度守护"],
      T: { T2_logic: 1, T6_interpersonal: 1 },
      W: { W2: 0.5, W6: 0.5 },
      M: null,
      P: null
    },
    Helper: {
      id: "Helper",
      nameZh: "助人生态",
      nameEn: "Helper",
      tagline: "在陪伴与支持中，为他人创造真实价值。",
      representative: "Mother Teresa",
      careers: ["教育辅导", "心理支持", "客户成功"],
      T: { T6_interpersonal: 1, T7_intrapersonal: 1 },
      W: { W6: 0.5, W3: 0.5 },
      M: null,
      P: { A: 1 }
    },
    Builder: {
      id: "Builder",
      nameZh: "实践生态",
      nameEn: "Builder",
      tagline: "用双手与工具，把构想落地成可见成果。",
      representative: "James Dyson",
      careers: ["制造工程", "现场实施", "产品落地"],
      T: { T5_bodily: 1, T3_spatial: 1, T8_naturalist: 1 },
      W: { W5: 1 },
      M: null,
      P: null
    }
  };

  const ECOSYSTEM_ORDER = [
    "Creator", "Explorer", "Solver", "Influencer",
    "Organizer", "Guardian", "Helper", "Builder"
  ];

  function safeGet(obj, path, fallback) {
    try {
      return path.split(".").reduce((o, k) => o?.[k], obj) ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  function normalizeW(w) {
    if (!w) return { W1: 50, W2: 50, W3: 50, W4: 50, W5: 50, W6: 50, W7: 50 };
    const to100 = (v) => {
      const n = Number(v);
      if (n > 10) return clamp(n, 0, 100);
      return Math.round((n || 5) * 10);
    };
    if (w.W1 !== undefined) {
      return {
        W1: to100(w.W1), W2: to100(w.W2), W3: to100(w.W3),
        W4: to100(w.W4), W5: to100(w.W5), W6: to100(w.W6), W7: to100(w.W7)
      };
    }
    return {
      W1: to100(w.RD), W2: to100(w.SD), W3: to100(w.TD),
      W4: to100(w.ED), W5: to100(w.CO), W6: to100(w.VD), W7: to100(w.TD)
    };
  }

  function extractVectors(userScores) {
    const tScores = userScores.tScores || {};
    const t = {};
    Object.entries(T_KEYS).forEach(([short, full]) => {
      t[full] = Number(safeGet(tScores, `${full}.displayScore`, 6)) || 6;
      t[short] = t[full];
    });

    const pRaw = userScores.pScores || {};
    const p = {
      O: Number(pRaw.O ?? pRaw.openness ?? 65),
      C: Number(pRaw.C ?? pRaw.conscientiousness ?? 65),
      E: Number(pRaw.E ?? pRaw.extraversion ?? 65),
      A: Number(pRaw.A ?? pRaw.agreeableness ?? 65),
      N: Number(pRaw.N ?? pRaw.neuroticism ?? 45)
    };

    const w = normalizeW(userScores.normalized?.W || userScores.W || {});
    const mRaw = userScores.normalized?.M || userScores.M || {};
    const m = {
      GM: Number(mRaw.GM ?? 5),
      CR: Number(mRaw.CR ?? 5),
      ST: Number(mRaw.ST ?? 5),
      VR: Number(mRaw.VR ?? 5),
      AC: Number(mRaw.AC ?? 5),
      EB: Number(mRaw.EB ?? 5)
    };

    return { t, p, w, m };
  }

  function avgT(t) {
    const vals = Object.values(T_KEYS).map((k) => t[k] || 6);
    return vals.reduce((a, b) => a + b, 0) / vals.length * 10;
  }

  function avgW(w) {
    const vals = Object.values(w);
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function avgP(p) {
    return (p.O + p.C + p.E + p.A + (100 - p.N)) / 5;
  }

  function avgM(m) {
    const vals = Object.values(m);
    return vals.reduce((a, b) => a + b, 0) / vals.length * 10;
  }

  function scoreWeighted(values, weights, scale10) {
    if (!weights || !Object.keys(weights).length) return null;
    let sum = 0;
    let tw = 0;
    Object.entries(weights).forEach(([k, w]) => {
      const raw = values[k];
      const v = scale10 ? (Number(raw) || 6) * 10 : (Number(raw) || 50);
      sum += v * w;
      tw += w;
    });
    return tw ? sum / tw : 70;
  }

  function scoreTForEco(t, weights) {
    const mapped = {};
    Object.entries(weights).forEach(([k, w]) => {
      mapped[k] = t[k] ?? t[T_KEYS[k]] ?? 6;
    });
    return scoreWeighted(mapped, weights, true);
  }

  function scoreMForEco(m, weights) {
    if (!weights) return avgM(m);
    return scoreWeighted(m, weights, true);
  }

  function scorePForEco(p, weights) {
    if (!weights) return avgP(p);
    if (weights.A) return clamp(p.A, 0, 100);
    return avgP(p);
  }

  function scoreWForEco(w, weights) {
    if (!weights) return avgW(w);
    return scoreWeighted(w, weights, false);
  }

  /**
   * 计算单个成长生态的四层匹配分与总分（不含 A）
   */
  function scoreGrowthEcosystem(def, vectors) {
    const tMatch = scoreTForEco(vectors.t, def.T);
    const wMatch = scoreWForEco(vectors.w, def.W);
    const pMatch = scorePForEco(vectors.p, def.P);
    const mMatch = scoreMForEco(vectors.m, def.M);
    const total = clamp(
      tMatch * 0.55 + wMatch * 0.25 + pMatch * 0.10 + mMatch * 0.10,
      0,
      100
    );
    return {
      tMatch: Math.round(tMatch),
      wMatch: Math.round(wMatch),
      pMatch: Math.round(pMatch),
      mMatch: Math.round(mMatch),
      score: Math.round(total)
    };
  }

  /**
   * 八大成长生态排序（主 / 副 / 第三生态）
   */
  function rankGrowthEcosystems(userScores) {
    const vectors = extractVectors(userScores);
    const ranked = ECOSYSTEM_ORDER.map((id) => {
      const def = GROWTH_ECOSYSTEM_DEFS[id];
      const parts = scoreGrowthEcosystem(def, vectors);
      return {
        family: id,
        ecosystemLabel: def.nameZh,
        nameZh: def.nameZh,
        nameEn: def.nameEn,
        tagline: def.tagline,
        representative: def.representative,
        careers: def.careers.slice(),
        ...parts
      };
    }).sort((a, b) => b.score - a.score);

    ranked.forEach((item, i) => {
      item.rank = i + 1;
    });
    return ranked;
  }

  /**
   * AI 成长加速指数（A 层独立输出，不参与生态排序）
   */
  function buildAIGrowthAccelerator(userScores) {
    const vectors = extractVectors(userScores);
    const m = vectors.m;
    const aiIndex = clamp(Number(userScores.aiIndex ?? 55), 0, 100);
    const leverage = Number(userScores.composite?.ai_leverage ?? 5);
    const aDims = userScores.normalized?.A || {};

    const aiAdaptIndex = aiIndex;
    const aiLearningPotential = Math.round(clamp(
      aiIndex * 0.35 + (m.GM || 5) * 10 * 0.35 + (m.AC || 5) * 10 * 0.30,
      0, 100
    ));
    const aiToolAbility = Math.round(clamp(
      aiIndex * 0.40 + (m.AC || 5) * 10 * 0.35 + leverage * 10 * 0.25,
      0, 100
    ));

    const advice = [];
    if (aiAdaptIndex < 55) {
      advice.push("优先建立每日 15 分钟的 AI 工具练习习惯，从写作、整理、检索三类高频场景切入。");
    } else if (aiAdaptIndex < 78) {
      advice.push("将 AI 嵌入 1～2 条真实学习或项目流程，形成可复用的工作流而非碎片化使用。");
    } else {
      advice.push("你已具备 AI 杠杆基础，建议挑战跨场景迁移：把成熟工作流复制到新领域。");
    }
    if ((m.GM || 0) < 6) {
      advice.push("配合成长思维训练：把 AI 反馈当作迭代素材，而非一次性标准答案。");
    }
    if ((m.AC || 0) >= 7) {
      advice.push("发挥 AI 协作优势，尝试「人定方向 + AI 加速执行」的分工模式。");
    }

    const paths = [];
    if (aiToolAbility >= 70) paths.push("AI 工作流设计师");
    if (aiLearningPotential >= 70) paths.push("AI 学习型成长者");
    if (aiAdaptIndex >= 65 && (m.VR || 0) >= 6) paths.push("AI 增强型创作者");
    if (!paths.length) paths.push("AI 基础能力补齐 → 场景化应用 → 跨领域迁移");

    return {
      title: "AI成长加速指数",
      aiAdaptIndex,
      aiLearningPotential,
      aiToolAbility,
      aiGrowthAdvice: advice,
      aiGrowthPaths: paths.slice(0, 3),
      acceleratorScore: Math.round((aiAdaptIndex + aiLearningPotential + aiToolAbility) / 3),
      riskLevel: aiAdaptIndex >= 78 ? "low" : aiAdaptIndex >= 55 ? "medium" : "high",
      aDimsSnapshot: {
        A1: Number(aDims.A1 ?? 0),
        A2: Number(aDims.A2 ?? 0),
        A3: Number(aDims.A3 ?? 0),
        A4: Number(aDims.A4 ?? 0),
        A5: Number(aDims.A5 ?? 0)
      }
    };
  }

  global.TalentAI = global.TalentAI || {};
  global.TalentAI.GrowthEcosystem = {
    GROWTH_ECOSYSTEM_DEFS,
    ECOSYSTEM_ORDER,
    rankGrowthEcosystems,
    scoreGrowthEcosystem,
    buildAIGrowthAccelerator,
    extractVectors
  };
})(typeof window !== "undefined" ? window : globalThis);
