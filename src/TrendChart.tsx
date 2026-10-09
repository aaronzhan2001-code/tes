import type { Branch, Metric } from './engine';

export default function TrendChart({
  branches,
  metric,
  compact = false,
}: {
  branches: Branch[];
  metric: Metric;
  compact?: boolean;
}) {
  const width = 600,
    height = compact ? 170 : 250;
  const left = 45,
    right = 15,
    top = 18,
    bottom = 30;
  const lastYear = Math.max(2045, ...branches.map((b) => b.history.at(-1)!.year));
  const values = branches.flatMap((b) => b.history.map((s) => s[metric]));
  const step = metric === 'population' ? 10000 : 10;
  const padding = Math.max(
    Math.abs(Math.min(...values)) * 0.1,
    Math.abs(Math.max(...values)) * 0.1,
    step,
  );
  const min =
    metric === 'happiness' || metric === 'environment'
      ? 0
      : Math.floor((Math.min(...values) - padding) / step) * step;
  const max =
    metric === 'happiness' || metric === 'environment'
      ? 100
      : Math.ceil((Math.max(...values) + padding) / step) * step;
  const x = (year: number) => left + ((year - 2040) / (lastYear - 2040)) * (width - left - right);
  const y = (value: number) => top + ((max - value) / (max - min)) * (height - top - bottom);
  const label = (n: number) =>
    metric === 'population' ? `${(n / 10000).toFixed(0)}万` : `${Math.round(n)}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="trend-chart"
      role="img"
      aria-label="各世界线的指标随年份变化趋势"
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const value = min + ((max - min) * i) / 4;
        return (
          <g key={i}>
            <line
              x1={left}
              y1={y(value)}
              x2={width - right}
              y2={y(value)}
              stroke="#e8ebe4"
              strokeDasharray="3 4"
            />
            <text x={left - 9} y={y(value) + 4} textAnchor="end" className="chart-label">
              {label(value)}
            </text>
          </g>
        );
      })}
      {Array.from({ length: 6 }, (_, i) => Math.round(2040 + ((lastYear - 2040) * i) / 5))
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((year) => (
          <text key={year} x={x(year)} y={height - 8} textAnchor="middle" className="chart-label">
            {year}
          </text>
        ))}
      {branches.map((b) => (
        <g key={b.id}>
          <polyline
            points={b.history.map((s) => `${x(s.year)},${y(s[metric])}`).join(' ')}
            fill="none"
            stroke={b.color}
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {b.history.map((s) => (
            <circle key={s.year} cx={x(s.year)} cy={y(s[metric])} r={3} fill={b.color}>
              <title>{`${b.name} · ${s.year} 年：${label(s[metric])}`}</title>
            </circle>
          ))}
        </g>
      ))}
    </svg>
  );
}
