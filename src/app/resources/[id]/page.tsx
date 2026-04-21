'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Eye, Loader2, Tag } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  views: number;
  author: string | null;
  source: string | null;
  createdAt: string;
}

const categoryLabels: Record<string, string> = {
  'resume': '简历指南',
  'interview': '面试技巧',
  'career': '职业规划',
  'industry': '行业洞察',
  'tips': '求职干货'
};

export default function ArticleDetailPage() {
  const params = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${params.id}`);
        const data = await res.json();

        if (data.success) {
          setArticle(data.data);
        } else {
          setError(data.error || '文章不存在');
        }
      } catch (err) {
        console.error('获取文章失败:', err);
        setError('加载失败');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchArticle();
    }
  }, [params.id]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">文章不存在</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <Link
            href="/resources"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            返回列表
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </Link>
        </div>
      </div>

      {/* Article Content */}
      <article className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Cover Image */}
          {article.coverImage && (
            <div className="aspect-video bg-gray-100">
              <img
                src={article.coverImage}
                alt={article.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-8">
            {/* Category & Tags */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                {categoryLabels[article.category] || article.category}
              </span>
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-sm rounded-full"
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {article.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b">
              {article.author && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {article.author}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(article.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {article.views} 阅读
              </span>
            </div>

            {/* Summary */}
            {article.summary && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 my-6">
                <p className="text-blue-800">{article.summary}</p>
              </div>
            )}

            {/* Content */}
            <div
              className="prose prose-blue max-w-none mt-6"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {/* Source */}
            {article.source && (
              <div className="mt-8 pt-6 border-t text-sm text-gray-500">
                <span>来源：{article.source}</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/resources"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            查看更多干货
          </Link>
        </div>
      </article>
    </div>
  );
}
