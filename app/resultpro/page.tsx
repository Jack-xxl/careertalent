'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import BarChart from '../components/BarChart';
import RadarChart from '../components/RadarChart';

import qpro from '@/data/questions_pro.json';
import careersData from '@/data/careers_pro.json';

/* ========== 类型定义 ========== */

type Lang = 'zh' | 'en';
type ScoreMap = Record<string, number>;

type Rec = {
  type: 'job' | 'startup';
  title: { zh: string; en: string };
  category?: { zh: string; en: string };
  trendScore?: number;
  aiTrend?: { zh: string; en: string };
  skills?: { zh: string[]; en: string[] };
};

type CareersDict = Record<string, Rec[]>;

/* ========== 常量 & 原始数据 ========== */

const KEY_ANS = 'talentai_pro_answers'; // 72 题作答数组（收费版）

// 收费版题库模块
const META: any = (qpro as any).modules?.metaIntelligence;
const INT8: any = (qpro as any).modules?.interests8;
const PERS: any = (qpro as any).modules?.personality;
const SCALE: number[] = (qpro as any).scale?.scores ?? [3, 2, 1, 0];

// 职业/创业方向
const careers = careersData as CareersDict;

/** 八大新兴趣岛代码 */
const NEW_ISLAND_CODES = ['CC', 'EL', 'TP', 'HL', 'SU', 'FF', 'FE', 'PG'];

/** 新兴趣岛 → 传统霍兰德 RIASEC 映射（用于传统权重里的兴趣部分） */
const ISLAND_TO_RIA: Record<string, string[]> = {
  CC: ['A', 'I'], // 创意文化：艺术 + 研究
  EL: ['E', 'S'], // 创业领导：企业 + 社会
  TP: ['I', 'A'], // 思想哲学：研究 + 艺术
  HL: ['S', 'A'], // 健康生命：社会 + 情感/艺术
  SU: ['R', 'I', 'C'], // 可持续：实际 + 研究 + 传统
  FF: ['I', 'E', 'C'], // 金融未来：研究 + 企业 + 传统
  FE: ['A', 'I'], // 未来探索：前沿创意/研究，与 CC 连成一条路径
  PG: ['S', 'E', 'C'], // 公共治理：社会 + 企业 + 传统
};

/** 新兴趣岛 → 元智能映射（用于未来权重） */
const ISLAND_TO_META: Record<string, string[]> = {
  CC: ['CQ', 'XQ', 'DQ'],
  EL: ['CQ', 'FQ', 'DQ'],
  TP: ['AQ', 'SEQ', 'XQ'],
  HL: ['AQ', 'SEQ', 'DQ'],
  SU: ['SEQ', 'DQ', 'FQ'],
  FF: ['FQ', 'DQ', 'SEQ'],
  FE: ['CQ', 'DQ', 'XQ', 'AQ'],
  PG: ['SEQ', 'DQ', 'CQ', 'AQ'],
};

/* ========== 工具函数 ========== */

function aggregateByDim(items: { dim: string }[], answers: number[]): ScoreMap {
  const sum: Record<string, number> = {};
  const cnt: Record<string, number> = {};

  items.forEach((it, idx) => {
    const a = answers[idx];
    const w = typeof a === 'number' && SCALE[a] != null ? SCALE[a] : 0;
    sum[it.dim] = (sum[it.dim] || 0) + w;
    cnt[it.dim] = (cnt[it.dim] || 0) + 1;
  });

  const out: ScoreMap = {};
  const maxPerQ = Math.max(...SCALE);

  Object.keys(sum).forEach((dim) => {
    const max = (cnt[dim] || 1) * maxPerQ;
    out[dim] = Math.round(((sum[dim] || 0) / Math.max(1, max)) * 100);
  });
  return out;
}

function clamp100(x: number) {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 100) return 100;
  return Math.round(x);
}

function topKeys(map: ScoreMap, n = 3) {
  return Object.entries(map || {})
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, n)
    .map(([k]) => k);
}

/* ========== 页面组件 ========== */

function ResultProPageContent() {
  const sp = useSearchParams();

  const [hydrated, setHydrated] = useState(false);
  const [lang, setLang] = useState<Lang>('zh');
  const [answers, setAnswers] = useState<number[]>([]);
  const [freeMI, setFreeMI] = useState<ScoreMap>({});
  const [freeRIA, setFreeRIA] = useState<ScoreMap>({});

  // ——仅在浏览器里读取本地数据（免费版结果 + 收费版作答）——
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const langFromUrl = (sp.get('lang') as Lang) || null;
    const langFromLs = (localStorage.getItem('talentai_lang') as Lang) || null;
    setLang(langFromUrl || langFromLs || 'zh');

    // 收费版答案
    try {
      const ans = JSON.parse(localStorage.getItem(KEY_ANS) || '[]');
      setAnswers(Array.isArray(ans) ? ans : []);
    } catch {
      setAnswers([]);
    }

    // 免费版多元智能：兼容多种 key
    try {
      const miStr =
        localStorage.getItem('talentai_mi_json') ||
        localStorage.getItem('talentai_mi') ||
        localStorage.getItem('talentai_mi_scores') ||
        '{}';
      const miJson = JSON.parse(miStr);
      setFreeMI(miJson || {});
    } catch {
      setFreeMI({});
    }

    // 免费版霍兰德：兼容多种 key
    try {
      const riaStr =
        localStorage.getItem('talentai_ria_json') ||
        localStorage.getItem('talentai_ria') ||
        localStorage.getItem('talentai_ria_scores') ||
        '{}';
      const riaJson = JSON.parse(riaStr);
      setFreeRIA(riaJson || {});
    } catch {
      setFreeRIA({});
    }

    setHydrated(true);
  }, [sp]);

  const hasAnswers = answers && answers.length > 0;

  /* ===== 从题库结构推导各模块题目数，并切分答案数组 ===== */
  const metaItems: { dim: string }[] = META?.items || [];
  const int8Items: { dim: string }[] = INT8?.items || [];

  const big5Items: { dim: string }[] = PERS?.big5?.items || [];
  const enneagramItems: { dim: string }[] = (PERS?.enneagram?.items || []).map(
    (it: any) => ({ dim: `E${it.type}` }),
  );
  const mbtiItems: { dim: string }[] = (PERS?.mbti?.items || []).map(
    (it: any) => ({ dim: `${it.dim}-${it.pole}` }),
  );
  const compositeItems: { dim: string }[] = (PERS?.composite?.items || []).map(
    (it: any) => ({ dim: it.id }),
  );

  const metaLen = metaItems.length;
  const int8Len = int8Items.length;
  const big5Len = big5Items.length;
  const enneLen = enneagramItems.length;
  const mbtiLen = mbtiItems.length;
  const compLen = compositeItems.length;

  const metaAnswers = answers.slice(0, metaLen);
  const int8Answers = answers.slice(metaLen, metaLen + int8Len);
  const big5Answers = answers.slice(metaLen + int8Len, metaLen + int8Len + big5Len);
  const enneAnswers = answers.slice(
    metaLen + int8Len + big5Len,
    metaLen + int8Len + big5Len + enneLen,
  );
  const mbtiAnswers = answers.slice(
    metaLen + int8Len + big5Len + enneLen,
    metaLen + int8Len + big5Len + enneLen + mbtiLen,
  );
  const compAnswers = answers.slice(
    metaLen + int8Len + big5Len + enneLen + mbtiLen,
    metaLen + int8Len + big5Len + enneLen + mbtiLen + compLen,
  );

  /* ===== 用 useMemo 计算各层得分（Hook 数量固定） ===== */

  const metaScores: ScoreMap = useMemo(
    () => (hasAnswers ? aggregateByDim(metaItems, metaAnswers) : {}),
    [hasAnswers, metaItems, metaAnswers],
  );

  const newIslandScoresRaw: ScoreMap = useMemo(
    () => (hasAnswers ? aggregateByDim(int8Items, int8Answers) : {}),
    [hasAnswers, int8Items, int8Answers],
  );

  const big5Scores: ScoreMap = useMemo(
    () => (hasAnswers ? aggregateByDim(big5Items, big5Answers) : {}),
    [hasAnswers, big5Items, big5Answers],
  );

  const enneagramScores: ScoreMap = useMemo(
    () => (hasAnswers ? aggregateByDim(enneagramItems, enneAnswers) : {}),
    [hasAnswers, enneagramItems, enneAnswers],
  );

  const mbtiScores: ScoreMap = useMemo(
    () => (hasAnswers ? aggregateByDim(mbtiItems, mbtiAnswers) : {}),
    [hasAnswers, mbtiItems, mbtiAnswers],
  );

  const compositeScores: ScoreMap = useMemo(
    () => (hasAnswers ? aggregateByDim(compositeItems, compAnswers) : {}),
    [hasAnswers, compositeItems, compAnswers],
  );

  /* ===== 传统基础 + 未来潜力 融合成八大新兴趣岛得分 ===== */

  const fusedIslandScores: ScoreMap = useMemo(() => {
  const result: ScoreMap = {};

  // 免费版多元智能整体平均，作为“基础认知水平”
  const miKeys = Object.keys(freeMI || {});
  const miAvg =
    miKeys.length > 0
      ? miKeys.reduce((s, k) => s + (Number((freeMI as any)[k]) || 0), 0) /
        miKeys.length
      : 0;

  // 看看免费版是否真的有数据，如果没有，就自动退回只用收费版
  const hasTraditional =
    miKeys.some((k) => Number((freeMI as any)[k]) > 0) ||
    Object.keys(freeRIA || {}).some((k) => Number((freeRIA as any)[k]) > 0);

  NEW_ISLAND_CODES.forEach((code) => {
    const riaDims = ISLAND_TO_RIA[code] || [];
    const metaDims = ISLAND_TO_META[code] || [];

    // ——霍兰德传统兴趣（可能为 0）——
    const riaScore =
      riaDims.length > 0
        ? riaDims.reduce((sum, d) => sum + (Number((freeRIA as any)[d]) || 0), 0) /
          riaDims.length
        : 0;

    // 收费版新兴趣岛原始分
    const islandScore = Number(newIslandScoresRaw[code] || 0);

    // ========== 传统核心块 ==========
    let traditionalCore: number;
    if (hasTraditional) {
      // 有免费版数据：兴趣 60% + 多元智能 40%
      const baseInterest = riaScore > 0 ? riaScore : islandScore;
      traditionalCore = 0.6 * baseInterest + 0.4 * miAvg;
    } else {
      // 没有免费版数据：直接用收费版兴趣岛作为传统核心，避免全是 0
      traditionalCore = islandScore;
    }

    // ========== 未来核心块（新兴趣岛 + 元智能）==========
    const metaScore =
      metaDims.length > 0
        ? metaDims.reduce((sum, d) => sum + (Number(metaScores[d] || 0)), 0) /
          metaDims.length
        : 0;

    // 新兴趣岛 70%，元智能 30%
    const futureCore = 0.7 * islandScore + 0.3 * metaScore;

    // ========== 最终融合：传统 60% + 未来 40% ==========
    const fused = 0.6 * traditionalCore + 0.4 * futureCore;

    result[code] = clamp100(fused);
  });

  return result;
}, [freeMI, freeRIA, newIslandScoresRaw, metaScores]);  const topNewIslands = topKeys(fusedIslandScores, 3);

  /* ===== 职业/创业方向推荐 ===== */

  const recommended = useMemo(() => {
    const out: { code: string; score: number; rec: Rec }[] = [];

    topNewIslands.forEach((code) => {
      const arr = careers[code] || [];
      const base = fusedIslandScores[code] || 0;
      arr.forEach((rec) => {
        const trend = rec.trendScore ?? 75;
        const score = base * 0.7 + trend * 0.3; // 个人匹配 + 行业趋势
        out.push({ code, score, rec });
      });
    });

    return out.sort((a, b) => b.score - a.score).slice(0, 6);
  }, [topNewIslands, fusedIslandScores]);

  /* ===== 各种标签 ===== */

  const metaLabels: Record<string, string> =
    lang === 'zh'
      ? {
          CQ: 'CQ 创新智能',
          AQ: 'AQ 适应与韧性智能',
          XQ: 'XQ 跨界整合智能',
          FQ: 'FQ 财商智能',
          DQ: 'DQ 数字智能',
          SEQ: 'SEQ 系统经济智能',
        }
      : {
          CQ: 'CQ Creativity',
          AQ: 'AQ Adaptability & Resilience',
          XQ: 'XQ Cross-domain Integration',
          FQ: 'FQ Financial Intelligence',
          DQ: 'DQ Digital Intelligence',
          SEQ: 'SEQ Systems & Economy',
        };

  const newIslandLabels: Record<string, string> =
    lang === 'zh'
      ? {
          CC: 'CC 创意文化岛',
          EL: 'EL 创业领导岛',
          TP: 'TP 思想哲学岛',
          HL: 'HL 健康生命岛',
          SU: 'SU 可持续岛',
          FF: 'FF 金融未来岛',
          FE: 'FE 未来探索岛',
          PG: 'PG 公共治理岛',
        }
      : {
          CC: 'CC Creative Culture',
          EL: 'EL Entrepreneurial Leadership',
          TP: 'TP Thinking & Philosophy',
          HL: 'HL Health & Life',
          SU: 'SU Sustainability',
          FF: 'FF Finance Future',
          FE: 'FE Future Exploration',
          PG: 'PG Public Governance',
        };

  const freeMILabels: Record<string, string> =
    lang === 'zh'
      ? {
          语言: '语言智能',
          人际: '人际智能',
          逻辑: '逻辑数学智能',
          空间: '空间智能',
          肢体: '肢体运动智能',
          音乐: '音乐智能',
          自知: '自知/内省智能',
          自然: '自然观察智能',
        }
      : {
          语言: 'Linguistic',
          人际: 'Interpersonal',
          逻辑: 'Logical-Math',
          空间: 'Spatial',
          肢体: 'Bodily-Kinesthetic',
          音乐: 'Musical',
          自知: 'Intrapersonal',
          自然: 'Naturalistic',
        };

  const freeRIALabels: Record<string, string> =
    lang === 'zh'
      ? {
          R: 'R 实用型（Realistic）',
          I: 'I 研究型（Investigative）',
          A: 'A 艺术型（Artistic）',
          S: 'S 社会型（Social）',
          E: 'E 企业型（Enterprising）',
          C: 'C 常规型（Conventional）',
        }
      : {
          R: 'R Realistic',
          I: 'I Investigative',
          A: 'A Artistic',
          S: 'S Social',
          E: 'E Enterprising',
          C: 'C Conventional',
        };

  /* ===== 渲染 ===== */

  if (!hydrated) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  if (!hasAnswers) {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 20 }}>
        <h2>{lang === 'zh' ? '请先完成收费版 72 题测试' : 'Please finish the Pro 72-item test first'}</h2>
        <p style={{ marginTop: 12 }}>
          {lang === 'zh'
            ? '系统未检测到收费版作答记录，请先完成测评。'
            : 'No Pro answers detected. Please complete the assessment first.'}
        </p>
        <a
          href={`/testpro?lang=${lang}`}
          style={{
            display: 'inline-block',
            marginTop: 16,
            padding: '10px 16px',
            borderRadius: 8,
            background: '#2563eb',
            color: '#fff',
            textDecoration: 'none',
          }}
        >
          {lang === 'zh' ? '前往收费版测评 →' : 'Go to Pro Test →'}
        </a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
      <h2>{lang === 'zh' ? 'TalentAI 收费版综合报告' : 'TalentAI Pro Integrated Report'}</h2>

      {/* 一、基础天赋与兴趣方向（传统基础） */}
      <section style={{ marginTop: 16 }}>
        <h3>
          {lang === 'zh'
            ? '一、你的基础天赋与兴趣方向（传统部分）'
            : '1. Core Talents & Interests'}
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          {lang === 'zh'
            ? '这一部分主要基于加德纳八大智能 + 霍兰德六兴趣类型，是家长和孩子最熟悉、最容易理解的核心基础。'
            : 'This part is based on Multiple Intelligences and RIASEC interests. It is the most familiar, intuitive foundation for your profile.'}
        </p>

        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          <div>
            <h4>{lang === 'zh' ? '1）多元智能概览' : '1) Multiple Intelligences'}</h4>
            <BarChart data={freeMI} labels={freeMILabels} max={100} />
            <div style={{ marginTop: 8 }}>
              <RadarChart data={freeMI} />
            </div>
          </div>

          <div>
            <h4>{lang === 'zh' ? '2）霍兰德六兴趣类型（RIASEC）' : '2) RIASEC Interests'}</h4>
            <BarChart data={freeRIA as any} labels={freeRIALabels as any} max={100} />
            <div style={{ marginTop: 8 }}>
              <RadarChart data={freeRIA as any} />
            </div>
          </div>
        </div>
      </section>

      {/* 二、AI 时代元智能 & 八大新兴趣岛（未来潜力） */}
      <section style={{ marginTop: 28 }}>
        <h3>
          {lang === 'zh'
            ? '二、AI 时代元智能与八大新兴趣岛（未来潜力）'
            : '2. Meta-Intelligences & New Islands (Future Potential)'}
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          {lang === 'zh'
            ? '这里反映的是在 AI 时代的「升级潜力」：六大元智能 + 八大新兴趣岛，会在后台自动与传统结果融合，不需要你去记公式。AQ 被定义为「适应与韧性智能」，重点看压力下的恢复能力与变化环境中的调整速度。'
            : 'This part reflects your upgrade potential in the AI era: six meta-intelligences and eight new interest islands. They are fused with the traditional results in the background; you do not need to care about the exact formula. AQ is defined as Adaptability & Resilience.'}
        </p>

        <div
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          <div>
            <h4>{lang === 'zh' ? '1）六大元智能（含英文代号）' : '1) Six Meta-Intelligences'}</h4>
            <BarChart data={metaScores} labels={metaLabels} max={100} />
            <div style={{ marginTop: 8 }}>
              <RadarChart data={metaScores} />
            </div>
          </div>

          <div>
            <h4>
              {lang === 'zh'
                ? '2）八大新兴趣岛（已综合传统基础与未来潜力）'
                : '2) Eight New Interest Islands (Fused Scores)'}
            </h4>
            <BarChart data={fusedIslandScores} labels={newIslandLabels} max={100} />
            <div style={{ marginTop: 8 }}>
              <RadarChart data={fusedIslandScores} />
            </div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12, lineHeight: 1.6 }}>
          {lang === 'zh'
            ? '特别说明：如果「创意文化岛 CC」和「未来探索岛 FE」同时得分较高，我们会将其视为一条连续路径——先在文化与审美领域打好创意基础（CC），再向前沿科技、未来主题的探索（FE）推进。'
            : 'Note: When Creative Culture (CC) and Future Exploration (FE) are both high, we treat them as a continuous path: build creative foundations first (CC), then move towards future-oriented domains (FE).'}
        </p>
      </section>

      {/* 三、综合职业与创业方向推荐 */}
      <section style={{ marginTop: 28 }}>
        <h3>
          {lang === 'zh'
            ? '三、综合职业与创业方向推荐'
            : '3. Integrated Career & Startup Suggestions'}
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
          {lang === 'zh'
            ? '下面的方向综合考虑了：你的基础天赋与兴趣、新时代元智能和八大新兴趣岛，以及各行业在 AI 时代的发展趋势。'
            : 'The suggestions below integrate your core talents and interests, meta-intelligences, new interest islands, and the AI-era trends of each field.'}
        </p>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {recommended.map(({ code, score, rec }, idx) => (
            <div
              key={`${code}-${idx}-${rec.title.zh}`}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: 14,
                background: '#fff',
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                {lang === 'zh' ? '匹配兴趣岛：' : 'Island: '}{' '}
                {newIslandLabels[code] || code}
              </div>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                {lang === 'zh' ? rec.title.zh : rec.title.en}
              </div>
              {rec.category && (
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
                  {lang === 'zh' ? rec.category.zh : rec.category.en}
                </div>
              )}
              <div
                style={{
                  fontSize: 12,
                  marginBottom: 6,
                  color: '#4b5563',
                }}
              >
                {lang === 'zh'
                  ? `综合匹配度：${score.toFixed(1)} / 100`
                  : `Match score: ${score.toFixed(1)} / 100`}
              </div>
              {rec.aiTrend && (
                <div style={{ fontSize: 12, marginBottom: 6 }}>
                  <b>{lang === 'zh' ? 'AI 趋势：' : 'AI Trend: '}</b>
                  {lang === 'zh' ? rec.aiTrend.zh : rec.aiTrend.en}
                </div>
              )}
              {rec.skills && (
                <div style={{ fontSize: 12 }}>
                  <b>{lang === 'zh' ? '关键能力：' : 'Key Skills: '}</b>
                  {(lang === 'zh' ? rec.skills.zh : rec.skills.en).join(' / ')}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 四、社会导航与成长路径（文字版） */}
      <section style={{ marginTop: 28 }}>
        <h3>
          {lang === 'zh'
            ? '四、社会导航与成长路径（建议提纲）'
            : '4. Social Navigation & Growth Path'}
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
          {lang === 'zh'
            ? '可以把你的发展理解为一个公式：天赋（智能）+ 兴趣（传统 + 新岛）+ 区域 + 校内外组织 + 人脉资源 + 项目作品。'
            : 'You can think of your path as: Talents + Interests (traditional + new) + Region + Organizations + Network + Projects.'}
        </p>
        <ul style={{ fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
          <li>
            {lang === 'zh'
              ? '区域：优先选择与你 Top 兴趣岛和职业方向匹配度高、教育和数字经济活跃的城市/国家。'
              : 'Region: choose cities/regions where your top islands and industries are strongly represented.'}
          </li>
          <li>
            {lang === 'zh'
              ? '校内外组织：针对 Top 兴趣岛，列出 3–5 个可以加入的社团、实验室、工作坊、线上社群。'
              : 'On/off-campus orgs: for your top islands, list 3–5 clubs, labs, workshops or communities to join.'}
          </li>
          <li>
            {lang === 'zh'
              ? '人脉资源：刻意结识在目标方向已有 5–10 年经验的「过来人」（导师、学长学姐、创业者、技术负责人等）。'
              : 'Network: connect with people who have 5–10 years of experience in your target field.'}
          </li>
          <li>
            {lang === 'zh'
              ? '项目作品：每 6–12 个月完成一个可展示的作品集或 Demo，用真实场景不断验证你的选择。'
              : 'Projects: complete a visible project or demo every 6–12 months to validate your choices.'}
          </li>
        </ul>
      </section>

      {/* 五、AI + 专家深度解读服务（可选） */}
      <section
        style={{
          marginTop: 32,
          padding: 18,
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          background: '#f9fafb',
        }}
      >
        <h3>
          {lang === 'zh'
            ? '五、AI + 专家深度解读 / 成长规划（可选服务）'
            : '5. AI + Expert Deep-dive / Growth Planning (Optional)'}
        </h3>
        <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>
          {lang === 'zh'
            ? '如果希望把报告真正变成「可执行的成长路径」，可以考虑由具有国际视野的专家团队做进一步的一对一解读与追踪。'
            : 'If you want to turn this report into an executable growth roadmap, you can work with an expert team for 1:1 interpretation and follow-up.'}
        </p>

        <ol style={{ fontSize: 13, marginTop: 8, lineHeight: 1.7 }}>
          <li>
            <b>
              {lang === 'zh'
                ? 'AI+ 专家深度解读（高阶版）'
                : 'AI + Expert Deep Interpretation (Advanced)'}
            </b>
            <br />
            {lang === 'zh' ? (
              <>
                功能：完整 AI 自动报告 + 1 对 1 专家解读 3 次（每次约 60 分钟），联合制定
                <b>90 天行动计划 + 3 年成长路径</b>，支持家长/孩子提问。
                <br />
                定价：¥2999（早鸟 ¥1999，限 20 名） / 约 USD $499。
              </>
            ) : (
              <>
                Includes: full AI report + three 60-min 1:1 expert sessions with a 90-day action
                plan and 3-year roadmap. About USD $499.
              </>
            )}
          </li>

          <li>
            <b>
              {lang === 'zh' ? '家庭套餐（家长+孩子）' : 'Family Package (Parent + Child)'}
            </b>
            <br />
            {lang === 'zh' ? (
              <>
                功能：家长与孩子双份测评与联合解读，更系统地统一家庭教育与职业发展方向。
                <br />
                定价：¥4999（早鸟 ¥2999，限 20 名） / 约 USD $799。
              </>
            ) : (
              <>
                Includes: dual assessments and joint interpretation for parent and child, aligning
                family education with career planning. About USD $799.
              </>
            )}
          </li>

          <li>
            <b>
              {lang === 'zh'
                ? '年度成长陪伴计划（旗舰版）'
                : 'Annual Growth Companion Plan (Flagship)'}
            </b>
            <br />
            {lang === 'zh' ? (
              <>
                功能：包含高阶版全部服务 + 每季度复盘与职业趋势更新 + 专家每月一次跟进（视频/报告）+
                入门资源与社群陪伴。
                <br />
                定价：¥9999（早鸟 ¥4999，限 10 名） / 约 USD $1999。
              </>
            ) : (
              <>
                Includes everything in Advanced, plus quarterly reviews, monthly expert follow-up
                and community/resources. About USD $1999.
              </>
            )}
          </li>
        </ol>
      </section>
    </div>
  );
}

export default function ResultProPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultProPageContent />
    </Suspense>
  );
}
