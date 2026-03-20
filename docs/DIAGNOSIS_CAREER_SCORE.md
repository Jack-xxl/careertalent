# 职业匹配度偏低诊断说明

## 控制台诊断代码（在结果页打开控制台运行）

```js
(async () => {
  const wma = JSON.parse(
    localStorage.getItem('talentai_wma_answers') || '{}');
  const W = wma.W || {};
  const M = wma.M || {};
  
  console.log('W5原始值:', W.W5, '类型:', typeof W.W5);
  console.log('M-STR原始值:', M['M-STR'], '类型:', typeof M['M-STR']);
  
  const db = await (await fetch('data/careers-database.json')).json();
  const list = db.careers ? Object.values(db.careers) : db;
  const ai = list.find(x => x.name === 'AI工程师');
  console.log('AI工程师完整数据:', JSON.stringify(ai, null, 2));
})();
```

引擎里「User Scores」和「AbilityScore」等会在 `[WMA AbilityScore]`、`[FamilyScore]`、`[W_Match]` 等 console 输出里看到。

---

## career-matching-engine.js 检查结果

### 1. finalScore 计算完后有没有再除以某个数？
- **没有**。`careerScore` 算完后只做了创业指数 1.08 倍加成（条件满足时），以及后面的 `clamp(careerScore, 0, 100)`，没有再做除法。

### 2. 有没有 Math.min(score, 某个上限)？
- 有：`matchScore: Math.round(clamp(careerScore, 0, 100))`，上限是 100，这是合理的。
- 另外在 `computeThresholdFactor`、`calcTScore` 等内部有 `Math.min`，仅用于单维或阈值，不会把总分压到 71%。

### 3. FAMILY_WEIGHTS 三项加总
- Solver: 0.75 + 0.15 + 0.07 = **0.97**
- Creator: 0.60 + 0.30 + 0.07 = **0.97**
- Organizer / Influencer / Explorer / Builder / Helper / Operator: 0.50 + 0.25 + 0.15 = **0.90**

因此即使用户 T/W/M 都是满分，Career Score 理论最大也只有 **90～97**，不会到 100；且若 W/M 尺度不对，还会再被压低。

---

## 根本原因与已做修复

### 原因 1：W 层分数尺度 0–10 未转为 0–100
- 测评里 W 层归一化后存的是 **0–10**（见 wma-assessment.js 的 `(raw / d.max_score) * 10`）。
- 引擎里 `normalizeUserW` 在已有 `W1..W7` 时**直接返回原对象**，没有把 0–10 转成 0–100。
- `computeW_Match` 的 `wScore` 因此落在 **0–10**，而 `abilityForFormula` 是 **0–100**，导致 `fw.motiv * wScore` 只有 1～3 分，总分被压到 70 左右。

**已修复**：在 `normalizeUserW` 中，当存在 `W1..W7` 时，对每个维度做尺度统一：若数值 ≤10 则视为 0–10 并乘 10 得到 0–100，否则视为已是 0–100 并 clamp 到 0–100。

### 原因 2：FAMILY_WEIGHTS 加总 < 1，理论满分 < 100
- 三项加总为 0.90 或 0.97，所以即使三项都按 0–100 算，Career Score 最大也只有 90–97。

**已修复**：在计算 `careerScore` 时，先用 `weightSum = fw.ability + fw.motiv + fw.mind`，再令  
`careerScore = (加权和 / weightSum) * 100`，  
这样在 ability / wScore / mScore 都是 0–100 时，Career Score 可以到 100。

---

## 你本地可验证的预期

1. **W5 / M-STR 原始值**：若来自当前 WMA 测评，应为 0–10 的小数或整数。
2. **引擎里的 User Scores**：在控制台看 `[FamilyScore]` 等日志，确认 `motiv` 和 `mind` 是否已到 10–30 量级（修复前多为 1–3）。
3. **匹配度**：修复后，在用户数据较强的情况下，最高匹配度应能到 85–98 左右，而不再卡在 71% 附近。

运行上述诊断代码后，把控制台里 **W5/M-STR 原始值** 以及 **一条 `[FamilyScore]` 的 ability / motiv / final** 贴出来，可以再帮你对一下是否与预期一致。
