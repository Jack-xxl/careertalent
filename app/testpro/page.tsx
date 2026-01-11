'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import qpro from '@/data/questions_pro.json';

type Lang = 'zh' | 'en';
type AnswerIdx = 0 | 1 | 2 | 3; // likert4 的四个选项下标

type QItem = {
  id: string;
  zh: string;
  en: string;
};

const KEY = 'talentai_pro_answers';

function flattenAll(): QItem[] {
  const items: QItem[] = [];
  qpro.modules.metaIntelligence.items.forEach((it: any) => items.push({ id: it.id, zh: it.zh, en: it.en }));
  qpro.modules.interests8.items.forEach((it: any) => items.push({ id: it.id, zh: it.zh, en: it.en }));
  qpro.modules.personality.big5.items.forEach((it: any) => items.push({ id: it.id, zh: it.zh, en: it.en }));
  qpro.modules.personality.enneagram.items.forEach((it: any) => items.push({ id: it.id, zh: it.zh, en: it.en }));
  qpro.modules.personality.mbti.items.forEach((it: any) => items.push({ id: it.id, zh: it.zh, en: it.en }));
  qpro.modules.personality.composite.items.forEach((it: any) => items.push({ id: it.id, zh: it.zh, en: it.en }));
  return items;
}

function TestProContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const lang: Lang = ((sp.get('lang') as Lang) || 'zh') as Lang;

  const items = useMemo(() => flattenAll(), []);
  const labels = (qpro.scale.labels as any)[lang] as string[];
  const total = items.length;

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 载入本地记录
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      setAnswers(Array.isArray(saved) ? saved : []);
    } catch {
      setAnswers([]);
    }
    setHydrated(true);
  }, []);

  // 保存本地
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(answers));
  }, [answers, hydrated]);

  if (!hydrated) return null;

  // 选择答案
  function choose(v: AnswerIdx) {
    setAnswers(prev => {
      const next = prev.slice();
      next[idx] = v;
      return next;
    });
  }

  // 导航
  function goNext() {
    if (idx + 1 < total) {
      setIdx(i => i + 1);
    } else {
      // 全部完成 -> 跳到收费版结果页
      router.push(`/resultpro?lang=${lang}&pro=1`);
    }
  }
  function goPrev() {
    setIdx(i => Math.max(0, i - 1));
  }

  const pct = Math.round(((Math.min(idx, total - 1) + 1) / total) * 100);
  const selected = answers[idx];

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: 20 }}>
      <h2>{lang === 'zh' ? 'TalentAI 收费版测评' : 'TalentAI Pro Assessment'}</h2>
      <div style={{ opacity: 0.7, marginBottom: 8 }}>
        {lang === 'zh'
          ? `共 ${total} 题，4 级量表；可随时中断后续测。`
          : `Total ${total} items, 4-point scale; you can pause and continue later.`}
      </div>

      {/* 进度条 */}
      <div style={{ height: 8, background: '#eee', borderRadius: 6, overflow: 'hidden', margin: '12px 0 16px' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: '#3b82f6' }} />
      </div>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 10 }}>
        {lang === 'zh' ? '进度：' : 'Progress: '} {idx + 1} / {total} ({pct}%)
      </div>

      {/* 题干 */}
      <div style={{ fontWeight: 600, marginBottom: 14 }}>{lang === 'zh' ? items[idx].zh : items[idx].en}</div>

      {/* 选项 */}
      <div style={{ display: 'grid', gap: 10 }}>
        {[0, 1, 2, 3].map(v => (
          <button
            key={v}
            onClick={() => choose(v as AnswerIdx)}
            style={{
              textAlign: 'left',
              padding: '12px 14px',
              borderRadius: 10,
              border: selected === v ? '2px solid #3b82f6' : '1px solid #ddd',
              background: selected === v ? '#eff6ff' : '#fff',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {labels?.[v] || String(v)}
          </button>
        ))}
      </div>

      {/* 导航按钮 */}
      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
        <button onClick={goPrev} disabled={idx === 0} style={{ padding: '8px 12px', borderRadius: 8 }}>
          {lang === 'zh' ? '上一题' : 'Prev'}
        </button>
        <button onClick={goNext} style={{ padding: '8px 12px', borderRadius: 8 }}>
          {idx + 1 < total ? (lang === 'zh' ? '下一题' : 'Next') : (lang === 'zh' ? '完成并查看结果' : 'Finish & View')}
        </button>
      </div>
    </div>
  );
}

export default function TestPro() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TestProContent />
    </Suspense>
  );
}
