'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Heart, Trash2, Loader2, Briefcase, MapPin, DollarSign } from 'lucide-react';

interface Favorite {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string | null;
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
      fetchFavorites();
    }
  }, [isAuthenticated]);

  const fetchFavorites = async () => {
    try {
      const res = await fetch('/api/favorites', {
        headers: { 'x-user-id': user!.id }
      });
      const data = await res.json();

      if (data.success) {
        setFavorites(data.data.favorites);
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
          <div className="text-center py-16 bg-white rounded-xl">
            <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">还没有收藏任何岗位</p>
            <a
              href="/jobs"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              去逛逛
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

                    {favorite.company && (
                      <p className="text-gray-600 mb-2">{favorite.company}</p>
                    )}

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
