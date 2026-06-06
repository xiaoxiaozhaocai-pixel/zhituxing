'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Network, Search, Info, X, ZoomIn, ZoomOut, RotateCcw, Crown
} from 'lucide-react';
import { useMembership } from '@/contexts/MembershipContext';
import PaywallModal from '@/components/PaywallModal';
import { AnalyticsTracker, AnalyticsEvent, usePageView } from '@/lib/analytics/tracker';

interface RelationNode {
  name: string;
  relatedCount: number;
}

interface RelationEdge {
  sourceSkill: string;
  targetSkill: string;
  relationType: 'co_occur' | 'prerequisite' | 'similar' | 'career_path';
  weight: number;
}

interface SimNode {
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  relatedCount: number;
}

interface SimEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

const relationColors: Record<string, string> = {
  co_occur: '#3B82F6',    // 蓝
  prerequisite: '#22C55E', // 绿
  similar: '#F97316',     // 橙
  career_path: '#A855F7', // 紫
};

const relationLabels: Record<string, string> = {
  co_occur: '共现关系',
  prerequisite: '前置关系',
  similar: '相似关系',
  career_path: '职业路径',
};

const activeRelations = ['co_occur', 'prerequisite', 'similar', 'career_path'] as const;

export default function SkillsGraphPage() {
  const { isMember, loading: memberLoading } = useMembership();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchSkill, setSearchSkill] = useState('');
  const [edges, setEdges] = useState<RelationEdge[]>([]);
  const [nodes, setNodes] = useState<RelationNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(activeRelations));
  const [zoom, setZoom] = useState(1);
  const [layoutMode, setLayoutMode] = useState<'force' | 'circular' | 'hierarchy'>('force');
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dragNode, setDragNode] = useState<string | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // 力导向模拟状态
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simEdges, setSimEdges] = useState<SimEdge[]>([]);
  const animRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragState = useRef<{ node: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const panState = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [searchFlash, setSearchFlash] = useState(false);

  // 埋点：页面浏览
  usePageView('skills_graph');

  // 初始化 tracker
  useEffect(() => {
    AnalyticsTracker.init({ membershipType: isMember ? 'member' : 'free' });
    return () => { AnalyticsTracker.destroy(); };
  }, [isMember]);

  const fetchRelations = useCallback(async (skill?: string) => {
    setLoading(true);

    // 埋点：浏览技能图谱
    AnalyticsTracker.track(AnalyticsEvent.SKILL_GRAPH_EXPLORE, { skill: skill || 'all' });

    try {
      const params = new URLSearchParams();
      if (skill) params.set('skill_name', skill);

      const res = await fetch(`/api/skills/relations?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        // 免费用户只能看搜索技能的直接关联（1层关系）
        let filteredEdges = data.data || [];
        let filteredNodes = data.nodes || [];
        if (!isMember && searchSkill) {
          const directSkill = searchSkill.trim().toLowerCase();
          filteredEdges = filteredEdges.filter((e: RelationEdge) =>
            e.sourceSkill.toLowerCase() === directSkill || e.targetSkill.toLowerCase() === directSkill
          );
          // 只保留与直接关联边相关的节点
          const relatedSkills = new Set<string>();
          filteredEdges.forEach((e: RelationEdge) => {
            relatedSkills.add(e.sourceSkill);
            relatedSkills.add(e.targetSkill);
          });
          relatedSkills.add(searchSkill.trim());
          filteredNodes = filteredNodes.filter((n: RelationNode) => relatedSkills.has(n.name));
        } else if (!isMember && !searchSkill) {
          // 免费用户未搜索时，只展示部分关系
          filteredEdges = filteredEdges.slice(0, 6);
          const shownSkills = new Set<string>();
          filteredEdges.forEach((e: RelationEdge) => {
            shownSkills.add(e.sourceSkill);
            shownSkills.add(e.targetSkill);
          });
          filteredNodes = filteredNodes.filter((n: RelationNode) => shownSkills.has(n.name));
        }
        setEdges(filteredEdges);
        setNodes(filteredNodes);
      }
    } catch (err) {
      console.error('获取技能关系失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 力导向图模拟
  useEffect(() => {
    if (nodes.length === 0) return;

    const W = 800, H = 500;
    const newNodes: SimNode[] = nodes.map((n, i) => ({
      name: n.name,
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H / 2 + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
      relatedCount: n.relatedCount,
    }));

    const filteredEdges = edges.filter((e) => activeTypes.has(e.relationType));
    const newEdges: SimEdge[] = filteredEdges.map((e) => ({
      source: e.sourceSkill,
      target: e.targetSkill,
      type: e.relationType,
      weight: e.weight,
    }));

    // 根据布局模式计算节点位置
    if (layoutMode === 'force') {
      // 改进版力导向：300次迭代、自适应冷却、更大斥力
      const iterations = 300;
      const idealEdgeLen = 150;
      for (let iter = 0; iter < iterations; iter++) {
        // 自适应冷却：前期高速探索，后期精细调整
        const progress = iter / iterations;
        const alpha = progress < 0.4
          ? 1 - progress * 0.5          // 0-40%: 1→0.8 快速扩散
          : (1 - progress) * 0.5 / 0.6; // 40-100%: 0.5→0 精细收敛

        // 斥力：节点间（加大到2000）
        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const a = newNodes[i]!, b = newNodes[j]!;
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const minDist = getNodeRadius(a) + getNodeRadius(b) + 16;
            if (dist < minDist * 2) {
              const force = (2000 * alpha) / Math.max(dist * dist, minDist * minDist);
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;
              a.vx += fx; a.vy += fy;
              b.vx -= fx; b.vy -= fy;
            }
          }
        }

        // 引力：边（多级弹力）
        for (const edge of newEdges) {
          const src = newNodes.find((n) => n.name === edge.source);
          const tgt = newNodes.find((n) => n.name === edge.target);
          if (!src || !tgt) continue;
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetLen = idealEdgeLen / Math.sqrt(edge.weight);
          const force = (dist - targetLen) * 0.02 * alpha * edge.weight;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          src.vx += fx; src.vy += fy;
          tgt.vx -= fx; tgt.vy -= fy;
        }

        // 中心引力（加强）
        for (const node of newNodes) {
          node.vx += (W / 2 - node.x) * 0.003 * alpha;
          node.vy += (H / 2 - node.y) * 0.003 * alpha;
        }

        // 速度衰减 + 位置更新
        const decay = 0.65 + progress * 0.2; // 0.65→0.85 逐步放松阻尼
        for (const node of newNodes) {
          node.vx *= decay;
          node.vy *= decay;
          node.x += node.vx;
          node.y += node.vy;
          // 边界约束（留更大边距）
          node.x = Math.max(50, Math.min(W - 50, node.x));
          node.y = Math.max(50, Math.min(H - 50, node.y));
        }
      }
    } else if (layoutMode === 'circular') {
      // 环形布局
      const cx = W / 2, cy = H / 2;
      const radius = Math.min(W, H) * 0.35;
      const sorted = [...newNodes].sort((a, b) => b.relatedCount - a.relatedCount);
      sorted.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / sorted.length - Math.PI / 2;
        node.x = cx + radius * Math.cos(angle);
        node.y = cy + radius * Math.sin(angle);
        node.vx = 0; node.vy = 0;
      });
    } else if (layoutMode === 'hierarchy') {
      // 层次聚类布局：按 relatedCount 分3层
      const maxRel = Math.max(...newNodes.map(n => n.relatedCount), 1);
      const layers: SimNode[][] = [[], [], []];
      newNodes.forEach(node => {
        const tier = node.relatedCount >= maxRel * 0.66 ? 0
                   : node.relatedCount >= maxRel * 0.33 ? 1 : 2;
        layers[tier]!.push(node);
      });
      const layerConfigs = [
        { y: 100, xGap: W / (layers[0]!.length + 1) },
        { y: 280, xGap: W / (layers[1]!.length + 1) },
        { y: 420, xGap: W / (layers[2]!.length + 1) },
      ];
      layers.forEach((layer, li) => {
        const cfg = layerConfigs[li]!;
        layer.forEach((node, ni) => {
          node.x = cfg.xGap * (ni + 1);
          node.y = cfg.y;
          node.vx = 0; node.vy = 0;
        });
      });
    }

    setSimNodes(newNodes);
    setSimEdges(newEdges);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, activeTypes, layoutMode]);

  const handleSearch = () => {
    if (searchSkill.trim()) {
      fetchRelations(searchSkill.trim());
      setSelectedNode(null);
      // 搜索定位动画
      setSearchFlash(true);
      setTimeout(() => setSearchFlash(false), 1200);
    }
  };

  const handleReset = () => {
    setSearchSkill('');
    setSelectedNode(null);
    fetchRelations();
  };

  const toggleType = (type: string) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // 过滤后的边
  const filteredSimEdges = simEdges.filter((e) => activeTypes.has(e.type));

  // 选中节点的关联边和信息
  const nodeEdges = selectedNode
    ? edges.filter((e) => e.sourceSkill === selectedNode || e.targetSkill === selectedNode)
    : [];

  // 节点半径按关联数缩放，范围18-40
  const getNodeRadius = (n: SimNode) => {
    const maxRel = Math.max(...simNodes.map(s => s.relatedCount), 1);
    const ratio = n.relatedCount / maxRel;
    return 18 + ratio * 22;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">技能关系图</h1>
          </div>
          <p className="text-gray-500 ml-13">可视化展示技能之间的关联关系，发现学习路径</p>
          {!isMember && !memberLoading && (
            <button
              onClick={() => setPaywallOpen(true)}
              className="ml-4 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-700 border border-amber-200 hover:from-amber-200 hover:to-yellow-200 transition-all"
            >
              <Crown className="w-3.5 h-3.5" /> 升级会员查看完整图谱
            </button>
          )}
        </div>

        {/* 搜索和筛选 */}
        <Card className="mb-6 border-indigo-100">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="搜索技能，如：Java、React、新媒体运营"
                  value={searchSkill}
                  onChange={(e) => setSearchSkill(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSearch} className="bg-[#165DFF] hover:bg-[#165DFF]/90">
                  <Search className="w-4 h-4 mr-1" /> 搜索
                </Button>
                <Button variant="outline" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4 mr-1" /> 重置
                </Button>
              </div>
            </div>
            {/* 关系类型筛选 */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {activeRelations.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    activeTypes.has(type)
                      ? 'border-transparent text-white'
                      : 'border-gray-200 text-gray-400 bg-gray-50'
                  }`}
                  style={activeTypes.has(type) ? { backgroundColor: relationColors[type] } : undefined}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: activeTypes.has(type) ? '#fff' : relationColors[type] }}
                  />
                  {relationLabels[type]}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Spinner className="w-10 h-10 text-indigo-500" />
            <p className="mt-4 text-gray-500">加载技能关系数据...</p>
          </div>
        ) : simNodes.length === 0 ? (
          <Card className="border-gray-100">
            <CardContent className="py-16 text-center">
              <Network className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">暂无技能关系数据</h3>
              <p className="text-gray-400 text-sm">尝试搜索特定技能查看关系</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 图谱区域 */}
            <div className="lg:col-span-3">
              <Card className="border-indigo-100 overflow-hidden">
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-indigo-700 text-base">技能关系网络</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-lg border border-gray-200 p-0.5 mr-1">
                      {(['force', 'circular', 'hierarchy'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setLayoutMode(mode)}
                          className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                            layoutMode === mode
                              ? 'bg-indigo-500 text-white shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {mode === 'force' ? '力导向' : mode === 'circular' ? '环形' : '层次'}
                        </button>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.min(2, z + 0.15))}>
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}>
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent ref={containerRef} className="overflow-auto" style={{ minHeight: 500 }}>
                  <svg
                    ref={svgRef}
                    viewBox="0 0 800 500"
                    className="w-full select-none"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.3s' }}
                    onWheel={(e) => {
                      e.preventDefault();
                      setZoom((z) => Math.max(0.4, Math.min(2.5, z + (e.deltaY > 0 ? -0.1 : 0.1))));
                    }}
                    onMouseDown={(e) => {
                      if (e.target === svgRef.current || (e.target as Element).tagName === 'svg') {
                        panState.current = { startX: e.clientX, startY: e.clientY, panX: panOffset.x, panY: panOffset.y };
                      }
                    }}
                    onMouseMove={(e) => {
                      // 节点拖拽
                      if (dragState.current) {
                        const dx = (e.clientX - dragState.current.startX) / zoom;
                        const dy = (e.clientY - dragState.current.startY) / zoom;
                        setSimNodes((prev) => prev.map((n) =>
                          n.name === dragState.current!.node
                            ? { ...n, x: Math.max(50, Math.min(750, dragState.current!.nodeX + dx)), y: Math.max(50, Math.min(450, dragState.current!.nodeY + dy)) }
                            : n
                        ));
                        setDragNode(dragState.current.node);
                      }
                      // 画布平移
                      if (panState.current) {
                        const dx = e.clientX - panState.current.startX;
                        const dy = e.clientY - panState.current.startY;
                        setPanOffset({ x: panState.current.panX + dx, y: panState.current.panY + dy });
                      }
                    }}
                    onMouseUp={() => {
                      dragState.current = null;
                      panState.current = null;
                      setDragNode(null);
                    }}
                    onMouseLeave={() => {
                      dragState.current = null;
                      panState.current = null;
                      setDragNode(null);
                      setHoveredNode(null);
                    }}
                  >
                    {/* 边 */}
                    {filteredSimEdges.map((edge, i) => {
                      const src = simNodes.find((n) => n.name === edge.source);
                      const tgt = simNodes.find((n) => n.name === edge.target);
                      if (!src || !tgt) return null;
                      const isHighlighted = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
                      const isHoverRelated = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode);
                      const isEdgeDimmed = (hoveredNode || selectedNode) && !isHighlighted && !isHoverRelated;
                      const edgeWidth = Math.max(1, Math.min(4, 1 + edge.weight * 1.5));
                      return (
                        <g key={i}>
                          <line
                            x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                            stroke={relationColors[edge.type] || '#999'}
                            strokeWidth={isHighlighted || isHoverRelated ? edgeWidth + 1 : edgeWidth}
                            strokeOpacity={isEdgeDimmed ? 0.08 : (isHighlighted || isHoverRelated ? 1 : 0.45)}
                            strokeDasharray={edge.type === 'prerequisite' ? '6,3' : edge.type === 'similar' ? '3,3' : 'none'}
                          />
                          {edge.type === 'prerequisite' && (
                            <polygon
                              points={(() => {
                                const dx = tgt.x - src.x;
                                const dy = tgt.y - src.y;
                                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                                const r = getNodeRadius(tgt);
                                const px = tgt.x - (dx / len) * (r + 4);
                                const py = tgt.y - (dy / len) * (r + 4);
                                const ax = dx / len;
                                const ay = dy / len;
                                const s = 6;
                                return `${px},${py} ${px - ax * s - ay * s},${py - ay * s + ax * s} ${px - ax * s + ay * s},${py - ay * s - ax * s}`;
                              })()}
                              fill={relationColors[edge.type]}
                              fillOpacity={isEdgeDimmed ? 0.08 : (isHighlighted || isHoverRelated ? 1 : 0.45)}
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* 节点 */}
                    {simNodes.map((node) => {
                      const r = getNodeRadius(node);
                      const isSelected = selectedNode === node.name;
                      const relevantNode = selectedNode || hoveredNode;
                      const isConnected = relevantNode
                        ? edges.some((e) =>
                            (e.sourceSkill === relevantNode && e.targetSkill === node.name) ||
                            (e.targetSkill === relevantNode && e.sourceSkill === node.name)
                          )
                        : true;
                      const isSearchMatch = searchSkill && node.name.toLowerCase().includes(searchSkill.toLowerCase());
                      const needsFlash = isSearchMatch && searchFlash;

                      const isHovered = hoveredNode === node.name;
                      const isDimmed = (hoveredNode || selectedNode) && !isConnected && !isSelected && !isHovered;
                      return (
                        <g
                          key={node.name}
                          onClick={() => setSelectedNode(isSelected ? null : node.name)}
                          onMouseEnter={() => setHoveredNode(node.name)}
                          onMouseLeave={() => setHoveredNode(null)}
                          onMouseDown={(e) => {
                            if (e.button !== 0) return;
                            e.stopPropagation();
                            dragState.current = { node: node.name, startX: e.clientX, startY: e.clientY, nodeX: node.x, nodeY: node.y };
                          }}
                          style={{
                            cursor: dragNode === node.name ? 'grabbing' : 'pointer',
                            opacity: isDimmed ? 0.15 : 1,
                            transition: 'opacity 0.2s',
                          }}
                        >
{needsFlash && (
                            <circle
                              cx={node.x} cy={node.y} r={r + 12}
                              fill="none"
                              stroke="#7C3AED"
                              strokeWidth={2}
                              className="animate-ping"
                              style={{ animationDuration: '1s', animationIterationCount: '1' }}
                            />
                          )}
                          <circle
                            cx={node.x} cy={node.y} r={r}
                            fill={isSelected ? '#4F46E5' : isSearchMatch ? '#7C3AED' : isHovered ? '#6366F1' : isConnected ? '#EEF2FF' : '#F9FAFB'}
                            stroke={isSelected ? '#4338CA' : isSearchMatch ? '#7C3AED' : isHovered ? '#4F46E5' : isConnected ? '#A5B4FC' : '#E5E7EB'}
                            strokeWidth={isSelected || isHovered ? 3 : isSearchMatch ? 2.5 : 1.5}
                            style={{ transition: 'fill 0.2s, stroke 0.2s' }}
                          />
                          <text
                            x={node.x} y={node.y + 1}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[10px] font-medium pointer-events-none"
                            fill={isSelected || isSearchMatch || isHovered ? '#fff' : '#374151'}
                          >
                            {node.name.length > 6 ? node.name.slice(0, 6) + '..' : node.name}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </CardContent>
              </Card>
            </div>

            {/* 右侧：节点详情 */}
            <div className="lg:col-span-1 space-y-4">
              {/* 图例 */}
              <Card className="border-indigo-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">关系图例</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {activeRelations.map((type) => (
                      <div key={type} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-0.5 rounded" style={{ backgroundColor: relationColors[type] }} />
                        <span className="text-gray-600">{relationLabels[type]}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-6 h-0.5 rounded border-t-2 border-dashed border-gray-400" />
                      <span className="text-gray-600">虚线=前置/相似</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 选中节点信息 */}
              {selectedNode ? (
                <Card className="border-indigo-100">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-indigo-700 flex items-center gap-1">
                      <Info className="w-4 h-4" /> {selectedNode}
                      <button onClick={() => setSelectedNode(null)} className="ml-auto">
                        <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {nodeEdges.length > 0 ? (
                      <div className="space-y-2">
                        {nodeEdges.map((e, i) => {
                          const isSource = e.sourceSkill === selectedNode;
                          const otherSkill = isSource ? e.targetSkill : e.sourceSkill;
                          return (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: relationColors[e.relationType] }} />
                              <span className="text-gray-500">{isSource ? '→' : '←'}</span>
                              <span className="font-medium text-gray-700">{otherSkill}</span>
                              <Badge className="text-xs ml-auto" style={{ backgroundColor: relationColors[e.relationType] + '20', color: relationColors[e.relationType], borderColor: relationColors[e.relationType] + '40' }}>
                                {relationLabels[e.relationType]}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">暂无关联关系</p>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-gray-100">
                  <CardContent className="py-6 text-center">
                    <Info className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">点击图谱中的节点查看详情</p>
                  </CardContent>
                </Card>
              )}

              {/* 节点列表 */}
              <Card className="border-indigo-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-600">技能节点 ({simNodes.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {simNodes
                      .sort((a, b) => b.relatedCount - a.relatedCount)
                      .map((node) => (
                        <button
                          key={node.name}
                          onClick={() => setSelectedNode(node.name)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                            selectedNode === node.name
                              ? 'bg-indigo-50 text-indigo-700 font-medium'
                              : 'hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{node.name}</span>
                            <span className="text-xs text-gray-400">{node.relatedCount} 关联</span>
                          </div>
                        </button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* 付费墙弹窗 */}
      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} feature="完整技能图谱" />
    </div>
  );
}
