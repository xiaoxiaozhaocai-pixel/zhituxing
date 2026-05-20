'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Loader2, Briefcase, FileText, MapPin, Clock, X, History, Eye, GraduationCap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SearchResult {
  id: string;
  jobTitle?: string;
  title?: string;
  company?: string | null;
  salary?: string | null;
  location?: string | null;
  summary?: string | null;
  category?: string;
  views?: number;
  education?: string | null;
  experience?: string | null;
}

interface SearchHistory {
  id: string;
  keyword: string;
  createdAt: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [inputValue, setInputValue] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'jobs' | 'articles'>('all');
  const [results, setResults] = useState<{ jobs: SearchResult[]; articles: SearchResult[] }>({
    jobs: [],
    articles: []
  });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [histories, setHistories] = useState<SearchHistory[]>([]);
  const [focused, setFocused] = useState(false);

  const performSearch = useCallback(async (q: string, type: 'all' | 'jobs' | 'articles') => {
    if (!q || q.trim().length < 2) return;

    setLoading(true);
    setSearched(true);
    setShowHistory(false);

    // 保存搜索历史
    if (isAuthenticated && user) {
      try {
        await fetch('/api/search/history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            keyword: q.trim(),
            searchType: type
          })
        });
      } catch (error) {
        console.error('保存搜索历史失败:', error);
      }
    }

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`);
      const data = await res.json();

      if (data.success) {
        setResults(data.data);
      }
    } catch (error) {
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // 获取搜索历史
  const fetchHistories = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const res = await fetch('/api/search/history?limit=10');
      const data = await res.json();
      if (data.success) {
        setHistories(data.data.histories || []);
      }
    } catch (error) {
      console.error('获取搜索历史失败:', error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, activeTab);
    }
    fetchHistories();
  }, [initialQuery, activeTab, performSearch, fetchHistories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length < 2) {
      alert('请输入至少2个字符的搜索关键词');
      return;
    }
    setQuery(inputValue);
    setShowHistory(false);
    router.push(`/search?q=${encodeURIComponent(inputValue)}`);
    performSearch(inputValue, activeTab);
  };

  const handleHistoryClick = (keyword: string) => {
    setInputValue(keyword);
    setQuery(keyword);
    setShowHistory(false);
    router.push(`/search?q=${encodeURIComponent(keyword)}`);
    performSearch(keyword, activeTab);
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/search/history/${id}`, { method: 'DELETE' });
      setHistories(histories.filter(h => h.id !== id));
    } catch (error) {
      console.error('删除搜索历史失败:', error);
    }
  };

  const handleTabChange = (tab: 'all' | 'jobs' | 'articles') => {
    setActiveTab(tab);
    if (query) {
      performSearch(query, tab);
    }
  };

  const totalResults = results.jobs.length + results.articles.length;

  const categoryLabels: Record<string, string> = {
    'resume': '简历指南',
    'interview': '面试技巧',
    'career': '职业规划',
    'industry': '行业洞察',
    'tips': '求职干货'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b py-6">
        <div className="max-w-4xl mx-auto px-4">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onFocus={() => {
                    setFocused(true);
                    setShowHistory(true);
                  }}
                  onBlur={() => setFocused(false)}
                  placeholder="搜索岗位、文章..."
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                
                {/* Search History Dropdown */}
                {showHistory && histories.length > 0 && !searched && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-gray-200 shadow-lg z-10 overflow-hidden">
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <History className="w-3 h-3" />
                        搜索历史
                      </p>
                    </div>
                    {histories.map((history) => (
                      <div
                        key={history.id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between group"
                        onClick={() => handleHistoryClick(history.keyword)}
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{history.keyword}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistory(history.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-opacity"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                搜索
              </button>
            </div>
          </form>

          {/* Tabs */}
          <div className="flex gap-4 mt-4 border-b">
            {[
              { id: 'all', label: '全部' },
              { id: 'jobs', label: '岗位' },
              { id: 'articles', label: '文章' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as 'all' | 'jobs' | 'articles')}
                className={`pb-3 px-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : searched ? (
          <>
            {/* Results Summary */}
            <div className="mb-6">
              <p className="text-gray-600">
                {query && <span>关键词 &quot;<strong>{query}</strong>&quot;</span>}
                找到 <strong>{totalResults}</strong> 个结果
              </p>
            </div>

            {/* Jobs Results */}
            {results.jobs.length > 0 && (activeTab === 'all' || activeTab === 'jobs') && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  岗位 ({results.jobs.length})
                </h2>
                <div className="space-y-3">
                  {results.jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{job.jobTitle}</h3>
                        {job.salary && (
                          <span className="text-orange-600 font-bold text-lg">
                            {job.salary}
                          </span>
                        )}
                      </div>
                      {job.company && (
                        <p className="text-gray-600 text-sm mb-2">{job.company}</p>
                      )}
                      {/* 信息标签行：城市 | 学历 | 经验 */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            {job.location}
                          </span>
                        )}
                        {job.education && job.education !== '不限' && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                            {job.education}
                          </span>
                        )}
                        {job.experience && job.experience !== '不限' && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            {job.experience}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Articles Results */}
            {results.articles.length > 0 && (activeTab === 'all' || activeTab === 'articles') && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  文章 ({results.articles.length})
                </h2>
                <div className="space-y-3">
                  {results.articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/resources/${article.id}`}
                      className="block bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{article.title}</h3>
                          <p className="text-gray-500 text-sm mt-1 line-clamp-1">
                            {article.summary}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        {article.category && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            {categoryLabels[article.category] || article.category}
                          </span>
                        )}
                        {article.views !== undefined && (
                          <span className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            {article.views}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* No Results */}
            {totalResults === 0 && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500 mb-4">未找到相关结果</p>
                <p className="text-gray-400 text-sm">
                  试试其他关键词，或浏览我们的分类
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">输入关键词开始搜索</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
