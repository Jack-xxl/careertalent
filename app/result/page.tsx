'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BarChart from '../components/BarChart';
import RadarChart from '../components/RadarChart';
import islandsZh from '@/data/islands.zh.json';
import islandsEn from '@/data/islands.en.json';

/* ✅ 题库：用于把本地答案聚合成分数 */
import miQuestions from '@/data/questions.json';
import riaQuestions from '@/data/interests.json';

type Lang = 'zh' | 'en';
type MIMap = Record<string, number>;
type RMap = { R: number; I: number; A: number; S: number; E: number; C: number };

/* 升级说明条：放在页面最底部 */
function UpgradeStrip({ lang }: { lang: Lang }) {
  return (
    <section
      style={{
        marginTop: 28,
        padding: '16px 18px',
        background: '#fff5f5',
        border: '1px solid #fecaca',
        borderRadius: 12,
        color: '#b91c1c',
        lineHeight: 1.7,
      }}
    >
      <h3 style={{ margin: '0 0 8px', color: '#b91c1c' }}>
        {lang === 'zh' ? '升级提示（为什么要用收费版？）' : 'Why Upgrade to Pro'}
      </h3>
      {lang === 'zh' ? (
        <ul style={{ marginTop: 6 }}>
          <li>
            解锁 <b>6 大元智能</b> 与 <b>8 大新兴趣岛</b>，匹配 <b>新兴职业/创业方向</b>
            （紧贴 2025–2035 趋势）。
          </li>
          <li>
            融合 <b>大五 / MBTI / 九型</b> 的性格适配，得到更精准的人岗匹配。
          </li>
          <li>
            获得 <b>Top 职业路径 + 学习路线图 + 90 天行动建议</b>，即可执行。
          </li>
        </ul>
      ) : (
        <ul style={{ marginTop: 6 }}>
          <li>
            Unlock <b>6 Meta-Intelligences</b> and <b>8 New Islands</b> with
            <b> emerging careers/startup paths</b> (2025–2035).
          </li>
          <li>
            Include <b>Big Five / MBTI / Enneagram</b> personality fit for precision.
          </li>
          <li>
            Get <b>top career paths + learning roadmap + 90-day actions</b> for execution.
          </li>
        </ul>
      )}
      <div style={{ marginTop: 12 }}>
        <a
          href="#"
          style={{
            display: 'inline-block',
            padding: '10px 14px',
            borderRadius: 8,
            background: '#ef4444',
            color: '#fff',
            textDecoration: 'none',
            marginRight: 8,
          }}
        >
          {lang === 'zh' ? '扫码升级并解锁新兴职业 →' : 'Upgrade Now →'}
        </a>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.setItem('talentai_pro', '1');
              location.reload();
            }
          }}
          style={{
            display: 'inline-block',
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#fff',
            color: '#111',
            cursor: 'pointer',
          }}
        >
          {lang === 'zh' ? '我已完成支付（立即解锁）' : 'I have paid (Unlock now)'}
        </button>
      </div>
    </section>
  );
}

/* ✅ 把本地答案按题库聚合为 0–100 分
   关键修复：
   - 若题目带 answer（能力题）：必须答对才得分（uaBool === q.answer）
   - 否则（倾向题）：Yes 才得分（uaBool === true）
   - 未作答（undefined/null）不计入 total，避免误伤
*/
function aggregateMIFromAnswers(ans: number[]): MIMap {
  const hit: Record<string, number> = {};
  const total: Record<string, number> = {};

  (miQuestions as any[]).forEach((q, i) => {
    const raw = ans[i];

    // ✅ 未作答：不计入总题数（避免 “没答当No” 拉低分数）
    if (raw === undefined || raw === null) return;

    const uaBool = raw > 0; // 兼容 0/1 或 0~3：>0 即 Yes
    const dim = q.dimension as string;

    total[dim] = (total[dim] || 0) + 1;

    // ✅ 能力题：答对才得分（例如 answer:false 时选 No 也能得分）
    if (typeof q.answer === 'boolean') {
      const correct = uaBool === q.answer;
      hit[dim] = (hit[dim] || 0) + (correct ? 1 : 0);
      return;
    }

    // ✅ 倾向题：Yes 才得分（保持旧体系不变）
    hit[dim] = (hit[dim] || 0) + (uaBool ? 1 : 0);
  });

  const out: MIMap = {};
  Object.keys(total).forEach((k) => {
    out[k] = Math.round(((hit[k] || 0) / Math.max(1, total[k])) * 100);
  });
  return out;
}

function aggregateRIAFromAnswers(ans: number[]): RMap {
  const letters = ['R', 'I', 'A', 'S', 'E', 'C'] as const;
  const hit: Record<string, number> = {};
  const total: Record<string, number> = {};

  (riaQuestions as any[]).forEach((q, i) => {
    const raw = ans[i];
    if (raw === undefined || raw === null) return; // ✅ 未作答不计入
    const like = raw > 0 ? 1 : 0;
    hit[q.dimension] = (hit[q.dimension] || 0) + like;
    total[q.dimension] = (total[q.dimension] || 0) + 1;
  });

  const out = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 } as RMap;
  letters.forEach((d) => {
    out[d] = Math.round(((hit[d] || 0) / Math.max(1, total[d] || 0)) * 100);
  });
  return out;
}

function ResultContent() {
  const sp = useSearchParams();
  const lang: Lang = ((sp.get('lang') as Lang) || 'zh') as Lang;

  // 允许通过 URL 强制设置付费：/result?lang=zh&pro=1
  const [isPro, setIsPro] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlPro = sp.get('pro') === '1';
    const lsPro = localStorage.getItem('talentai_pro') === '1';
    setIsPro(urlPro || lsPro);
    setHydrated(true);
  }, [sp]);

  // —— 安全读取本地答案（免费版）
  const miAnswers = useMemo<number[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('talentai_ans') || '[]');
    } catch {
      return [];
    }
  }, []);

  const riaAnswers = useMemo<number[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('talentai_interest_ans') || '[]');
    } catch {
      return [];
    }
  }, []);

  // —— 题库/标签（仅用于维度顺序与名称）
  const miDimsOrder = ['语言', '人际', '逻辑', '空间', '肢体', '音乐', '自知', '自然'];

  const miLabels: Record<string, string> =
    lang === 'zh'
      ? miDimsOrder.reduce((acc, k) => {
          acc[k] = k;
          return acc;
        }, {} as Record<string, string>)
      : {
          语言: 'Language',
          人际: 'Interpersonal',
          逻辑: 'Logic',
          空间: 'Spatial',
          肢体: 'Bodily',
          音乐: 'Musical',
          自知: 'Intrapersonal',
          自然: 'Naturalistic',
        };

  const riaLabels =
    lang === 'zh'
      ? {
          R: 'R 实际型',
          I: 'I 研究型',
          A: 'A 艺术型',
          S: 'S 社会型',
          E: 'E 企业型',
          C: 'C 常规型',
        }
      : {
          R: 'R Realistic',
          I: 'I Investigative',
          A: 'A Artistic',
          S: 'S Social',
          E: 'E Enterprising',
          C: 'C Conventional',
        };

  // —— 用“本地答案 + 题库”计算分数（没有答案则全 0）
  const mi: MIMap = useMemo(() => {
    if (miAnswers.length === 0) {
      const zero: MIMap = {};
      miDimsOrder.forEach((k) => (zero[k] = 0));
      return zero;
    }
    return aggregateMIFromAnswers(miAnswers);
  }, [miAnswers]);

  const ria: RMap = useMemo(() => {
    if (riaAnswers.length === 0) {
      return { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    }
    return aggregateRIAFromAnswers(riaAnswers);
  }, [riaAnswers]);

  // —— 兴趣岛卡片（免费版仅展示传统职业）
  const islands = (lang === 'zh' ? islandsZh : islandsEn) as Record<string, any>;

  const topIslandCodes = useMemo(() => {
    return (Object.entries(ria) as [keyof RMap, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k as string);
  }, [ria]);

  if (!hydrated) return null;

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 20 }}>
      <h2>{lang === 'zh' ? '你的测试结果（免费版）' : 'Your Test Result (Free)'}</h2>

      {/* 多元智能 */}
      <section>
        <h3>{lang === 'zh' ? '你的智能概览（分值）' : 'Your MI Scores'}</h3>
        <BarChart data={mi} labels={miLabels} max={100} />
        <h3 style={{ marginTop: 24 }}>{lang === 'zh' ? '你的智能雷达图' : 'MI Radar'}</h3>
        <RadarChart data={mi} />
      </section>

      {/* RIASEC */}
      <section style={{ marginTop: 28 }}>
        <h3>{lang === 'zh' ? '你的兴趣概览（分值）' : 'Your Interests (RIASEC)'}</h3>
        <BarChart data={ria as any} labels={riaLabels as any} max={100} />
        <h3 style={{ marginTop: 24 }}>{lang === 'zh' ? '你的兴趣雷达' : 'Interests Radar'}</h3>
        <RadarChart data={ria as any} />
      </section>

      {/* 兴趣岛卡片（免费显示传统职业；Pro 才显示新兴职业） */}
      <section style={{ marginTop: 28 }}>
        <h3>
          {lang === 'zh'
            ? '与你匹配的兴趣岛（免费显示传统职业）'
            : 'Matched Islands (Free = traditional roles)'}
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
            alignItems: 'start',
          }}
        >
          {topIslandCodes.map((code) => {
            const d = islands[code];
            if (!d) return null;
            const freeList: string[] = d.traditionalCareers || [];
            const proList: string[] = d.modernCareers || [];
            return (
              <div
                key={code}
                style={{ border: '1px solid #eee', borderRadius: 10, padding: 16 }}
              >
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{d.name}</div>
                <div style={{ opacity: 0.8, marginBottom: 10 }}>{d.summary}</div>

                <div style={{ fontWeight: 600, marginBottom: 4 }}>
                  {lang === 'zh' ? '传统职业（免费）' : 'Traditional (Free)'}
                </div>
                <ul style={{ marginTop: 4 }}>
                  {freeList.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>

                {isPro ? (
                  <>
                    <div style={{ fontWeight: 600, margin: '10px 0 4px' }}>
                      {lang === 'zh' ? '新兴职业（付费）' : 'Emerging (Pro)'}
                    </div>
                    <ul style={{ marginTop: 4 }}>
                      {proList.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <div style={{ marginTop: 10, fontSize: 13, color: '#b91c1c' }}>
                    {lang === 'zh'
                      ? '升级可解锁「新兴职业」列表（更贴近当下就业趋势）'
                      : 'Upgrade to unlock modern roles tailored to current trends.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 升级入口（固定在最下端） */}
      <UpgradeStrip lang={lang} />
    </div>
  );
}

export default function Result() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultContent />
    </Suspense>
  );
}
