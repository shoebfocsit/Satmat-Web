import React from 'react';

export interface LineChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  series: { name: string; color: string; points: LineChartPoint[] }[];
  height?: number;
}

/**
 * Lightweight dependency-free SVG line chart used by the Charts screen.
 * Renders one polyline per series with minimal x/y labels.
 */
export const LineChart: React.FC<LineChartProps> = ({
  series,
  height = 220,
}) => {
  const width = 640;
  const padX = 34;
  const padY = 18;

  if (series.length === 0 || series.every((s) => s.points.length < 2)) {
    return (
      <div
        className="flex items-center justify-center text-xs text-gray-400 font-medium"
        style={{ height }}
      >
        Not enough data points to draw a chart.
      </div>
    );
  }

  const all = series.flatMap((s) => s.points.map((p) => p.value));
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = Math.max(max - min, 1);
  const n = Math.max(...series.map((s) => s.points.length));

  const x = (i: number) => padX + (i * (width - padX * 2)) / Math.max(n - 1, 1);
  const y = (v: number) =>
    padY + ((max - v) / span) * (height - padY * 2);

  const xTicks = 6;
  const yTicks = 4;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* grid + y labels */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = max - (span * i) / yTicks;
        const gy = y(v);
        return (
          <g key={`y${i}`}>
            <line x1={padX} x2={width - padX} y1={gy} y2={gy} stroke="#E5E7EB" strokeWidth="1" />
            <text x={padX - 6} y={gy + 3} textAnchor="end" fontSize="9" fill="#9CA3AF">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      {/* x labels */}
      {Array.from({ length: xTicks + 1 }, (_, i) => {
        const idx = Math.min(
          Math.round((i * (n - 1)) / xTicks),
          n - 1,
        );
        const label = series[0].points[idx]?.label ?? '';
        return (
          <text
            key={`x${i}`}
            x={x(idx)}
            y={height - 4}
            textAnchor="middle"
            fontSize="9"
            fill="#9CA3AF"
          >
            {label}
          </text>
        );
      })}
      {/* series */}
      {series.map((s) => (
        <polyline
          key={s.name}
          fill="none"
          stroke={s.color}
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={s.points
            .map((p, i) => `${x(i)},${y(p.value)}`)
            .join(' ')}
        />
      ))}
      {/* legend */}
      {series.length > 1 && (
        <g transform={`translate(${padX}, 6)`}>
          {series.map((s, i) => (
            <g key={s.name} transform={`translate(${i * 90}, 0)`}>
              <circle cx={4} cy={4} r={4} fill={s.color} />
              <text x={12} y={7} fontSize="9" fontWeight="700" fill="#6B7280">
                {s.name}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
};