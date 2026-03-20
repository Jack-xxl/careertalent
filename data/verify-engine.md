# 引擎系统性检查（5 项）

## 1. M 层是否用向量匹配
- 已在 `career-matching-engine.js` 中接入：有 `career.m_weights` 时用 `computeM_VectorMatch(userM, career.m_weights)`，否则用 `User_M * fit_M`。
- 控制台会打印：`[M_Match] 职业名 vector|legacy 分数`
- 当前职业库暂无 `m_weights`，因此会显示 `legacy`；后续给职业加上 `m_weights` 后会显示 `vector`。

## 2. userP 是否从 localStorage 正确读取
- 控制台会打印：`[userP] 引擎拿到的P层数据` + 对象。
- 页面传入的为 `pScores`（O, C, E, A, N），引擎内已做映射为 `openness/conscientiousness/extraversion/agreeableness/neuroticism` 供 Tracks 的 `required_P` 使用。

## 3. 所有职业是否都有 track_id
在 **结果页** 打开控制台，运行（注意：接口返回的是对象，需先取 `careers` 再 `Object.values`）：

```js
(async () => {
  const res = await fetch('data/careers-database.json');
  const db = await res.json();
  const list = db.careers ? Object.values(db.careers) : [];
  const noTrack = list.filter(c => !(c.track_id || c.career_track_id));
  console.log('没有 track_id 的职业数量:', noTrack.length);
  if (noTrack.length > 0) console.log('职业名称:', noTrack.map(c => c.name));
})();
```

## 4. result.html（T 层免费页）是否正常
- `result.html` 引用的是 `js/engine.js`、`result-generator.js`、`result.js`，**未引用** `career-matching-engine.js`。
- 刷新 `result.html` 不应受 WMA 引擎重构影响；若有报错，多为 T 层数据或 Chart 加载问题。

## 5. 能力门槛 thresholdFactor 是否在工作
- 当用户某维度低于 track 的 `ability_gates` 时，会打印：`[thresholdFactor] { career, track_id, threshold }`（threshold < 1）。
- 当前 `tracks-database.json` 中 ai_engineering 的 `ability_gates` 为 `{ T2: 65, T3: 55 }`（0–100 尺度下 T2≥65）。
- 验证方式：用 T2=3（即 0–10 尺度）的用户跑一次，看 AI 工程类职业是否明显靠后，且控制台出现 `[thresholdFactor]`。
