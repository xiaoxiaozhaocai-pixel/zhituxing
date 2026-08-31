'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AnalysisLevel,
  AnswerBucket,
  CompanyCard,
  IndustryMapPayload,
  PassStatus,
  PositionAggregate,
} from '@/lib/industry-map/types';
import ChinaMap from '@/components/industry-map/ChinaMap';
import {
  Search,
  Map as MapIcon,
  List as ListIcon,
  Building2,
  MapPin,
  Filter,
  X,
  ChevronRight,
  BarChart3,
  Info,
  Target,
  Layers,
  TrendingUp,
  FileText,
} from 'lucide-react';

const LEVEL_LABEL: Record<AnalysisLevel, string> = { 1: '初步', 2: '基础', 3: '深入', 4: '深度' };

const PASS_STATUS_LABEL: Record<PassStatus, string> = {
  pass: '通过 / 获下一轮',
  pending: '待反馈',
  mismatch: '简历不匹配',
  na: '未明确',
};

const PASS_STATUS_STYLE: Record<PassStatus, string> = {
  pass: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  pending: 'bg-amber-50 text-amber-600 border-amber-100',
  mismatch: 'bg-red-50 text-red-500 border-red-100',
  na: 'bg-gray-50 text-gray-500 border-gray-100',
};

const BUCKET_COLOR: Record<AnswerBucket['label'], string> = {
  表现强: '#165DFF',
  中等: '#3D7FFF',
  待打磨: '#B9C7DD',
};

const BUCKET_HINT: Record<AnswerBucket['label'], string> = {
  表现强: '思路清晰、有支撑',
  中等: '要点具备、缺展开',
  待打磨: '结构不清、需补强',
};

type View = 'map' | 'list';

interface Filters {
  industries: string[];
  cities: string[];
}

type Suggestion =
  | { kind: 'company'; label: string; sub: string; companyId: string }
  | { kind: 'position'; label: string; sub: string; companyId: string }
  | { kind: 'industry'; label: string; sub: string }
  | { kind: 'city'; label: string; sub: string };

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, '');
}

function matchesCompany(c: CompanyCard, q: string): boolean {
  if (!q) return true;
  const n = normalize(q);
  const haystack = normalize(
    [c.name, c.fullName, c.industry, c.city, c.province, ...c.positions, ...c.tags].join(' '),
  );
  return haystack.includes(n);
}

function buildSuggestions(companies: CompanyCard[], q: string, limit = 12): Suggestion[] {
  if (!q) return [];
  const n = normalize(q);
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (s: Suggestion) => {
    const key = `${s.kind}:${s.label}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  };
  for (const c of companies) {
    if (normalize(c.name).includes(n) || normalize(c.fullName).includes(n)) {
      push({ kind: 'company', label: c.name, sub: `${c.industry} · ${c.city}`, companyId: c.id });
    }
    for (const p of c.positions) {
      if (normalize(p).includes(n)) {
        push({ kind: 'position', label: p, sub: c.name, companyId: c.id });
      }
    }
    if (normalize(c.industry).includes(n)) {
      push({ kind: 'industry', label: c.industry, sub: '按行业筛选' });
    }
    if (normalize(c.city).includes(n)) {
      push({ kind: 'city', label: c.city, sub: '按城市筛选' });
    }
  }
  return out.slice(0, limit);
}

export default function IndustryMapClient({ initialData }: { initialData?: IndustryMapPayload }) {
  const [data, setData] = useState<IndustryMapPayload | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [view, setView] = useState<View>('map');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({ industries: [], cities: [] });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData) return;
    let alive = true;
    fetch('/api/industry-map')
      .then((r) => {
        if (!r.ok) throw new Error(`接口返回 ${r.status}`);
        return r.json();
      })
      .then((json: IndustryMapPayload) => {
        if (alive) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((e: Error) => {
        if (alive) {
          setError(e.message || '数据加载失败');
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [initialData]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const companies = data?.companies ?? [];
  const positions = data?.positions ?? [];
  const meta = data?.meta;

  const allIndustries = useMemo(() => {
    const set = new Set<string>();
    for (const c of companies) set.add(c.industry);
    return Array.from(set);
  }, [companies]);

  const allCities = useMemo(() => {
    const set = new Set<string>();
    for (const c of companies) set.add(c.city);
    return Array.from(set);
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchQ = matchesCompany(c, query);
      const matchIndustry = filters.industries.length === 0 || filters.industries.includes(c.industry);
      const matchCity = filters.cities.length === 0 || filters.cities.includes(c.city);
      return matchQ && matchIndustry && matchCity;
    });
  }, [companies, query, filters]);

  const suggestions = useMemo(() => buildSuggestions(companies, query), [companies, query]);

  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) return null;
    return companies.find((c) => c.id === selectedCompanyId) ?? null;
  }, [companies, selectedCompanyId]);

  const selectedPositionAgg = useMemo<PositionAggregate[]>(() => {
    if (!selectedCompanyId) return [];
    return (data?.positions ?? []).filter((p) => p.companyId === selectedCompanyId);
  }, [data, selectedCompanyId]);

  const activeFilterCount = filters.industries.length + filters.cities.length;

  function toggleIndustry(industry: string) {
    setFilters((f) => {
      const has = f.industries.includes(industry);
      return {
        ...f,
        industries: has ? f.industries.filter((x) => x !== industry) : [...f.industries, industry],
      };
    });
  }

  function toggleCity(city: string) {
    setFilters((f) => {
      const has = f.cities.includes(city);
      return { ...f, cities: has ? f.cities.filter((x) => x !== city) : [...f.cities, city] };
    });
  }

  function clearFilters() {
    setFilters({ industries: [], cities: [] });
    setQuery('');
  }

  function openCompany(id: string, position?: string) {
    setSelectedCompanyId(id);
    setSelectedPosition(position ?? null);
    setShowSuggest(false);
  }

  function applySuggestion(s: Suggestion) {
    if (s.kind === 'company') {
      setQuery(s.label);
      openCompany(s.companyId);
      setView('map');
    } else if (s.kind === 'position') {
      setQuery(s.label);
      openCompany(s.companyId, s.label);
      setView('map');
    } else if (s.kind === 'industry') {
      toggleIndustry(s.label);
      setQuery('');
      setShowSuggest(false);
      setView('list');
    } else if (s.kind === 'city') {
      toggleCity(s.label);
      setQuery('');
      setShowSuggest(false);
      setView('list');
    }
  }

function renderSuggestionIcon(kind: Suggestion['kind']) {
  const cls = 'h-4 w-4 shrink-0';
  if (kind === 'company') return <Building2 className={cls + ' text-[#165DFF]'} />;
  if (kind === 'position') return <Target className={cls + ' text-[#3D7FFF]'} />;
  if (kind === 'industry') return <Layers className={cls + ' text-[#FF7D00]'} />;
  return <MapPin className={cls + ' text-[#FF7D00]'} />;
}

function onSearchKeyDown(
  e: React.KeyboardEvent<HTMLInputElement>,
  suggestions: Suggestion[],
  focusedIndex: number,
  setFocusedIndex: (fn: (i: number) => number) => void,
  setShowSuggest: (b: boolean) => void,
  applySuggestion: (s: Suggestion) => void,
) {
  if (e.key === 'Enter') {
    if (suggestions.length) applySuggestion(suggestions[Math.min(focusedIndex, suggestions.length - 1)]);
    else setShowSuggest(false);
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    setFocusedIndex((i) => (i + 1) % Math.max(suggestions.length, 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setFocusedIndex((i) => (i - 1 + Math.max(suggestions.length, 1)) % Math.max(suggestions.length, 1));
  } else if (e.key === 'Escape') {
    setShowSuggest(false);
  }
}

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#165DFF] border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">正在加载全国行业面试情报…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center shadow-sm">
          <Info className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-3 text-base font-medium text-gray-900">数据加载失败</p>
          <p className="mt-1 text-sm text-gray-500">{error ?? '暂无数据'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-xl bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] px-5 py-2 text-sm font-medium text-white shadow-sm"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] text-white">
                  <MapIcon className="h-4 w-4" />
                </span>
                <h1 className="text-2xl font-bold text-gray-900">行业地图</h1>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                全国公司与岗位面试情报（聚合脱敏）—— 数据来自真实面经归档，守四真不编造。
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-gray-600">
              <BarChart3 className="h-4 w-4 text-[#165DFF]" />
              <span>
                样本 {meta?.totalInterviews ?? 0} 场 · 公司 {meta?.totalCompanies ?? 0} 家
              </span>
            </div>
          </div>
          {meta?.sampleNote && (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2 text-xs leading-relaxed text-gray-600">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#FF7D00]" />
              <span>{meta.sampleNote}</span>
            </div>
          )}
        </div>
      </header>

      {/* 搜索栏 */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div ref={searchRef} className="relative">
          <div className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-1.5 shadow-sm focus-within:border-[#165DFF] focus-within:ring-2 focus-within:ring-[#165DFF]/20">
            <Search className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIndex(0);
                setShowSuggest(e.target.value.trim().length > 0);
              }}
              onFocus={() => setShowSuggest(true)}
              onKeyDown={(e) => onSearchKeyDown(e, suggestions, focusedIndex, setFocusedIndex, setShowSuggest, applySuggestion)}
              placeholder="搜索公司 / 岗位 / 行业 / 城市，例如「东恒」「招聘」「新能源」「深圳」"
              className="h-11 w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              aria-label="行业地图全局搜索"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('');
                  setShowSuggest(false);
                }}
                className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="清空搜索"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {showSuggest && suggestions.length > 0 && (
            <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-lg">
              <ul className="max-h-80 overflow-auto py-1">
                {suggestions.map((s, i) => (
                  <li key={`${s.kind}-${s.label}`}>
                    <button
                      onMouseEnter={() => setFocusedIndex(i)}
                      onClick={() => applySuggestion(s)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        i === focusedIndex ? 'bg-blue-50' : 'hover:bg-blue-50/50'
                      }`}
                    >
                      {renderSuggestionIcon(s.kind)}
                      <span className="flex-1 truncate">
                        <span className="font-medium text-gray-900">{s.label}</span>
                        <span className="ml-2 text-xs text-gray-400">{s.sub}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-400">
                回车快速跳转 · 上下键选择
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 工具栏：视图切换 + 筛选 */}
      <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl border border-blue-100 bg-white p-1">
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                view === 'map' ? 'bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MapIcon className="h-4 w-4" />
              地图
            </button>
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                view === 'list' ? 'bg-gradient-to-r from-[#165DFF] to-[#3D7FFF] text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ListIcon className="h-4 w-4" />
              列表
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium text-[#165DFF] hover:bg-blue-50"
              >
                <X className="h-3.5 w-3.5" />
                清空筛选
              </button>
            )}
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
                filterOpen || activeFilterCount > 0
                  ? 'border-[#165DFF]/30 bg-[#165DFF]/5 text-[#165DFF]'
                  : 'border-blue-100 bg-white text-gray-600 hover:border-blue-200'
              }`}
            >
              <Filter className="h-4 w-4" />
              筛选
              {activeFilterCount > 0 && (
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#165DFF] text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {filterOpen && (
          <div className="mt-3 grid grid-cols-1 gap-4 rounded-2xl border border-blue-100 bg-white p-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold text-gray-500">按行业</div>
              <div className="flex flex-wrap gap-2">
                {allIndustries.map((ind) => {
                  const active = filters.industries.includes(ind);
                  return (
                    <button
                      key={ind}
                      onClick={() => toggleIndustry(ind)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        active ? 'border-[#165DFF] bg-[#165DFF] text-white' : 'border-gray-200 text-gray-600 hover:border-[#165DFF]/40'
                      }`}
                    >
                      {ind}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold text-gray-500">按城市</div>
              <div className="flex flex-wrap gap-2">
                {allCities.map((city) => {
                  const active = filters.cities.includes(city);
                  return (
                    <button
                      key={city}
                      onClick={() => toggleCity(city)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                        active ? 'border-[#FF7D00] bg-[#FF7D00] text-white' : 'border-gray-200 text-gray-600 hover:border-[#FF7D00]/40'
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 结果数量 */}
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6">
        <p className="text-xs text-gray-400">
          共 {filteredCompanies.length} 家匹配 {query ? `「${query}」` : ''}
        </p>
      </div>

      {/* 内容区 */}
      <div className="mx-auto max-w-7xl px-4 pt-4 pb-10 sm:px-6">
        {view === 'map' ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* 地图卡片 */}
            <div className="rounded-2xl border border-blue-100 bg-white p-3 shadow-sm lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <MapPin className="h-4 w-4 text-[#165DFF]" />
                  全国公司分布
                </div>
                <div className="flex items-center gap-3 text-[11px] text-gray-400">
                  <span>滚轮缩放</span>
                  <span>拖拽平移</span>
                  <span>点击标记查看</span>
                </div>
              </div>
              <div className="h-[480px] overflow-hidden rounded-xl bg-[#F6F9FF] sm:h-[560px]">
                <ChinaMap
                  companies={filteredCompanies}
                  onSelectCompany={(c) => openCompany(c.id)}
                  selectedCompanyId={selectedCompanyId}
                />
              </div>
              {/* 图例 */}
              <div className="mt-2 flex flex-wrap items-center gap-4 px-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-[#165DFF]" /> 基础情报
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full bg-[#FF7D00]" /> 深入分析
                </span>
                <span>点数代表该省区面经数（当前为 MVP 初始原型）</span>
              </div>
            </div>

            {/* 侧边面板 */}
            <div className="lg:col-span-1">
              {selectedCompany ? (
                <CompanyDetailPanel
                  company={selectedCompany}
                  positions={selectedPositionAgg}
                  activePosition={selectedPosition}
                  onSetPosition={setSelectedPosition}
                />
              ) : (
                <ProvinceSummaryPanel
                  companies={filteredCompanies}
                  onOpenCompany={(c) => openCompany(c.id)}
                  onSwitchList={() => setView('list')}
                />
              )}
            </div>
          </div>
        ) : (
          <ListPanel
            companies={filteredCompanies}
            onOpenCompany={(c) => openCompany(c.id)}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================
 * 公司详情面板
 * ============================================================ */
function CompanyDetailPanel({
  company,
  positions,
  activePosition,
  onSetPosition,
}: {
  company: CompanyCard;
  positions: PositionAggregate[];
  activePosition: string | null;
  onSetPosition: (p: string | null) => void;
}) {
  const activePos = positions.find((p) => p.position === activePosition) ?? positions[0];
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#165DFF]" />
            <h2 className="text-lg font-bold text-gray-900">{company.name}</h2>
          </div>
          <p className="mt-1 text-xs text-gray-400">{company.fullName}</p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${PASS_STATUS_STYLE[company.passStatus]}`}
        >
          {PASS_STATUS_LABEL[company.passStatus]}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-[#FF7D00]" />
          {company.industry}
        </span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-[#165DFF]" />
          {company.city} · {company.province}
        </span>
        <span className="text-gray-300">|</span>
        <span className="flex items-center gap-1">
          <BarChart3 className="h-3.5 w-3.5 text-[#3D7FFF]" />
          分析程度：{LEVEL_LABEL[company.analysisLevel]}
        </span>
      </div>

      {company.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {company.tags.map((t) => (
            <span key={t} className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] text-[#165DFF]">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-blue-50 bg-blue-50/40 p-3 text-sm leading-relaxed text-gray-700">
        {company.resultSummary}
      </div>

      {/* 岗位选择 */}
      {positions.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold text-gray-500">岗位</div>
          <div className="flex flex-wrap gap-2">
            {positions.map((p) => (
              <button
                key={p.position}
                onClick={() => onSetPosition(p.position)}
                className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                  activePos?.position === p.position
                    ? 'border-[#165DFF] bg-[#165DFF] text-white'
                    : 'border-gray-200 text-gray-600 hover:border-[#165DFF]/40'
                }`}
              >
                {p.position}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 岗位聚合详情 */}
      {activePos && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-gray-600">答题水平分布</span>
              <span className="text-gray-400">
                样本 {activePos.interviewCount} 场
              </span>
            </div>
            {activePos.answerLevelDistribution.length > 0 ? (
              <DistributionBar dist={activePos.answerLevelDistribution} />
            ) : (
              <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-400">{activePos.note}</p>
            )}
          </div>

          <div>
            <div className="mb-1.5 text-xs font-semibold text-gray-600">高频问题</div>
            <ul className="space-y-1.5">
              {activePos.questions.map((q, i) => (
                <li key={q} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-bold text-[#165DFF]">
                    {i + 1}
                  </span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <TrendingUp className="h-3.5 w-3.5" />
            通过趋势：
            {activePos.passTrend === 'na' ? '单样本暂无趋势（待数据积累）' : activePos.passTrend}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-blue-50 pt-3">
        <div className="flex items-start gap-1.5 text-[11px] leading-relaxed text-gray-400">
          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            数据来源：{company.source} · 场次 {company.interviewIds.join('、')}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * 答题水平分布条
 * ============================================================ */
function DistributionBar({ dist }: { dist: AnswerBucket[] }) {
  const total = dist.reduce((s, d) => s + d.count, 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        {dist.map((d) => (
          <div
            key={d.label}
            style={{ width: `${(d.count / total) * 100}%`, backgroundColor: BUCKET_COLOR[d.label] }}
            className="transition-all duration-500"
            title={`${d.label}：${d.count} 题`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {dist.map((d) => (
          <div key={d.label} className="flex items-center gap-1.5 text-xs">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: BUCKET_COLOR[d.label] }} />
            <span className="text-gray-600">{d.label}</span>
            <span className="font-semibold text-gray-800">{d.count}</span>
            <span className="text-gray-400">· {BUCKET_HINT[d.label]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * 侧边默认：省份汇总
 * ============================================================ */
function ProvinceSummaryPanel({
  companies,
  onOpenCompany,
  onSwitchList,
}: {
  companies: CompanyCard[];
  onOpenCompany: (c: CompanyCard) => void;
  onSwitchList: () => void;
}) {
  const byProvince = useMemo(() => {
    const map = new Map<string, CompanyCard[]>();
    for (const c of companies) {
      const list = map.get(c.province) ?? [];
      list.push(c);
      map.set(c.province, list);
    }
    return map;
  }, [companies]);

  const ordered = useMemo(() => {
    return Array.from(byProvince.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [byProvince]);

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">省区分布</h2>
        <button onClick={onSwitchList} className="flex items-center gap-1 text-xs text-[#165DFF] hover:underline">
          切到列表
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="mt-1 text-xs text-gray-400">点击地图标记或下方公司查看详情</p>
      <div className="mt-3 space-y-4">
        {ordered.map(([province, list]) => (
          <div key={province}>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500">{province}</span>
              <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] text-[#165DFF]">
                {list.length} 家
              </span>
            </div>
            <div className="space-y-1.5">
              {list.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onOpenCompany(c)}
                  className="flex w-full items-center gap-2 rounded-xl border border-blue-50 bg-white px-3 py-2 text-left transition-colors hover:border-[#165DFF]/40 hover:bg-blue-50/40"
                >
                  <Building2 className="h-4 w-4 shrink-0 text-[#165DFF]" />
                  <span className="flex-1 truncate text-sm font-medium text-gray-800">{c.name}</span>
                  <span className="shrink-0 text-[11px] text-gray-400">{c.interviewCount} 场</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * 列表视图
 * ============================================================ */
function ListPanel({
  companies,
  onOpenCompany,
}: {
  companies: CompanyCard[];
  onOpenCompany: (c: CompanyCard) => void;
}) {
  const byProvince = useMemo(() => {
    const map = new Map<string, CompanyCard[]>();
    for (const c of companies) {
      const list = map.get(c.province) ?? [];
      list.push(c);
      map.set(c.province, list);
    }
    return map;
  }, [companies]);

  const ordered = useMemo(() => {
    return Array.from(byProvince.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [byProvince]);

  if (ordered.length === 0) {
    return (
      <div className="rounded-2xl border border-blue-100 bg-white p-10 text-center text-sm text-gray-400">
        暂无匹配的公司，试试清空搜索或筛选。
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {ordered.map(([province, list]) => (
        <section key={province}>
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#165DFF]" />
            <h2 className="text-base font-semibold text-gray-800">{province}</h2>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-[#165DFF]">{list.length} 家</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <button
                key={c.id}
                onClick={() => onOpenCompany(c)}
                className="group rounded-2xl border border-blue-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#165DFF]/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#165DFF] to-[#3D7FFF] text-white">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                      <div className="text-[11px] text-gray-400">{c.city}</div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${PASS_STATUS_STYLE[c.passStatus]}`}
                  >
                    {PASS_STATUS_LABEL[c.passStatus]}
                  </span>
                </div>
                <div className="mt-3 truncate text-xs text-gray-500">{c.industry}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.tags.slice(0, 3).map((t) => (
                    <span key={t} className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] text-[#165DFF]">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 text-[11px] text-gray-400">
                  <span>{c.interviewCount} 场 · 分析{LEVEL_LABEL[c.analysisLevel]}</span>
                  <span className="flex items-center gap-0.5 text-[#165DFF] opacity-0 transition-opacity group-hover:opacity-100">
                    查看
                    <ChevronRight className="h-3 w-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
