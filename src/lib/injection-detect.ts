/**
 * Prompt注入检测 - 在用户消息发送给LLM之前进行安全过滤
 * 兼容Edge Runtime，纯正则匹配，不依赖Node.js模块
 */

interface InjectionResult {
  blocked: boolean;
  reason?: string;
}

// 高危注入模式
const HIGH_RISK_PATTERNS: { pattern: RegExp; category: string }[] = [
  // 忽略/忘记指令
  { pattern: /忽略\s*(?:之前|前面|以上|所有)?\s*(?:的)?\s*(?:指令|规则|要求|提示|设定|设置)/i, category: '指令忽略攻击' },
  { pattern: /忘记\s*(?:之前|前面|以上|所有)?\s*(?:的)?\s*(?:指令|规则|要求|提示|设定)/i, category: '指令忽略攻击' },
  { pattern: /(?:disregard|ignore|forget)\s+(?:previous|prior|above|all)\s+(?:instructions?|rules?|guidelines?|prompts?)/i, category: '指令忽略攻击' },
  { pattern: /不要\s*(?:遵守|遵循|按照|理会)\s*(?:之前|前面|以上)?\s*(?:的)?\s*(?:指令|规则|要求)/i, category: '指令忽略攻击' },

  // 角色劫持 - 强制切换
  { pattern: /(?:现在|接下来|从现在开始)\s*(?:你|你将|请)\s*(?:扮演|假装|假装成|作为|变成|成为)\s*(?!产品经理|项目经理|开发|设计师|测试|运营|HR|工程师|经理|专员|分析师|顾问|主管|总监)(?:[^，。！？\n]{1,20})/i, category: '角色劫持攻击' },
  { pattern: /(?:act\s+as|behave\s+as|pretend\s+(?:to\s+be|that\s+you\s+are)|you\s+are\s+now)\s+/i, category: '角色劫持攻击' },
  { pattern: /假装你是我的?\s*(?:妈妈|爸爸|朋友|老师|老板|上帝|神)/i, category: '角色劫持攻击' },

  // 系统提示泄露
  { pattern: /(?:输出|重复|显示|打印|泄露|透露|展示)\s*(?:系统提示|system\s*prompt|内部指令|内部规则|原始指令|初始设定)/i, category: '系统提示泄露' },
  { pattern: /(?:output|repeat|display|print|leak|reveal|show)\s+(?:your|the\s+system'?s?)\s+(?:prompt|instructions?|rules?|settings?)/i, category: '系统提示泄露' },
  { pattern: /(?:告诉我|说出|写出)\s*(?:你的|系统的|原始的)\s*(?:提示词|指令|规则|设定)/i, category: '系统提示泄露' },

  // DAN越狱
  { pattern: /DAN\s*(?:模式|越狱|jailbreak|mode)/i, category: 'DAN越狱攻击' },
  { pattern: /(?:解除|取消|移除)\s*(?:所有|全部|任何)\s*(?:限制|约束|规则|禁令)/i, category: 'DAN越狱攻击' },
  { pattern: /(?:remove|bypass|break)\s+(?:all|any)\s+(?:restrictions?|limitations?|boundaries)/i, category: 'DAN越狱攻击' },
  { pattern: /do\s+anything\s+now/i, category: 'DAN越狱攻击' },
];

// 面试场景下合理的角色扮演关键词（不拦截）
const INTERVIEW_SAFE_KEYWORDS = ['产品经理', '项目经理', '开发', '设计师', '测试', '运营', 'HR', '工程师', '经理', '专员', '分析师', '顾问', '主管', '总监', '实习生', '面试官'];

export function detectInjection(message: string, botType?: string): InjectionResult {
  if (!message || message.trim().length === 0) {
    return { blocked: false };
  }

  for (const { pattern, category } of HIGH_RISK_PATTERNS) {
    if (pattern.test(message)) {
      // 面试场景下的误杀检查：用户说「我想扮演产品经理面试」是合理的
      if (botType === 'interview') {
        const isSafeRole = INTERVIEW_SAFE_KEYWORDS.some(kw => message.includes(kw));
        if (isSafeRole) {
          continue;
        }
      }

      return {
        blocked: true,
        reason: `检测到${category}，消息已被安全拦截`,
      };
    }
  }

  return { blocked: false };
}

/** 生成被拦截时的SSE格式响应 */
export function createBlockedSSE(reason: string): string {
  const content = `⚠️ 安全提示：${reason}。请重新表述您的问题。`;
  const chunk = {
    id: `blocked-${Date.now()}`,
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model: 'safety-filter',
    choices: [{ index: 0, delta: { content }, finish_reason: 'stop' }],
  };
  return `data: ${JSON.stringify(chunk)}\n\ndata: [DONE]\n\n`;
}
