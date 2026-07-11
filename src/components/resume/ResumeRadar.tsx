'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';

interface RadarItem {
  name: string;
  score: number;
}

interface ResumeRadarProps {
  data: RadarItem[];
  className?: string;
}

const RADAR_COLORS = {
  primary: '#165DFF',
  primaryLight: 'rgba(22, 93, 255, 0.1)',
  primaryBorder: '#165DFF',
  textGray: '#666',
  gridLine: '#e8e8e8',
  labelColor: '#666',
  darkBlue: 'rgba(22, 93, 255, 0.35)',
  mediumBlue: 'rgba(22, 93, 255, 0.15)',
  lightGray: 'rgba(180, 180, 200, 0.2)',
};

function getScoreFillColor(score: number): string {
  if (score >= 8) return RADAR_COLORS.darkBlue;
  if (score >= 6) return RADAR_COLORS.mediumBlue;
  return RADAR_COLORS.lightGray;
}

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180);
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function buildPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  count: number,
  values?: number[]
): string {
  const angleStep = 360 / count;
  return Array.from({ length: count }, (_, i) => {
    const r = values ? radius * (values[i] / 10) : radius;
    const pt = polarToCartesian(cx, cy, r, i * angleStep);
    return `${pt.x},${pt.y}`;
  }).join(' ');
}

function RadarGrid({ cx, cy, radius, count }: {
  cx: number; cy: number; radius: number; count: number;
}) {
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const angleStep = 360 / count;

  return (
    <g>
      {levels.map((level) => (
        <polygon
          key={`grid-${level}`}
          points={buildPolygonPoints(cx, cy, radius * level, count)}
          fill="none"
          stroke={RADAR_COLORS.gridLine}
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: count }, (_, i) => {
        const pt = polarToCartesian(cx, cy, radius, i * angleStep);
        return (
          <line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={pt.x}
            y2={pt.y}
            stroke={RADAR_COLORS.gridLine}
            strokeWidth={1}
          />
        );
      })}
    </g>
  );
}

function RadarLabels({ cx, cy, radius, count, labels }: {
  cx: number; cy: number; radius: number; count: number; labels: string[];
}) {
  const angleStep = 360 / count;
  const labelRadius = radius + 28;

  return (
    <g>
      {labels.map((label, i) => {
        const pt = polarToCartesian(cx, cy, labelRadius, i * angleStep);
        const angle = i * angleStep;
        let textAnchor: 'start' | 'middle' | 'end' = 'middle';
        let dx = 0;
        if (angle === 0 || angle >= 355) {
          textAnchor = 'middle';
        } else if (angle > 0 && angle < 180) {
          textAnchor = 'start';
          dx = 4;
        } else {
          textAnchor = 'end';
          dx = -4;
        }

        return (
          <text
            key={`label-${i}`}
            x={pt.x + dx}
            y={pt.y}
            textAnchor={textAnchor}
            dominantBaseline="middle"
            fill={RADAR_COLORS.labelColor}
            fontSize={12}
            fontWeight={500}
          >
            {label}
          </text>
        );
      })}
    </g>
  );
}

function RadarDataArea({ cx, cy, radius, count, values, scores }: {
  cx: number; cy: number; radius: number; count: number;
  values: number[]; scores: number[];
}) {
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  return (
    <g>
      <polygon
        points={buildPolygonPoints(cx, cy, radius, count, values)}
        fill={getScoreFillColor(avgScore)}
        stroke={RADAR_COLORS.primaryBorder}
        strokeWidth={2}
        strokeOpacity={0.8}
      />
      {Array.from({ length: count }, (_, i) => {
        const r = radius * (values[i] / 10);
        const pt = polarToCartesian(cx, cy, r, i * (360 / count));
        return (
          <circle
            key={`dot-${i}`}
            cx={pt.x}
            cy={pt.y}
            r={4}
            fill="#165DFF"
            stroke="#fff"
            strokeWidth={2}
          />
        );
      })}
    </g>
  );
}

function TooltipContent({ label, score, x, y, visible }: {
  label: string; score: number; x: number; y: number; visible: boolean;
}) {
  if (!visible) return null;
  return (
    <g>
      <rect
        x={x - 60}
        y={y - 40}
        width={120}
        height={36}
        rx={6}
        fill="#1f2937"
        opacity={0.9}
      />
      <text
        x={x}
        y={y - 18}
        textAnchor="middle"
        fill="#fff"
        fontSize={12}
        fontWeight={500}
      >
        {label}
      </text>
      <text
        x={x}
        y={y - 2}
        textAnchor="middle"
        fill="#93c5fd"
        fontSize={13}
        fontWeight={700}
      >
        {score.toFixed(1)} 分
      </text>
    </g>
  );
}

export function ResumeRadar({ data, className = '' }: ResumeRadarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width > 0) {
        setContainerWidth(Math.min(rect.width, 500));
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const isValid = data && data.length >= 3;

  const labels = useMemo(() => data.map((d) => d.name), [data]);
  const values = useMemo(() => data.map((d) => Math.min(d.score, 10)), [data]);
  const scores = useMemo(() => data.map((d) => d.score), [data]);
  const count = data.length;
  const size = containerWidth;
  const padding = { top: 40, bottom: 30, left: 60, right: 60 };
  const cx = size / 2;
  const cy = size / 2 + 5;
  const maxRadius = Math.min(
    size / 2 - Math.max(padding.left, padding.right),
    size / 2 - Math.max(padding.top, padding.bottom)
  );
  const radius = maxRadius - 10;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!isValid) return;
      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const angleStep = 360 / count;
      let minDist = Infinity;
      let nearest = -1;

      for (let i = 0; i < count; i++) {
        const r = radius * (values[i] / 10);
        const pt = polarToCartesian(cx, cy, r, i * angleStep);
        const dist = Math.sqrt((mx - pt.x) ** 2 + (my - pt.y) ** 2);
        if (dist < minDist && dist < 30) {
          minDist = dist;
          nearest = i;
        }
      }

      if (nearest >= 0) {
        setHoveredIndex(nearest);
        setTooltipPos({ x: mx, y: my });
      } else {
        setHoveredIndex(null);
      }
    },
    [count, values, cx, cy, radius, isValid]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  if (!isValid) {
    return (
      <div
        ref={containerRef}
        className="flex items-center justify-center text-gray-400 text-sm"
        style={{ width: '100%', height: 400 }}
      >
        数据不足，无法生成雷达图
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: '100%', height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'block' }}
      >
        <rect width={size} height={size} fill="transparent" />

        <RadarGrid cx={cx} cy={cy} radius={radius} count={count} />
        <RadarDataArea
          cx={cx}
          cy={cy}
          radius={radius}
          count={count}
          values={values}
          scores={scores}
        />
        <RadarLabels cx={cx} cy={cy} radius={radius} count={count} labels={labels} />

        {hoveredIndex !== null && (
          <TooltipContent
            label={data[hoveredIndex].name}
            score={data[hoveredIndex].score}
            x={tooltipPos.x}
            y={tooltipPos.y - 10}
            visible={true}
          />
        )}
      </svg>

      <div className="flex justify-center gap-4 mt-1 text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: RADAR_COLORS.darkBlue }} />
          <span>≥8分</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: RADAR_COLORS.mediumBlue }} />
          <span>6-8分</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: RADAR_COLORS.lightGray }} />
          <span>&lt;6分</span>
        </div>
      </div>
    </div>
  );
}
