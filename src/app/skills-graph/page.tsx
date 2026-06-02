import { Suspense } from 'react';
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Network, Search, Info, X, ZoomIn, ZoomOut, RotateCcw, Crown, TrendingUp
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


function SkillsGraphPageContent() {
  const { isMember, loading: memberLoading } = useMembership();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [searchSkill, setSearchSkill] = useState('');
  const [edges, setEdges] = useState<RelationEdge[]>([]);
  const [nodes, setNodes] = useState<RelationNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(activeRelations));
  const [zoom, setZoom] = useState(1);

  // 力导向模拟状态
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [simEdges, setSimEdges] = useState<SimEdge[]>([]);
  const animRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const skillFromUrl = searchParams.get('skill');
    if (skillFromUrl) {
      setSearchSkill(skillFromUrl);
      fetchRelations(skillFromUrl);
    } else {
      fetchRelations();
    }
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

    // 简单力模拟迭代
    const iterations = 120;
    for (let iter = 0; iter < iterations; iter++) {
      const alpha = 1 - iter / iterations;
      // 斥力
      for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
          const dx = newNodes[i].x - newNodes[j].x;
          const dy = newNodes[i].y - newNodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (800 * alpha) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          newNodes[i].vx += fx;
          newNodes[i].vy += fy;
          newNodes[j].vx -= fx;
          newNodes[j].vy -= fy;
        }
      }
      // 引力（边）
      for (const edge of newEdges) {
        const src = newNodes.find((n) => n.name === edge.source);
        const tgt = newNodes.find((n) => n.name === edge.target);
        if (!src || !tgt) continue;
        const dx = tgt.x - src.x;
        const dy = tgt.y - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.03 * alpha * edge.weight;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        src.vx += fx;
        src.vy += fy;
        tgt.vx -= fx;
        tgt.vy -= fy;
      }
      // 中心引力
      for (const node of newNodes) {
        node.vx += (W / 2 - node.x) * 0.001 * alpha;
        node.vy += (H / 2 - node.y) * 0.001 * alpha;
      }
      // 应用速度
      for (const node of newNodes) {
        node.vx *= 0.6;
        node.vy *= 0.6;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(40, Math.min(W - 40, node.x));
        node.y = Math.max(40, Math.min(H - 40, node.y));
      }
    }

    setSimNodes(newNodes);
    setSimEdges(newEdges);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, activeTypes]);

  const handleSearch = () => {
    if (searchSkill.trim()) {
      fetchRelations(searchSkill.trim());
      setSelectedNode(null);
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

  const getNodeRadius = (n: SimNode) => Math.max(16, Math.min(32, 12 + n.relatedCount * 4));

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
              <p className="text-gray-400 text-sm mb-4">尝试搜索特定技能查看关系，或返回学习路径查看推荐技能</p>
              <Button variant="outline" className="border-indigo-200 text-indigo-600 hover:bg-indigo-50" onClick={() => router.push('/learning-path')}>
                返回学习路径
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 图谱区域 */}
            <div className="lg:col-span-3">
              <Card className="border-indigo-100 overflow-hidden">
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-indigo-700 text-base">技能关系网络</CardTitle>
                  <div className="flex gap-1">
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
                    viewBox="0 0 800 500"
                    className="w-full"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.3s' }}
                  >
                    {/* 边 */}
                    {filteredSimEdges.map((edge, i) => {
                      const src = simNodes.find((n) => n.name === edge.source);
                      const tgt = simNodes.find((n) => n.name === edge.target);
                      if (!src || !tgt) return null;
                      const isHighlighted = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
                      return (
                        <g key={i}>
                          <line
                            x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                            stroke={relationColors[edge.type] || '#999'}
                            strokeWidth={isHighlighted ? 2.5 : 1.5}
                            strokeOpacity={isHighlighted ? 1 : (selectedNode ? 0.15 : 0.5)}
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
                              fillOpacity={isHighlighted ? 1 : (selectedNode ? 0.15 : 0.5)}
                            />
                          )}
                        </g>
                      );
                    })}

                    {/* 节点 */}
                    {simNodes.map((node) => {
                      const r = getNodeRadius(node);
                      const isSelected = selectedNode === node.name;
                      const isConnected = selectedNode
                        ? edges.some((e) =>
                            (e.sourceSkill === selectedNode && e.targetSkill === node.name) ||
                            (e.targetSkill === selectedNode && e.sourceSkill === node.name)
                          )
                        : true;
                      const isSearchMatch = searchSkill && node.name.toLowerCase().includes(searchSkill.toLowerCase());

                      return (
                        <g
                          key={node.name}
                          onClick={() => setSelectedNode(isSelected ? null : node.name)}
                          className="cursor-pointer"
                        >
                          <circle
                            cx={node.x} cy={node.y} r={r}
                            fill={isSelected ? '#4F46E5' : isSearchMatch ? '#7C3AED' : isConnected ? '#EEF2FF' : '#F9FAFB'}
                            stroke={isSelected ? '#4338CA' : isSearchMatch ? '#7C3AED' : isConnected ? '#A5B4FC' : '#E5E7EB'}
                            strokeWidth={isSelected ? 3 : isSearchMatch ? 2.5 : 1.5}
                            style={{ transition: 'fill 0.2s, stroke 0.2s' }}
                          />
                          <text
                            x={node.x} y={node.y + 1}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[10px] font-medium pointer-events-none"
                            fill={isSelected || isSearchMatch ? '#fff' : '#374151'}
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

              {/* 学习路径导航 */}
              <Card className="border-green-100 bg-gradient-to-br from-green-50/30 to-emerald-50/30">
                <CardContent className="py-3">
                  <Button variant="ghost" className="w-full text-green-700 hover:text-green-800 hover:bg-green-100 justify-start"
                    onClick={() => router.push('/learning-path')}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    返回学习路径
                  </Button>
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

// Wrap in Suspense to handle useSearchParams prerender error
export default function SkillsGraphPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <SkillsGraphPageContent />
    </Suspense>
  );
}
