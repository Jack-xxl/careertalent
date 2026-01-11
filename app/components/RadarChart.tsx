'use client';

type RadarChartProps = {
  /** 维度分数，如 { CQ: 72, AQ: 65, ... } */
  data: Record<string, number>;
  /** 维度标签映射，如 { CQ: 'CQ 创新智能', AQ: 'AQ 意识/觉察智能', ... } */
  labels?: Record<string, string>;
  /** 画布尺寸（正方形） */
  size?: number;
  /** 分数最大值（默认自动取 data 与 100 的较大者） */
  max?: number;
  /** 同心圆数量 */
  rings?: number;
  /** 标签字号 */
  labelFontSize?: number;
  /** 标签向外偏移（相对半径的比例，正数更靠外） */
  labelOffset?: number;
};

export default function RadarChart({
  data,
  labels,
  size = 260,
  max,
  rings = 4,
  labelFontSize = 12,
  labelOffset = 0.05,
}: RadarChartProps) {
  const keys = Object.keys(data || {});
  const values = keys.map((k) => Number.isFinite(data[k]) ? Number(data[k]) : 0);

  // 自动确定最大值：保证至少 100，且不小于数据中的最大值
  const maxValue = Math.max(100, ...(max ? [max] : []), ...values, 1);

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  const toPoint = (i: number, v: number) => {
    const angle = -Math.PI / 2 + (i / Math.max(keys.length, 1)) * 2 * Math.PI;
    const rr = r * (v / maxValue);
    return [cx + rr * Math.cos(angle), cy + rr * Math.sin(angle)] as const;
  };

  const polyPoints = values.map((v, i) => toPoint(i, v).join(',')).join(' ');

  return (
    <svg width={size} height={size} aria-label="radar-chart">
      {/* 同心圆 */}
      {Array.from({ length: rings }, (_, i) => {
        const k = 1 - i / rings; // 1, 0.75, 0.5...（按 rings 等分）
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r * k}
            fill="none"
            stroke="#e5e7eb"
          />
        );
      })}

      {/* 轴标签（支持自定义 labels；否则用 key） */}
      {keys.map((k, i) => {
        const [x, y] = toPoint(i, maxValue * (1 + labelOffset));
        const text = labels?.[k] ?? k;
        return (
          <text
            key={k}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize={labelFontSize}
            fill="#374151"
            alignmentBaseline="middle"
          >
            {text}
          </text>
        );
      })}

      {/* 数据多边形 */}
      <polygon
        points={polyPoints}
        fill="rgba(59,130,246,0.25)"
        stroke="#2563eb"
        strokeWidth={1.5}
      />
    </svg>
  );
}