'use client';

type Props = {
  data: Record<string, number>;
  labels?: Record<string, string>;
  max?: number;
};

export default function BarChart({ data, labels, max = 100 }: Props) {
  // 兜底：labels 为空时，用 data 的 key 自举出标签
  const safeLabels: Record<string, string> =
    labels ??
    Object.fromEntries(Object.keys(data || {}).map((k) => [k, k]));

  const keys = Object.keys(safeLabels);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {keys.map((k) => {
        const label = safeLabels[k];
        const v = Math.round(((data?.[k] ?? 0) + Number.EPSILON) * 10) / 10;
        const w = Math.max(2, Math.min(100, (v / max) * 100)); // 最少 2% 可见
        return (
          <div key={k}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 14,
                marginBottom: 4,
              }}
            >
              <span>{label}</span>
              <span>{v}</span>
            </div>
            <div style={{ background: '#eee', height: 10, borderRadius: 6 }}>
              <div
                style={{
                  width: `${w}%`,
                  height: '100%',
                  borderRadius: 6,
                  background:
                    'linear-gradient(90deg, rgba(99,102,241,1) 0%, rgba(56,189,248,1) 100%)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
