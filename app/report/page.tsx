'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import BarChart from '../components/BarChart';
import RadarChart from '../components/RadarChart';

type Payload = {
  lang: 'zh' | 'en';
  mi: Record<string, number>;
  ria: { R: number; I: number; A: number; S: number; E: number; C: number };
  ts?: number;
};

// 安全解码 base64（兼容中文）
function b64decodeUnicode(s: string) {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(s), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return '';
  }
}

function ReportPageContent() {
  const sp = useSearchParams();
  const payload = useMemo<Payload | null>(() => {
    const s = sp.get('s');
    if (!s) return null;
    try {
      const json = b64decodeUnicode(s);
      const obj = JSON.parse(json);
      // 基础容错
      if (!obj || !obj.mi || !obj.ria) return null;
      return obj as Payload;
    } catch {
      return null;
    }
  }, [sp]);

  // 没参数或解析失败：给出提示与返回入口
  if (!payload) {
    return (
      <div style={{ maxWidth: 920, margin: '24px auto', padding: '0 16px' }}>
        <h2>报告无法打开</h2>
        <p>请从结果页点击“生成报告 / 打印 PDF”重新进入。</p>
        <a href="/result?lang=zh" style={{ color: '#2563eb' }}>返回结果页</a>

        {/* 简单的打印样式，隐藏按钮等 */}
        <style>{`@media print {.noprint{display:none !important;}}`}</style>
      </div>
    );
  }

  const { lang, mi, ria, ts } = payload;
  const miLabels = useMemo(() => {
    return Object.keys(mi).reduce((acc: Record<string, string>, k) => {
      acc[k] = k;
      return acc;
    }, {});
  }, [mi]);

  const riaLabels =
    lang === 'zh'
      ? { R: 'R 实际型', I: 'I 研究型', A: 'A 艺术型', S: 'S 社会型', E: 'E 企业型', C: 'C 常规型' }
      : { R: 'R Realistic', I: 'I Investigative', A: 'A Artistic', S: 'S Social', E: 'E Enterprising', C: 'C Conventional' };

  const timeStr =
    ts ? new Date(ts).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US') : '';

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 20 }}>
      <h1 style={{ marginTop: 0 }}>
        {lang === 'zh' ? 'TalentAI 测试报告' : 'TalentAI Report'}
      </h1>
      {timeStr && (
        <p style={{ opacity: 0.7, marginTop: -8 }}>
          {lang === 'zh' ? '生成时间：' : 'Generated at: '}
          {timeStr}
        </p>
      )}

      {/* 多元智能 */}
      <section style={{ marginTop: 16 }}>
        <h2>{lang === 'zh' ? '多元智能（分值）' : 'Multiple Intelligences'}</h2>
        <BarChart data={mi} labels={miLabels} max={100} />
        <div style={{ marginTop: 16 }}>
          <RadarChart data={mi} />
        </div>
      </section>

      {/* RIASEC */}
      <section style={{ marginTop: 24 }}>
        <h2>{lang === 'zh' ? 'RIASEC 兴趣（分值）' : 'RIASEC Interests'}</h2>
        <BarChart data={ria as any} labels={riaLabels as any} max={100} />
        <div style={{ marginTop: 16 }}>
          <RadarChart data={ria as any} />
        </div>
      </section>

      {/* 操作按钮（打印/返回） */}
      <div className="noprint" style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={() => window.print()}
          style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f8fafc' }}
        >
          {lang === 'zh' ? '打印/保存为 PDF' : 'Print / Save as PDF'}
        </button>
        <a
          href={`/result?lang=${lang}`}
          style={{
            padding: '10px 14px',
            borderRadius: 10,
            border: '1px solid #e5e7eb',
            background: '#eef2ff',
            textDecoration: 'none'
          }}
        >
          {lang === 'zh' ? '返回结果页' : 'Back to Result'}
        </a>
      </div>

      {/* 打印时隐藏按钮 */}
      <style>{`@media print {.noprint{display:none !important;}}`}</style>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReportPageContent />
    </Suspense>
  );
}
