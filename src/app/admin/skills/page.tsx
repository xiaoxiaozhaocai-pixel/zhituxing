'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ============ 类型定义 ============
interface TaxonomyItem {
  id: number;
  skill_name: string;
  category: string | null;
  domain: string | null;
  aliases: string[] | null;
  created_at: string;
}

interface RelationItem {
  id: number;
  source_skill: string;
  target_skill: string;
  relation_type: string;
  weight: number;
  created_at: string;
}

interface GraphNode {
  name: string;
  type: string;
}

interface GraphEdge {
  source: string;
  target: string;
  relationType: string;
  weight: number;
}

// 关系类型配置
const RELATION_CONFIG: Record<string, { label: string; color: string; lineStyle: string }> = {
  prerequisite: { label: '前置关系', color: '#22C55E', lineStyle: '' },
  co_occur: { label: '共现关系', color: '#3B82F6', lineStyle: '6,3' },
  similar: { label: '相似关系', color: '#F97316', lineStyle: '3,3' },
  career_path: { label: '职业路径', color: '#165DFF', lineStyle: '10,3' },
};

export default function AdminSkillsPage() {
  // Tab 状态
  const [activeTab, setActiveTab] = useState<'taxonomy' | 'relations'>('taxonomy');

  // 技能分类
  const [taxonomy, setTaxonomy] = useState<TaxonomyItem[]>([]);
  const [taxonomyPage, setTaxonomyPage] = useState(1);
  const [taxonomyTotal, setTaxonomyTotal] = useState(0);
  const [taxonomyKeyword, setTaxonomyKeyword] = useState('');

  // 技能关系
  const [relations, setRelations] = useState<RelationItem[]>([]);
  const [relationsPage, setRelationsPage] = useState(1);
  const [relationsTotal, setRelationsTotal] = useState(0);
  const [relationsFilter, setRelationsFilter] = useState('');
  const [relationsKeyword, setRelationsKeyword] = useState('');

  // 统计
  const [stats, setStats] = useState<{ taxonomyTotal: number; relationsTotal: number; typeBreakdown: Record<string, unknown>[]; categoryBreakdown: Record<string, unknown>[] } | null>(null);

  // 表单
  const [showAddTaxonomy, setShowAddTaxonomy] = useState(false);
  const [showAddRelation, setShowAddRelation] = useState(false);
  const [newTaxonomy, setNewTaxonomy] = useState({ skill_name: '', category: '', domain: '' });
  const [newRelation, setNewRelation] = useState({ source_skill: '', target_skill: '', relation_type: 'prerequisite', weight: 0.8 });

  // 可视化
  const [graphSkill, setGraphSkill] = useState('Java');
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [showGraph, setShowGraph] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // 批量导入
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importResult, setImportResult] = useState<{ inserted: number; errors: number; total: number } | null>(null);

  // 编辑
  const [editingItem, setEditingItem] = useState<TaxonomyItem | null>(null);
  const [editingRelation, setEditingRelation] = useState<RelationItem | null>(null);

  const pageSize = 10;

  // ============ 数据加载 ============
  const fetchTaxonomy = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(taxonomyPage), page_size: String(pageSize), keyword: taxonomyKeyword });
      const res = await fetch(`/api/admin/skills?${params}`);
      const data = await res.json();
      if (data.success) {
        setTaxonomy(data.data);
        setTaxonomyTotal(data.pagination?.total || 0);
      }
    } catch (e) { console.error('加载技能分类失败:', e); }
  }, [taxonomyPage, taxonomyKeyword]);

  const fetchRelations = useCallback(async () => {
    try {
      const params = new URLSearchParams({ action: 'relations', page: String(relationsPage), page_size: String(pageSize), relation_type: relationsFilter, keyword: relationsKeyword });
      const res = await fetch(`/api/admin/skills?${params}`);
      const data = await res.json();
      if (data.success) {
        setRelations(data.data);
        setRelationsTotal(data.pagination?.total || 0);
      }
    } catch (e) { console.error('加载技能关系失败:', e); }
  }, [relationsPage, relationsFilter, relationsKeyword]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/skills?action=stats');
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (e) { console.error('加载统计失败:', e); }
  }, []);

  const fetchGraph = useCallback(async () => {
    if (!graphSkill.trim()) return;
    try {
      const res = await fetch(`/api/admin/skills?action=graph&skill_name=${encodeURIComponent(graphSkill)}`);
      const data = await res.json();
      if (data.success && data.data) {
        setGraphNodes(data.data.nodes || []);
        setGraphEdges(data.data.edges || []);
        setShowGraph(true);
      }
    } catch (e) { console.error('加载关系图失败:', e); }
  }, [graphSkill]);

  useEffect(() => { fetchTaxonomy(); }, [fetchTaxonomy]);
  useEffect(() => { fetchRelations(); }, [fetchRelations]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(); }, []);

  // ============ CRUD操作 ============
  const handleAddTaxonomy = async () => {
    if (!newTaxonomy.skill_name.trim()) return;
    await fetch('/api/admin/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_taxonomy', ...newTaxonomy }),
    });
    setNewTaxonomy({ skill_name: '', category: '', domain: '' });
    setShowAddTaxonomy(false);
    fetchTaxonomy();
    fetchStats();
  };

  const handleAddRelation = async () => {
    if (!newRelation.source_skill.trim() || !newRelation.target_skill.trim()) return;
    await fetch('/api/admin/skills', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_relation', ...newRelation }),
    });
    setNewRelation({ source_skill: '', target_skill: '', relation_type: 'prerequisite', weight: 0.8 });
    setShowAddRelation(false);
    fetchRelations();
    fetchStats();
  };

  const handleDeleteTaxonomy = async (id: number) => {
    if (!confirm('确认删除此技能分类？')) return;
    await fetch(`/api/admin/skills?action=taxonomy&id=${id}`, { method: 'DELETE' });
    fetchTaxonomy();
    fetchStats();
  };

  const handleDeleteRelation = async (id: number) => {
    if (!confirm('确认删除此技能关系？')) return;
    await fetch(`/api/admin/skills?action=relation&id=${id}`, { method: 'DELETE' });
    fetchRelations();
    fetchStats();
  };

  const handleUpdateTaxonomy = async () => {
    if (!editingItem) return;
    await fetch('/api/admin/skills', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_taxonomy', id: editingItem.id, skill_name: editingItem.skill_name, category: editingItem.category, domain: editingItem.domain }),
    });
    setEditingItem(null);
    fetchTaxonomy();
  };

  const handleUpdateRelation = async () => {
    if (!editingRelation) return;
    await fetch('/api/admin/skills', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_relation', id: editingRelation.id, source_skill: editingRelation.source_skill, target_skill: editingRelation.target_skill, relation_type: editingRelation.relation_type, weight: editingRelation.weight }),
    });
    setEditingRelation(null);
    fetchRelations();
  };

  const handleBulkImport = async () => {
    try {
      const lines = csvText.trim().split('\n');
      const items = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        return { source_skill: parts[0], target_skill: parts[1], relation_type: parts[2] || 'co_occur', weight: parts[3] ? parseFloat(parts[3]) : 0.5 };
      }).filter(item => item.source_skill && item.target_skill);

      const res = await fetch('/api/admin/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk_import', items }),
      });
      const data = await res.json();
      if (data.success) {
        setImportResult({ inserted: data.inserted, errors: data.errors, total: data.total });
        fetchRelations();
        fetchStats();
      }
    } catch (e) { console.error('导入失败:', e); }
  };

  // ============ 力导向图布局 ============
  const renderForceGraph = () => {
    if (graphNodes.length === 0) return null;

    const width = 500;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 150;

    const nodePositions = new Map<string, { x: number; y: number }>();
    graphNodes.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / graphNodes.length - Math.PI / 2;
      const r = node.name === graphSkill ? 0 : radius;
      nodePositions.set(node.name, {
        x: centerX + r * Math.cos(angle),
        y: centerY + r * Math.sin(angle),
      });
    });

    return (
      <svg ref={svgRef} width={width} height={height} className="border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
        {/* 边 */}
        {graphEdges.map((edge, i) => {
          const src = nodePositions.get(edge.source);
          const tgt = nodePositions.get(edge.target);
          if (!src || !tgt) return null;
          const config = RELATION_CONFIG[edge.relationType] || RELATION_CONFIG.co_occur;
          return (
            <g key={`edge-${i}`}>
              <line
                x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={config!.color} strokeWidth={1.5 + edge.weight * 2}
                strokeDasharray={config!.lineStyle || 'none'}
                opacity={0.7}
              />
              <text
                x={(src.x + tgt.x) / 2} y={(src.y + tgt.y) / 2 - 6}
                textAnchor="middle" fill={config!.color} fontSize={10}
              >
                {config!.label}
              </text>
            </g>
          );
        })}
        {/* 节点 */}
        {graphNodes.map((node, i) => {
          const pos = nodePositions.get(node.name);
          if (!pos) return null;
          const isCenter = node.name === graphSkill;
          return (
            <g key={`node-${i}`} style={{ cursor: 'pointer' }}
              onClick={() => { setGraphSkill(node.name); }}
            >
              <circle
                cx={pos.x} cy={pos.y}
                r={isCenter ? 28 : 18}
                fill={isCenter ? '#1E40AF' : '#E2E8F0'}
                stroke={isCenter ? '#3B82F6' : '#94A3B8'}
                strokeWidth={isCenter ? 3 : 1.5}
              />
              <text
                x={pos.x} y={pos.y + 4}
                textAnchor="middle" fill={isCenter ? 'white' : '#1E293B'}
                fontSize={isCenter ? 12 : 10} fontWeight={isCenter ? 'bold' : 'normal'}
              >
                {node.name.length > 6 ? node.name.slice(0, 5) + '…' : node.name}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  // ============ 渲染 ============
  return (
    <div className="flex gap-6">
      {/* 左侧主区域 */}
      <div className="flex-1 space-y-6">
        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardContent className="p-4">
              <div className="text-[#64748B] text-sm">技能分类</div>
              <div className="text-2xl font-bold text-[#1E293B] mt-1">{stats?.taxonomyTotal || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardContent className="p-4">
              <div className="text-[#64748B] text-sm">技能关系</div>
              <div className="text-2xl font-bold text-[#1E293B] mt-1">{stats?.relationsTotal || 0}</div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardContent className="p-4">
              <div className="text-[#64748B] text-sm">前置关系</div>
              <div className="text-2xl font-bold text-green-600 mt-1">
                {Number(stats?.typeBreakdown?.find((t: Record<string, unknown>) => t.relation_type === 'prerequisite')?.count) || 0}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardContent className="p-4">
              <div className="text-[#64748B] text-sm">共现关系</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                {Number(stats?.typeBreakdown?.find((t: Record<string, unknown>) => t.relation_type === 'co_occur')?.count) || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 分类分布 */}
        {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[#1E293B]">技能分类分布</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.categoryBreakdown.map((cat: Record<string, unknown>, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-full text-xs bg-[#F8FAFC] text-[#1E293B] border border-[#E2E8F0]">
                    {String(cat.category)} ({String(cat.count)})
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tab切换 */}
        <div className="flex gap-2 border-b border-[#E2E8F0] pb-2">
          <button
            className={`px-4 py-2 rounded-t text-sm font-medium ${activeTab === 'taxonomy' ? 'bg-blue-600 text-white' : 'text-[#64748B] hover:text-[#1E293B]'}`}
            onClick={() => setActiveTab('taxonomy')}
          >技能分类管理</button>
          <button
            className={`px-4 py-2 rounded-t text-sm font-medium ${activeTab === 'relations' ? 'bg-blue-600 text-white' : 'text-[#64748B] hover:text-[#1E293B]'}`}
            onClick={() => setActiveTab('relations')}
          >技能关系管理</button>
        </div>

        {/* 技能分类Tab */}
        {activeTab === 'taxonomy' && (
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-[#1E293B]">技能分类列表</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="搜索技能..." value={taxonomyKeyword}
                  onChange={e => { setTaxonomyKeyword(e.target.value); setTaxonomyPage(1); }}
                  className="w-40 h-8 text-xs" />
                <Button size="sm" onClick={() => setShowAddTaxonomy(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  + 新增
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-[#1E293B]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                      <th className="text-left py-2 px-2">ID</th>
                      <th className="text-left py-2 px-2">技能名称</th>
                      <th className="text-left py-2 px-2">类别</th>
                      <th className="text-left py-2 px-2">领域</th>
                      <th className="text-left py-2 px-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxonomy.map(item => (
                      <tr key={item.id} className="border-b border-[#E2E8F0]/50 hover:bg-blue-50/30">
                        <td className="py-2 px-2 text-[#64748B]">{item.id}</td>
                        <td className="py-2 px-2 font-medium text-[#1E293B]">{item.skill_name}</td>
                        <td className="py-2 px-2">
                          {editingItem?.id === item.id ? (
                            <Input value={editingItem.category || ''} onChange={e => setEditingItem({ ...editingItem, category: e.target.value })}
                              className="w-24 h-7 text-xs" />
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-[#F8FAFC] text-xs border border-[#E2E8F0]">{item.category || '-'}</span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          {editingItem?.id === item.id ? (
                            <Input value={editingItem.domain || ''} onChange={e => setEditingItem({ ...editingItem, domain: e.target.value })}
                              className="w-28 h-7 text-xs" />
                          ) : (
                            <span className="text-xs">{item.domain || '-'}</span>
                          )}
                        </td>
                        <td className="py-2 px-2">
                          {editingItem?.id === item.id ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={handleUpdateTaxonomy} className="text-green-600 text-xs h-6">保存</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)} className="text-[#64748B] text-xs h-6">取消</Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditingItem(item)} className="text-blue-600 text-xs h-6">编辑</Button>
                              <Button size="sm" variant="ghost" onClick={() => handleDeleteTaxonomy(item.id)} className="text-red-600 text-xs h-6">删除</Button>
                              <Button size="sm" variant="ghost" onClick={() => { setGraphSkill(item.skill_name); }} className="text-blue-600 text-xs h-6">图谱</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-[#64748B]">
                <span>共 {taxonomyTotal} 条</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled={taxonomyPage <= 1} onClick={() => setTaxonomyPage(p => p - 1)} className="h-7 text-xs">上一页</Button>
                  <span className="px-2 py-1">{taxonomyPage} / {Math.max(1, Math.ceil(taxonomyTotal / pageSize))}</span>
                  <Button size="sm" variant="ghost" disabled={taxonomyPage >= Math.ceil(taxonomyTotal / pageSize)} onClick={() => setTaxonomyPage(p => p + 1)} className="h-7 text-xs">下一页</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 技能关系Tab */}
        {activeTab === 'relations' && (
          <Card className="bg-white border-[#E2E8F0] shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-[#1E293B]">技能关系列表</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="搜索技能..." value={relationsKeyword}
                  onChange={e => { setRelationsKeyword(e.target.value); setRelationsPage(1); }}
                  className="w-32 h-8 text-xs" />
                <select value={relationsFilter} onChange={e => { setRelationsFilter(e.target.value); setRelationsPage(1); }}
                  className="h-8 border border-[#E2E8F0] bg-white text-[#1E293B] text-xs rounded px-2">
                  <option value="">全部关系</option>
                  <option value="prerequisite">前置</option>
                  <option value="co_occur">共现</option>
                  <option value="similar">相似</option>
                  <option value="career_path">职业路径</option>
                </select>
                <Button size="sm" onClick={() => setShowAddRelation(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">+ 新增</Button>
                <Button size="sm" variant="outline" onClick={() => setShowImport(true)}
                  className="text-xs">批量导入</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-[#1E293B]">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                      <th className="text-left py-2 px-2">ID</th>
                      <th className="text-left py-2 px-2">源技能</th>
                      <th className="text-left py-2 px-2">目标技能</th>
                      <th className="text-left py-2 px-2">关系类型</th>
                      <th className="text-left py-2 px-2">权重</th>
                      <th className="text-left py-2 px-2">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relations.map(item => {
                      const config = RELATION_CONFIG[item.relation_type] || RELATION_CONFIG.co_occur;
                      return (
                        <tr key={item.id} className="border-b border-[#E2E8F0]/50 hover:bg-blue-50/30">
                          <td className="py-2 px-2 text-[#64748B]">{item.id}</td>
                          <td className="py-2 px-2 font-medium text-[#1E293B]">
                            {editingRelation?.id === item.id ? (
                              <Input value={editingRelation.source_skill} onChange={e => setEditingRelation({ ...editingRelation, source_skill: e.target.value })}
                                className="w-28 h-7 text-xs" />
                            ) : item.source_skill}
                          </td>
                          <td className="py-2 px-2 font-medium text-[#1E293B]">
                            {editingRelation?.id === item.id ? (
                              <Input value={editingRelation.target_skill} onChange={e => setEditingRelation({ ...editingRelation, target_skill: e.target.value })}
                                className="w-28 h-7 text-xs" />
                            ) : item.target_skill}
                          </td>
                          <td className="py-2 px-2">
                            {editingRelation?.id === item.id ? (
                              <select value={editingRelation.relation_type} onChange={e => setEditingRelation({ ...editingRelation, relation_type: e.target.value })}
                                className="h-7 border border-[#E2E8F0] bg-white text-[#1E293B] text-xs rounded px-1">
                                <option value="prerequisite">前置</option>
                                <option value="co_occur">共现</option>
                                <option value="similar">相似</option>
                                <option value="career_path">职业路径</option>
                              </select>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: config!.color + '15', color: config!.color, border: `1px solid ${config!.color}30` }}>{config!.label}</span>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            {editingRelation?.id === item.id ? (
                              <Input type="number" step="0.1" min="0" max="1" value={editingRelation.weight}
                                onChange={e => setEditingRelation({ ...editingRelation, weight: parseFloat(e.target.value) || 0 })}
                                className="w-16 h-7 text-xs" />
                            ) : (
                              <span className="text-xs">{item.weight}</span>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            {editingRelation?.id === item.id ? (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={handleUpdateRelation} className="text-green-600 text-xs h-6">保存</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingRelation(null)} className="text-[#64748B] text-xs h-6">取消</Button>
                              </div>
                            ) : (
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setEditingRelation(item)} className="text-blue-600 text-xs h-6">编辑</Button>
                                <Button size="sm" variant="ghost" onClick={() => handleDeleteRelation(item.id)} className="text-red-600 text-xs h-6">删除</Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-[#64748B]">
                <span>共 {relationsTotal} 条</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" disabled={relationsPage <= 1} onClick={() => setRelationsPage(p => p - 1)} className="h-7 text-xs">上一页</Button>
                  <span className="px-2 py-1">{relationsPage} / {Math.max(1, Math.ceil(relationsTotal / pageSize))}</span>
                  <Button size="sm" variant="ghost" disabled={relationsPage >= Math.ceil(relationsTotal / pageSize)} onClick={() => setRelationsPage(p => p + 1)} className="h-7 text-xs">下一页</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 新增技能分类弹窗 */}
        {showAddTaxonomy && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddTaxonomy(false)}>
            <div className="bg-white p-6 rounded-xl w-96 border border-[#E2E8F0] shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-[#1E293B] font-medium mb-4">新增技能分类</h3>
              <div className="space-y-3">
                <div><label className="text-[#64748B] text-xs">技能名称 *</label><Input value={newTaxonomy.skill_name} onChange={e => setNewTaxonomy({ ...newTaxonomy, skill_name: e.target.value })} /></div>
                <div><label className="text-[#64748B] text-xs">类别</label><Input value={newTaxonomy.category} onChange={e => setNewTaxonomy({ ...newTaxonomy, category: e.target.value })} /></div>
                <div><label className="text-[#64748B] text-xs">领域</label><Input value={newTaxonomy.domain} onChange={e => setNewTaxonomy({ ...newTaxonomy, domain: e.target.value })} /></div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <Button variant="outline" onClick={() => setShowAddTaxonomy(false)}>取消</Button>
                <Button onClick={handleAddTaxonomy} className="bg-blue-600 hover:bg-blue-700 text-white">确认</Button>
              </div>
            </div>
          </div>
        )}

        {/* 新增技能关系弹窗 */}
        {showAddRelation && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowAddRelation(false)}>
            <div className="bg-white p-6 rounded-xl w-96 border border-[#E2E8F0] shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-[#1E293B] font-medium mb-4">新增技能关系</h3>
              <div className="space-y-3">
                <div><label className="text-[#64748B] text-xs">源技能 *</label><Input value={newRelation.source_skill} onChange={e => setNewRelation({ ...newRelation, source_skill: e.target.value })} /></div>
                <div><label className="text-[#64748B] text-xs">目标技能 *</label><Input value={newRelation.target_skill} onChange={e => setNewRelation({ ...newRelation, target_skill: e.target.value })} /></div>
                <div>
                  <label className="text-[#64748B] text-xs">关系类型</label>
                  <select value={newRelation.relation_type} onChange={e => setNewRelation({ ...newRelation, relation_type: e.target.value })}
                    className="w-full h-10 border border-[#E2E8F0] bg-white text-[#1E293B] rounded-md px-3">
                    <option value="prerequisite">前置关系</option>
                    <option value="co_occur">共现关系</option>
                    <option value="similar">相似关系</option>
                    <option value="career_path">职业路径</option>
                  </select>
                </div>
                <div><label className="text-[#64748B] text-xs">权重 (0-1)</label><Input type="number" step="0.1" min="0" max="1" value={newRelation.weight} onChange={e => setNewRelation({ ...newRelation, weight: parseFloat(e.target.value) || 0.5 })} /></div>
              </div>
              <div className="flex gap-2 mt-4 justify-end">
                <Button variant="outline" onClick={() => setShowAddRelation(false)}>取消</Button>
                <Button onClick={handleAddRelation} className="bg-blue-600 hover:bg-blue-700 text-white">确认</Button>
              </div>
            </div>
          </div>
        )}

        {/* 批量导入弹窗 */}
        {showImport && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => { setShowImport(false); setImportResult(null); }}>
            <div className="bg-white p-6 rounded-xl w-[520px] border border-[#E2E8F0] shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="text-[#1E293B] font-medium mb-4">批量导入技能关系</h3>
              <p className="text-[#64748B] text-xs mb-2">
                CSV格式：每行一条，字段用逗号分隔：源技能,目标技能,关系类型(prerequisite/co_occur/similar/career_path),权重
              </p>
              <textarea
                value={csvText} onChange={e => setCsvText(e.target.value)}
                placeholder={"Java,Spring Boot,prerequisite,0.9\nPython,Django,co_occur,0.7\nReact,Vue,similar,0.8"}
                className="w-full h-40 border border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] text-xs rounded-lg p-3 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {importResult && (
                <div className="mt-2 p-2 rounded-lg bg-[#F8FAFC] text-xs text-[#1E293B] border border-[#E2E8F0]">
                  导入完成：成功 {importResult.inserted} 条，失败 {importResult.errors} 条，共 {importResult.total} 条
                </div>
              )}
              <div className="flex gap-2 mt-4 justify-end">
                <Button variant="outline" onClick={() => { setShowImport(false); setImportResult(null); }}>关闭</Button>
                <Button onClick={handleBulkImport} className="bg-blue-600 hover:bg-blue-700 text-white">导入</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 右侧可视化面板 */}
      <div className="w-[540px] flex-shrink-0 space-y-4">
        <Card className="bg-white border-[#E2E8F0] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#1E293B]">技能关系图预览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-3">
              <Input placeholder="输入技能名称..." value={graphSkill} onChange={e => setGraphSkill(e.target.value)}
                className="flex-1 h-8 text-xs"
                onKeyDown={e => { if (e.key === 'Enter') fetchGraph(); }} />
              <Button size="sm" onClick={fetchGraph} className="bg-blue-600 hover:bg-blue-700 text-white text-xs">查看</Button>
            </div>

            {/* 图例 */}
            <div className="flex flex-wrap gap-3 mb-3 text-xs">
              {Object.entries(RELATION_CONFIG).map(([key, cfg]) => (
                <span key={key} className="flex items-center gap-1">
                  <span className="w-4 h-0.5 inline-block" style={{ backgroundColor: cfg.color, borderStyle: cfg.lineStyle ? 'dashed' : 'solid' }} />
                  <span className="text-[#64748B]">{cfg.label}</span>
                </span>
              ))}
            </div>

            {showGraph ? (
              renderForceGraph()
            ) : (
              <div className="h-[400px] flex items-center justify-center text-[#64748B] text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC]">
                输入技能名称查看关系图
              </div>
            )}

            {showGraph && graphEdges.length > 0 && (
              <div className="mt-3 text-xs text-[#64748B]">
                找到 {graphNodes.length} 个节点、{graphEdges.length} 条关系
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
