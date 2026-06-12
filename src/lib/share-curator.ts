/**
 * P2-6: 小职对话「精选片段」算法
 *
 * 策略：
 * 1. 跳过开头的纯寒暄（用户消息 <10 字 + AI 短回复 <50 字）
 * 2. 按"轮"打分（user + assistant 配对为一轮）
 *    - AI 回复长度 ≥ 200 字 → +3
 *    - AI 回复含 markdown 结构（## / | table / ```code``` / - list ≥3 项）→ +2
 *    - 用户提问长度 ≥ 15 字 → +1
 *    - 含关键词（简历/面试/职业/规划/技能/分析/建议/总结） → +1
 * 3. 按分数降序取前 6 轮（最多 12 条消息）
 * 4. 按原顺序输出（保持对话流畅）
 * 5. 总消息数 ≤ 6 → 全保留（不裁剪）
 */

export interface ChatMessage {
  role: string;
  content: string;
}

const HIGH_VALUE_KEYWORDS = [
  '简历', '面试', '职业', '规划', '技能', '岗位', '求职',
  '分析', '建议', '总结', '推荐', '匹配', '能力', '优势',
];

const MARKDOWN_STRUCT_RE = /(^#{1,3}\s)|(^\|.+\|$)|(```[\s\S]+?```)|((\n-\s.+){3,})/m;

function scoreTurn(user: ChatMessage | null, ai: ChatMessage | null): number {
  let score = 0;
  if (ai) {
    const aiLen = (ai.content || '').length;
    if (aiLen >= 200) score += 3;
    else if (aiLen >= 80) score += 1;
    if (MARKDOWN_STRUCT_RE.test(ai.content || '')) score += 2;
  }
  if (user) {
    const userLen = (user.content || '').length;
    if (userLen >= 15) score += 1;
    for (const kw of HIGH_VALUE_KEYWORDS) {
      if ((user.content || '').includes(kw)) {
        score += 1;
        break;
      }
    }
  }
  return score;
}

interface Turn {
  index: number; // 在原 messages 数组中的起始下标
  user: ChatMessage | null;
  ai: ChatMessage | null;
  score: number;
}

/**
 * 把消息序列切成"轮"（user → assistant 配对）
 * 孤立消息（开头的 system 或独立 user/assistant）作为单元素轮
 */
function pairTurns(messages: ChatMessage[]): Turn[] {
  const turns: Turn[] = [];
  let i = 0;
  while (i < messages.length) {
    const cur = messages[i];
    if (cur.role === 'user' && i + 1 < messages.length && messages[i + 1].role === 'assistant') {
      const ai = messages[i + 1];
      turns.push({ index: i, user: cur, ai, score: scoreTurn(cur, ai) });
      i += 2;
    } else {
      // 孤立消息（系统消息、未配对的助手回复等）
      turns.push({
        index: i,
        user: cur.role === 'user' ? cur : null,
        ai: cur.role === 'assistant' ? cur : null,
        score: scoreTurn(cur.role === 'user' ? cur : null, cur.role === 'assistant' ? cur : null),
      });
      i += 1;
    }
  }
  return turns;
}

/**
 * 判断是否为"开头寒暄"轮
 */
function isOpeningChitchat(turn: Turn): boolean {
  const userLen = (turn.user?.content || '').length;
  const aiLen = (turn.ai?.content || '').length;
  return userLen > 0 && userLen < 10 && aiLen > 0 && aiLen < 50;
}

/**
 * 精选对话片段
 * @param messages 原始消息数组
 * @param maxTurns 最多保留轮数（默认 6）
 * @returns 精选后的消息数组（按原顺序）
 */
export function curateMessages(messages: ChatMessage[], maxTurns = 6): ChatMessage[] {
  if (!messages || messages.length === 0) return [];
  // 短对话：全量返回
  if (messages.length <= 6) return messages;

  const turns = pairTurns(messages);

  // 跳过开头连续寒暄
  let startIdx = 0;
  while (startIdx < turns.length && isOpeningChitchat(turns[startIdx])) {
    startIdx++;
  }
  const candidateTurns = turns.slice(startIdx);
  // 如果跳光了，退回原 turns
  const pool = candidateTurns.length > 0 ? candidateTurns : turns;

  // 按分数降序取 top N
  const sortedByScore = [...pool].sort((a, b) => b.score - a.score);
  const picked = sortedByScore.slice(0, maxTurns);

  // 按原顺序输出
  picked.sort((a, b) => a.index - b.index);

  const result: ChatMessage[] = [];
  for (const t of picked) {
    if (t.user) result.push(t.user);
    if (t.ai) result.push(t.ai);
  }
  return result;
}
