'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CompanyCard, AnalysisLevel } from '@/lib/industry-map/types';

/**
 * 中国地图（本地 SVG 渲染）—— 零三方依赖、零模型成本。
 * 支持：缩放 / 拖拽 / 点选 / 热力气泡 / 省份高亮。
 * 数据：/data/china-provinces.json（下载自开放地理数据，34 省区）。
 */

interface GeoFeature {
  properties: {
    name: string;
    adcode: number;
    centroid?: number[] | null;
    center?: number[] | null;
  };
  geometry: { type: string; coordinates: unknown };
}

interface GeoData {
  features: GeoFeature[];
}

const W = 1000;
const H = 780;
const PAD = 24;
const MAINLAND_MIN_LAT = 15; // 南海诸岛下沉点纳入但不拉伸主图

interface Projected {
  feature: GeoFeature;
  pathD: string;
  centroid: [number, number] | null;
}

function featureToPath(feature: GeoFeature, toXY: (lon: number, lat: number) => [number, number]): string {
  const geom = feature.geometry;
  const rings: number[][][] = [];
  if (geom.type === 'Polygon') {
    rings.push(...(geom.coordinates as number[][][]));
  } else if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates as number[][][][]) {
      rings.push(...poly);
    }
  }
  const parts: string[] = [];
  for (const ring of rings) {
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const [lon, lat] = ring[i];
      const [x, y] = toXY(lon, lat);
      d += `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
    }
    d += 'Z';
    parts.push(d);
  }
  return parts.join(' ');
}

function heatColor(level: AnalysisLevel, count: number): string {
  // 深度分析/高价值公司 → 会员金 #FF7D00；其余按主蓝 #165DFF 热力渐变
  if (level >= 3) return '#FF7D00';
  return count >= 1 ? '#165DFF' : '#8AA9D8';
}

function bubbleRadius(count: number): number {
  return 8 + count * 5; // 点数级：样本为 1 场起
}

export default function ChinaMap({
  companies,
  onSelectCompany,
  selectedCompanyId,
}: {
  companies: CompanyCard[];
  onSelectCompany: (c: CompanyCard) => void;
  selectedCompanyId: string | null;
}) {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const drag = useRef<{ startX: number; startY: number; baseTx: number; baseTy: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    baseTx: 0,
    baseTy: 0,
    moved: false,
  });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const scaleRef = useRef(scale);
  const txRef = useRef(tx);
  const tyRef = useRef(ty);

  useEffect(() => {
    scaleRef.current = scale;
    txRef.current = tx;
    tyRef.current = ty;
  }, [scale, tx, ty]);

  useEffect(() => {
    fetch('/data/china-provinces.json')
      .then((r) => r.json())
      .then(setGeo)
      .catch(() => setGeo(null));
  }, []);

  const { projected, toXYFn } = useMemo(() => {
    if (!geo) return { projected: [] as Projected[], toXYFn: null as null };
    // 计算大陆 bounds（排除南海低纬海岛以避免拉伸）
    let minLon = 999;
    let maxLon = -999;
    let minLat = 999;
    let maxLat = -999;
    for (const f of geo.features) {
      const geom = f.geometry;
      const rings: number[][][] = [];
      if (geom.type === 'Polygon') rings.push(...(geom.coordinates as number[][][]));
      else if (geom.type === 'MultiPolygon')
        for (const poly of geom.coordinates as number[][][][]) rings.push(...poly);
      for (const ring of rings)
        for (const [lon, lat] of ring) {
          if (lat < MAINLAND_MIN_LAT) continue;
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
    }
    const lonRange = maxLon - minLon || 1;
    const latRange = maxLat - minLat || 1;
    const scale = Math.min((W - PAD * 2) / lonRange, (H - PAD * 2) / latRange);
    const offsetX = (W - lonRange * scale) / 2;
    const offsetY = (H - latRange * scale) / 2;
    const toXY = (lon: number, lat: number): [number, number] => [
      offsetX + (lon - minLon) * scale,
      offsetY + (maxLat - lat) * scale,
    ];
    const projected = geo.features
      .map((f) => ({
        feature: f,
        pathD: featureToPath(f, toXY),
        centroid: (f.properties.centroid || f.properties.center)
          ? toXY((f.properties.centroid || f.properties.center)![0], (f.properties.centroid || f.properties.center)![1])
          : null,
      }))
      .filter((p) => p.pathD);
    return { projected, toXYFn: toXY as ((lon: number, lat: number) => [number, number]) | null };
  }, [geo]);

  const companyMarkers = useMemo(() => {
    if (!toXYFn) return [];
    return companies.map((c) => ({
      ...c,
      px: toXYFn(c.coords[0], c.coords[1])[0],
      py: toXYFn(c.coords[0], c.coords[1])[1],
      r: bubbleRadius(c.interviewCount),
      fill: heatColor(c.analysisLevel, c.interviewCount),
    }));
  }, [companies, toXYFn]);

  const provinceCountMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of companies) m.set(c.province, (m.get(c.province) || 0) + 1);
    return m;
  }, [companies]);

  // 缩放：原生非 passive wheel 监听（React onWheel 为 passive，preventDefault 无效，会同时滚动页面）。
  // 以鼠标位置为缩放锚点：缩放前后鼠标下的地图内容点不动（zoom to cursor）。
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const prev = scaleRef.current;
      const next = Math.min(8, Math.max(0.6, prev * factor));
      if (next === prev) return;
      const ctm = el.getScreenCTM();
      if (!ctm) {
        setScale(next);
        return;
      }
      const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
      const k = next / prev;
      setScale(next);
      setTx(pt.x - (pt.x - txRef.current) * k);
      setTy(pt.y - (pt.y - tyRef.current) * k);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    drag.current = { startX: e.clientX, startY: e.clientY, baseTx: tx, baseTy: ty, moved: false };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (drag.current.startX === 0) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.current.moved = true;
    setTx(drag.current.baseTx + dx);
    setTy(drag.current.baseTy + dy);
  }

  function onPointerUp() {
    drag.current.startX = 0;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full select-none"
      role="img"
      aria-label="中国行业面试情报地图"
      ref={svgRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ touchAction: 'none', cursor: 'grab' }}
    >
      <defs>
        <radialGradient id="heat-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(22,93,255,0.55)" />
          <stop offset="100%" stopColor="rgba(22,93,255,0.05)" />
        </radialGradient>
        <radialGradient id="gold-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,125,0,0.8)" />
          <stop offset="100%" stopColor="rgba(255,125,0,0.12)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={W} height={H} fill="transparent" />
      <g transform={`translate(${tx},${ty}) scale(${scale})`}>
        {projected.map((p) => {
          const count = provinceCountMap.get(p.feature.properties.name) || 0;
          const isProv = count > 0;
          return (
            <g key={p.feature.properties.adcode}>
            <path
              d={p.pathD}
              fill={isProv ? heatColorForCount(count) : '#EFF3FA'}
              stroke="#FFFFFF"
              strokeWidth={0.6}
              className="transition-all duration-300 cursor-pointer hover:opacity-80"
              style={{ filter: isProv ? 'drop-shadow(0 1px 2px rgba(22,93,255,0.18))' : 'none' }}
              onClick={() => {
                // 拖拽时不触发点选
                if (drag.current.moved) return;
                const list = companies.filter((c) => c.province === p.feature.properties.name);
                if (list.length) onSelectCompany(list[0]);
              }}
            />
            {/* 省份名称标注：质心定位、白描边深字任何底色可读、字号随缩放保持屏幕恒定、不拦截点击 */}
            {p.centroid && (
              <text
                x={p.centroid[0]}
                y={p.centroid[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11 / scale}
                fill="#334155"
                stroke="#FFFFFF"
                strokeWidth={2.5 / scale}
                paintOrder="stroke"
                fontWeight={600}
                style={{ pointerEvents: 'none' }}
              >
                {shortProvinceName(p.feature.properties.name)}
              </text>
            )}
            </g>
          );
        })}
        {companyMarkers.map((c) => {
          const isSelected = c.id === selectedCompanyId;
          return (
            <g
              key={c.id}
              className="cursor-pointer"
              onClick={() => {
                if (drag.current.moved) return;
                onSelectCompany(c);
              }}
            >
              {/* 选中态外圈高亮 */}
              {isSelected && (
                <circle
                  cx={c.px}
                  cy={c.py}
                  r={c.r + 6}
                  fill="none"
                  stroke="#FF7D00"
                  strokeWidth={2}
                  opacity={0.9}
                />
              )}
              <circle
                cx={c.px}
                cy={c.py}
                r={c.r * 2}
                fill={c.analysisLevel >= 3 ? 'url(#gold-grad)' : 'url(#heat-grad)'}
                opacity={isSelected ? 0.7 : 0.45}
              />
              <circle
                cx={c.px}
                cy={c.py}
                r={c.r}
                fill={c.fill}
                stroke={isSelected ? '#FF7D00' : '#fff'}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <text
                x={c.px}
                y={c.py + 3.5}
                textAnchor="middle"
                fontSize={9}
                fill="#fff"
                fontWeight={700}
              >
                {c.interviewCount}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}

function shortProvinceName(name: string): string {
  return name
    .replace('维吾尔自治区', '')
    .replace('壮族自治区', '')
    .replace('回族自治区', '')
    .replace('特别行政区', '')
    .replace('自治区', '')
    .replace('省', '')
    .replace('市', '');
}

function heatColorForCount(count: number): string {
  if (count <= 1) return '#BCD3F5';
  if (count <= 2) return '#8AB0EE';
  return '#5C8BE5';
}
