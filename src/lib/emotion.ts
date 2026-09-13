/**
 * 小职共情式表情引擎（前端关键词方案）
 *
 * 设计理念：小职不演自己，而是共情用户——
 * 用户说"拿到offer了"→ 小职星星眼庆祝（joy）
 * 用户说"被拒了"→ 小职嚎啕大哭（sad）
 * 用户说"气死我了"→ 小职蘑菇云炸毛（angry）
 * 未命中 → 保持默认头像（不渲染贴图，避免每条消息都是大图）
 *
 * 素材：public/avatars/emotions/{emotion}.webp（512px 透明底 WebP）
 */

export type Emotion = 'joy' | 'happy' | 'angry' | 'sad';

/** 情绪 → 贴图路径 */
export const EMOTION_IMAGES: Record<Emotion, string> = {
  joy: '/avatars/emotions/joy.webp',
  happy: '/avatars/emotions/happy.webp',
  angry: '/avatars/emotions/angry.webp',
  sad: '/avatars/emotions/sad.webp',
};

/** 触发词按优先级排列：大喜事 > 愤怒 > 委屈 > 开心笑 */
const EMOTION_RULES: Array<{ emotion: Emotion; words: string[] }> = [
  {
    emotion: 'joy',
    words: [
      'offer', '录取', '录用', '上岸', '签约', '三方', '转正',
      '恭喜', '通过啦', '过啦', '拿下了', '接好运', '报喜',
      '面试邀约', '笔试通过', '进面', '二面通知',
    ],
  },
  {
    emotion: 'angry',
    words: [
      '气死', '烦死', '离谱', '恶心', '过分', '白嫖', '坑我',
      '火大', '受不了', '无语死', '忍无可忍', '套路我', '骗我',
      '画大饼', '画饼', '被怼', '被骂', '什么破', '什么垃圾',
    ],
  },
  {
    emotion: 'sad',
    words: [
      '拒信', '被拒', '挂了', '没过', '凉了', '被刷', '被鸽',
      '已读不回', '毁约', '泡汤', 'emo', '难过', '伤心',
      '好想哭', '呜呜', '自闭了', '没戏', '没希望', '崩了',
      '放鸽子', '放我鸽子', '被放鸽子', '失约',
    ],
  },
  {
    emotion: 'happy',
    words: [
      '哈哈', '嘿嘿', '嘻嘻', '笑死', '乐死', '好笑',
      '太逗', '段子', '乐呵', '开心', '高兴', '太棒', '太好了',
    ],
  },
];

/**
 * 从用户消息识别情绪（共情式：小职的情绪跟随用户）
 * 未命中返回 null（保持默认头像）
 */
export function detectEmotion(text: string): Emotion | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const rule of EMOTION_RULES) {
    for (const word of rule.words) {
      if (lower.includes(word.toLowerCase())) return rule.emotion;
    }
  }
  return null;
}
