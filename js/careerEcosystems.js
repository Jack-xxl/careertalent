// TalentAI V2 - 职业生态定义（平行试运行版）
// 仅供 calcCareerMatchV2 使用，不改动现有 career-matching-engine 逻辑

const ecosystems = {
  creation: {
    id: "creation",
    name: "创造生态",
    description: "自己构建产品、系统或内容",
    W_triggers: {
      自主驱动: 7.5,
      创造倾向: 7.5,
    },
    archetypes: ["A", "E"],
  },
  influence: {
    id: "influence",
    name: "影响赋能生态",
    description: "通过影响他人创造价值",
    W_triggers: {
      影响力驱动: 7.5,
      成长导向: 7.0,
    },
    archetypes: ["B", "D"],
  },
  service: {
    id: "service",
    name: "服务生态",
    description: "解决他人问题、支持与执行",
    W_triggers: {
      稳定安全: 7.0,
      服务倾向: 7.0,
    },
    archetypes: ["F", "G"],
  },
};

// 根据 W 层 0-10 分数选出激活生态（最多 2 个）
function pickActiveEcosystems(wScores = {}) {
  const entries = Object.values(ecosystems).map((eco) => {
    let triggeredDims = [];
    let hitCount = 0;
    Object.entries(eco.W_triggers).forEach(([dim, threshold]) => {
      const v = Number(wScores[dim] ?? 0);
      if (v >= threshold) {
        hitCount += 1;
        triggeredDims.push({ dim, score: v, threshold });
      }
    });
    return {
      id: eco.id,
      name: eco.name,
      description: eco.description,
      hitCount,
      triggeredDims,
    };
  });

  const active = entries
    .filter((e) => e.hitCount > 0)
    .sort((a, b) => b.hitCount - a.hitCount)
    .slice(0, 2);

  return active;
}

// 浏览器调试暴露
if (typeof window !== "undefined") {
  window.TalentAI = window.TalentAI || {};
  window.TalentAI.V2 = window.TalentAI.V2 || {};
  window.TalentAI.V2.ecosystems = ecosystems;
  window.TalentAI.V2.pickActiveEcosystems = pickActiveEcosystems;
}

