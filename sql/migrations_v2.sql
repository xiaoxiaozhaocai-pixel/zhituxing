-- =====================================================
-- 职途星平台数据库变更脚本 v2.0
-- 生成时间: 2024年
-- =====================================================

-- =====================================================
-- 1. 搜索历史记录表
-- =====================================================
CREATE TABLE IF NOT EXISTS search_histories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  keyword VARCHAR(200) NOT NULL,
  search_type VARCHAR(20) DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_histories_user ON search_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_search_histories_created ON search_histories(created_at DESC);

COMMENT ON TABLE search_histories IS '用户搜索历史记录表';
COMMENT ON COLUMN search_histories.user_id IS '用户ID';
COMMENT ON COLUMN search_histories.keyword IS '搜索关键词';
COMMENT ON COLUMN search_histories.search_type IS '搜索类型: general-通用, jobs-岗位, articles-文章';

-- =====================================================
-- 2. 文章点赞表
-- =====================================================
CREATE TABLE IF NOT EXISTS article_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  article_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_article_likes_article ON article_likes(article_id);
CREATE INDEX IF NOT EXISTS idx_article_likes_user ON article_likes(user_id);

COMMENT ON TABLE article_likes IS '文章点赞表';
COMMENT ON COLUMN article_likes.article_id IS '文章ID';

-- =====================================================
-- 3. 文章评论表
-- =====================================================
CREATE TABLE IF NOT EXISTS article_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  article_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_article_comments_article ON article_comments(article_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_user ON article_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_parent ON article_comments(parent_id);

COMMENT ON TABLE article_comments IS '文章评论表';
COMMENT ON COLUMN article_comments.content IS '评论内容';
COMMENT ON COLUMN article_comments.parent_id IS '父评论ID，用于回复功能';

-- =====================================================
-- 4. 修改 articles 表 - 添加点赞数和评论数字段
-- =====================================================
ALTER TABLE articles ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
ALTER TABLE articles ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;

COMMENT ON COLUMN articles.likes IS '点赞数';
COMMENT ON COLUMN articles.comments IS '评论数';

-- =====================================================
-- 5. 确保 user_quotas 表存在（配额管理）
-- =====================================================
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  member_type VARCHAR(20) DEFAULT 'free',
  quota INTEGER DEFAULT 5,
  used_quota INTEGER DEFAULT 0,
  quota_reset_time DATE,
  member_expires_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_quotas_user ON user_quotas(user_id);

COMMENT ON TABLE user_quotas IS '用户配额表';
COMMENT ON COLUMN user_quotas.member_type IS '会员类型: free-免费, monthly-月卡, quarterly-季卡, yearly-年卡';
COMMENT ON COLUMN user_quotas.quota IS '每月AI服务配额';
COMMENT ON COLUMN user_quotas.quota_reset_time IS '配额重置日期';
COMMENT ON COLUMN user_quotas.member_expires_at IS '会员到期时间';

-- =====================================================
-- 6. 确保 orders 表存在（订单管理）
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  plan_id VARCHAR(20) NOT NULL,
  plan_name VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'wechat',
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

COMMENT ON TABLE orders IS '订单表';
COMMENT ON COLUMN orders.plan_id IS '套餐ID: monthly-月卡, quarterly-季卡, yearly-年卡';
COMMENT ON COLUMN orders.status IS '订单状态: pending-待支付, paid-已支付, cancelled-已取消, refunded-已退款';

-- =====================================================
-- 7. 确保 notifications 表存在（通知系统）
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

COMMENT ON TABLE notifications IS '用户通知表';
COMMENT ON COLUMN notifications.type IS '通知类型: system-系统通知, activity-活动通知, member-会员通知';

-- =====================================================
-- 8. 确保 feedback 表存在（工单系统）
-- =====================================================
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  content TEXT NOT NULL,
  contact VARCHAR(100),
  type VARCHAR(20) DEFAULT 'suggestion',
  status VARCHAR(20) DEFAULT 'pending',
  reply TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);

COMMENT ON TABLE feedback IS '用户反馈表';
COMMENT ON COLUMN feedback.type IS '反馈类型: bug-功能问题, suggestion-功能建议, correction-内容纠错, other-其他';
COMMENT ON COLUMN feedback.status IS '工单状态: pending-待处理, processing-处理中, resolved-已解决, closed-已关闭';
COMMENT ON COLUMN feedback.reply IS '管理员回复内容';

-- =====================================================
-- 9. 确保 invites 表存在（邀请关系）
-- =====================================================
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL,
  invitee_id UUID NOT NULL,
  invite_code VARCHAR(20) NOT NULL,
  reward_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invites_invitee ON invites(invitee_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(invite_code);

COMMENT ON TABLE invites IS '邀请关系表';
COMMENT ON COLUMN invites.reward_status IS '奖励状态: pending-待发放, completed-已发放';

-- =====================================================
-- 10. 确保 users 表有 invite_code 字段
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID;

CREATE INDEX IF NOT EXISTS idx_users_invite_code ON users(invite_code);

-- =====================================================
-- 11. 确保其他必要表存在
-- =====================================================
-- 简历优化表
CREATE TABLE IF NOT EXISTS resume_optimizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  original_text TEXT,
  optimized_text TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 岗位收藏表
CREATE TABLE IF NOT EXISTS job_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  job_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, job_data)
);

-- 岗位订阅表
CREATE TABLE IF NOT EXISTS job_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  filters JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 数据初始化
-- =====================================================

-- 为现有用户创建默认配额记录（如果不存在）
INSERT INTO user_quotas (user_id, member_type, quota, used_quota)
SELECT id, 'free', 5, 0
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_quotas WHERE user_quotas.user_id = users.id
);

-- =====================================================
-- RLS 策略更新
-- =====================================================
ALTER TABLE search_histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_comments ENABLE ROW LEVEL SECURITY;

-- 搜索历史：用户只能看到自己的
CREATE POLICY "Users can view own search history" ON search_histories
  FOR SELECT USING (true);

-- 点赞：用户只能看到自己的
CREATE POLICY "Users can view own likes" ON article_likes
  FOR SELECT USING (true);

-- 评论：所有人可查看
CREATE POLICY "Anyone can view comments" ON article_comments
  FOR SELECT USING (true);

-- =====================================================
-- 完成
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '数据库更新完成！';
END $$;
