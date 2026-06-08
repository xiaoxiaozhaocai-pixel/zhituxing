'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Heart, Trash2, Loader2, Briefcase, MapPin, DollarSign } from 'lucide-react';

interface Favorite {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string | null;
  industry?: string | null;
  company_type?: string | null;
  salary: string | null;
  location: string | null;
  source: string | null;
  createdAt: string;
}

export default function FavoritesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
// eslint-disable-next-line
      fetchFavorites();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/favorites', {
        headers: { 'x-user-id': user!.id }
      });
      const data = await res.json();

      if (data.success) {
        setFavorites(data.data || []);
      }
    } catch (error) {
      console.error('获取收藏失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);

    try {
      const res = await fetch(`/api/favorites/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user!.id }
      });

      const data = await res.json();

      if (data.success) {
        setFavorites(favorites.filter(f => f.id !== id));
      }
    } catch (error) {
      console.error('删除收藏失败:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">请先登录查看收藏</p>
          <a
            href="/auth"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            登录
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">我的收藏</h1>
          <span className="text-gray-500">{favorites.length} 个岗位</span>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="w-24 h-24 bg-gradient-to-br from-red-50 to-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Heart className="w-12 h-12 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">还没有收藏任何岗位</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              收藏感兴趣的岗位，方便随时查看对比，找到最适合你的工作
            </p>
            <a
              href="/jobs"
              className="inline-flex items-center px-8 py-3 bg-gradient-to-r from-[#165DFF] to-[#4080FF] text-white rounded-xl hover:from-[#165DFF]/90 hover:to-[#4080FF]/90 font-medium shadow-lg shadow-blue-500/20 transition-all"
            >
              <Briefcase className="w-5 h-5 mr-2" />
              去岗位百科看看
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {favorites.map((favorite) => (
              <div
                key={favorite.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-900">{favorite.jobTitle}</h3>
                    </div>

                    {(() => {
                      const fallback = [favorite.industry, favorite.company_type].filter(Boolean).join(' · ');
                      const display = favorite.company || fallback;
                      return display ? (
                        <p className="text-gray-600 mb-2">{display}</p>
                      ) : null;
                    })()}

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      {favorite.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {favorite.location}
                        </span>
                      )}
                      {favorite.salary && (
                        <span className="flex items-center gap-1 text-orange-600 font-medium">
                          <DollarSign className="w-4 h-4" />
                          {favorite.salary}
                        </span>
                      )}
                      <span className="text-gray-400">
                        收藏于 {formatTime(favorite.createdAt)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(favorite.id)}
                    disabled={deletingId === favorite.id}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="取消收藏"
                  >
                    {deletingId === favorite.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
