'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Eye, Loader2, Tag, ThumbsUp, MessageSquare, Send, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { sanitizeHtml } from '@/lib/sanitize';
import Image from 'next/image';

// 保底 markdown 渲染（不依赖外部包，避免打包/安装失败）
function renderMarkdown(md: string): string {
  if (!md) return '';
  let html = md.replace(/\r\n/g, '\n');
  // 代码块（先抽出占位，避免内部被其他规则吃掉）
  const codeBlocks: string[] = [];
  html = html.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_m, lang, body) => {
    const safe = body.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    codeBlocks.push('<pre><code class="language-' + (lang || 'text') + '">' + safe + '</code></pre>');
    return '\u0000CB' + (codeBlocks.length - 1) + '\u0000';
  });
  // 标题（H6 -> H1 顺序，避免误吃）
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // 分隔线
  html = html.replace(/^\s*---+\s*$/gm, '<hr/>');
  // 加粗 + 斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)/g, '<em>$1</em>');
  // 行内代码
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // 链接 [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // 列表（无序/有序）
  html = html.replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>(?:\n<li>[\s\S]+?<\/li>)*)/g, '<ul>$1</ul>');
  // 段落（双换行分段，已含块元素不再包 <p>）
  html = html.split(/\n{2,}/).map((p) => {
    const t = p.trim();
    if (!t) return '';
    if (/^<(h[1-6]|ul|ol|pre|blockquote|hr|li|p|div|table)/i.test(t)) return t;
    return '<p>' + t.replace(/\n/g, '<br/>') + '</p>';
  }).join('\n');
  // 还原代码块占位
  html = html.replace(/\u0000CB(\d+)\u0000/g, (_m, i) => codeBlocks[Number(i)] || '');
  return html;
}



interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  coverImage: string | null;
  category: string;
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  author: string | null;
  source: string | null;
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  createdAt: string;
  replies?: Comment[];
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
  const { isAuthenticated } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${params.id}`);
        const data = await res.json();

        if (data.success) {
          setArticle(data.data);
          setLikeCount(data.data.likes || 0);
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

  useEffect(() => {
    if (params.id) {
      fetchComments();
    }
  }, [params.id]);

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/articles/${params.id}/comments`);
      const data = await res.json();
      if (data.success) {
        setComments(data.data.comments || []);
      }
    } catch (err) {
      console.error('获取评论失败:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleLike = async () => {
    if (!isAuthenticated) {
      alert('请先登录后再点赞');
      return;
    }

    setLiking(true);
    try {
      const res = await fetch(`/api/articles/${params.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        setIsLiked(data.data.isLiked);
        setLikeCount(data.data.likeCount);
      }
    } catch (err) {
      console.error('点赞失败:', err);
    } finally {
      setLiking(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      alert('请先登录后再评论');
      return;
    }

    if (!commentContent.trim()) {
      alert('请输入评论内容');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/articles/${params.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent })
      });
      const data = await res.json();
      if (data.success) {
        setCommentContent('');
        fetchComments();
      }
    } catch (err) {
      console.error('发表评论失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!isAuthenticated) {
      alert('请先登录后再回复');
      return;
    }

    if (!replyContent.trim()) {
      alert('请输入回复内容');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/articles/${params.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent, parentId })
      });
      const data = await res.json();
      if (data.success) {
        setReplyContent('');
        setReplyingTo(null);
        fetchComments();
      }
    } catch (err) {
      console.error('回复失败:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return d.toLocaleDateString();
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
              <Image
                src={article.coverImage}
                alt={article.title}
                width={800}
                height={400}
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
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdown(article.content || '')) }}
            />

            {/* Like & Share */}
            <div className="mt-8 pt-6 border-t flex items-center gap-4">
              <Button
                variant={isLiked ? 'default' : 'outline'}
                onClick={handleLike}
                disabled={liking}
                className={isLiked ? 'bg-blue-600' : ''}
              >
                <ThumbsUp className={`w-4 h-4 mr-2 ${isLiked ? 'fill-current' : ''}`} />
                {likeCount} 赞
              </Button>
              <span className="text-gray-500 text-sm">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                {comments.length} 评论
              </span>
            </div>

            {/* Source */}
            {article.source && (
              <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                <span>来源：{article.source}</span>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            评论 ({comments.length})
          </h2>

          {/* Comment Form */}
          <div className="mb-8">
            <Textarea
              placeholder="写下你的评论..."
              rows={4}
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              className="mb-3"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                {submitting ? '发布中...' : '发表评论'}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          {commentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无评论，来发表第一条评论吧
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="border-b pb-6 last:border-b-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      {comment.userAvatar ? (
                        <Image src={comment.userAvatar} alt="用户头像" width={32} height={32} className="rounded-full" unoptimized />
                      ) : (
                        <User className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">{comment.userName}</span>
                        <span className="text-xs text-gray-400">{formatTime(comment.createdAt)}</span>
                      </div>
                      <p className="text-gray-700 mb-2">{comment.content}</p>
                      <button
                        onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                        className="text-sm text-gray-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <Reply className="w-3 h-3" />
                        回复
                      </button>

                      {/* Reply Form */}
                      {replyingTo === comment.id && (
                        <div className="mt-3 pl-4 border-l-2 border-blue-100">
                          <Textarea
                            placeholder={`回复 @${comment.userName}...`}
                            rows={2}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="mb-2"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSubmitReply(comment.id)}
                              disabled={submitting}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              回复
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent('');
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-4 pl-4 space-y-4 border-l-2 border-gray-100">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                                {reply.userAvatar ? (
                                  <Image src={reply.userAvatar} alt="用户头像" width={32} height={32} className="rounded-full" unoptimized />
                                ) : (
                                  <User className="w-4 h-4 text-gray-500" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">{reply.userName}</span>
                                  <span className="text-xs text-gray-400">{formatTime(reply.createdAt)}</span>
                                </div>
                                <p className="text-gray-700 text-sm">{reply.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
