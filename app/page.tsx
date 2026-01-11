'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Home() {
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  // 只在客户端读取/设置语言
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = (localStorage.getItem('talentai_lang') as 'zh' | 'en') || 'zh';
    setLang(saved);
  }, []);

  const t =
    lang === 'zh'
      ? {
          title: 'TalentAI 天赋测试（免费版 + 收费版）',
          startMi: '开始多元智能测试（免费）',
          startRia: '开始兴趣测试（免费·六岛）',
          startPro: '开始收费版测评（72题：元智能 / 八岛 / 人格）',
          view: '查看结果',
          reset: '清空本地记录并重来',
          hint: '注意：本地会保存你的作答进度和结果，仅存于浏览器本机。',
          lang: '语言',
          zh: '中文',
          en: 'English',
        }
      : {
          title: 'TalentAI Assessment (Free + Pro)',
          startMi: 'Start Multiple Intelligences (Free)',
          startRia: 'Start Interest Test (Free - 6 Islands)',
          startPro: 'Start Pro Test (72 items: Meta / 8 Islands / Personality)',
          view: 'View Result',
          reset: 'Clear local data & restart',
          hint: 'Note: your answers/results are stored locally in this browser.',
          lang: 'Language',
          zh: '中文',
          en: 'English',
        };

  function setLangAndSave(next: 'zh' | 'en') {
    setLang(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('talentai_lang', next);
    }
  }

  function clearAll() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('talentai_ans');
    localStorage.removeItem('talentai_interest_ans');
    localStorage.removeItem('talentai_lang');
    alert(lang === 'zh' ? '本地记录已清空' : 'Local data cleared');
  }

  const btn = {
    base:
      'display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid #ddd;background:#fff;cursor:pointer',
    primary:
      'display:inline-block;padding:10px 14px;border-radius:8px;border:1px solid #2563eb;background:#2563eb;color:#fff;cursor:pointer',
  };

  return (
    <div style={{ maxWidth: 720, margin: '32px auto', padding: '0 16px' }}>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>

      {/* 语言切换 */}
      <div style={{ margin: '12px 0 24px', opacity: 0.85, fontSize: 14 }}>
        {t.lang}：
        <button
          onClick={() => setLangAndSave('zh')}
          style={{
            marginRight: 8,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: lang === 'zh' ? '#eef2ff' : '#fff',
            cursor: 'pointer',
          }}
        >
          {t.zh}
        </button>
        <button
          onClick={() => setLangAndSave('en')}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: lang === 'en' ? '#eef2ff' : '#fff',
            cursor: 'pointer',
          }}
        >
          {t.en}
        </button>
      </div>

      {/* 按钮区 */}
      <div style={{ display: 'grid', gap: 12, alignItems: 'center' }}>
        {/* 免费多元智能 */}
        <Link className="btn primary" href={`/test?lang=${lang}`} style={{ textDecoration: 'none' }}>
          <span style={{ ...toStyle(btn.primary) }}>{t.startMi}</span>
        </Link>

        {/* 免费兴趣岛 */}
        <Link className="btn primary" href={`/interests?lang=${lang}`} style={{ textDecoration: 'none' }}>
          <span style={{ ...toStyle(btn.primary) }}>{t.startRia}</span>
        </Link>

       

        {/* 查看结果 */}
        <Link className="btn" href={`/result?lang=${lang}`} style={{ textDecoration: 'none' }}>
          <span style={{ ...toStyle(btn.base) }}>{t.view}</span>
        </Link>

        {/* 重置按钮 */}
        <button onClick={clearAll} style={{ ...toStyle(btn.base) }}>
          {t.reset}
        </button>
      </div>

      <p style={{ marginTop: 16, fontSize: 13, color: '#6b7280' }}>{t.hint}</p >
    </div>
  );
}

// 小工具：将字符串样式转为对象
function toStyle(s: string) {
  const style: any = {};
  s.split(';').forEach((pair) => {
    const [k, v] = pair.split(':').map((x) => x && x.trim());
    if (!k || !v) return;
    const jsKey = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    style[jsKey] = /^\d+$/.test(v) ? Number(v) : v;
  });
  return style;
}