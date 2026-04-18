'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';

const quickQuestions = [
  '我是计算机专业，适合什么岗位？',
  '生成我的职业规划报告',
  '互联网行业薪资水平怎么样？',
  '没有实习经验怎么办？',
  '如何写一份优秀的简历？',
  '国企和私企怎么选？',
  '考研还是找工作？',
  'AI模拟面试（HR岗位）',
  '测算我应聘Java开发的成功率'
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function AssistantPage() {
  const [freeQuota, setFreeQuota] = useState(5);
  const [inputValue, setInputValue] = useState('');
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 自动发送URL中的查询参数
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('query');
    if (query) {
      setInputValue(query);
    }
  }, []);

  const mockResponses: { [key: string]: string } = {
    '我是计算机专业，适合什么岗位？': '根据你的计算机专业背景，我为你推荐以下岗位：\n\n1. **Java开发工程师** - 薪资15-25K，适合喜欢编程的你\n2. **前端开发工程师** - 薪资18-30K，需要良好的审美和编码能力\n3. **Python开发工程师** - 薪资14-24K，适合数据分析方向\n4. **测试工程师** - 薪资12-20K，需要细心和耐心\n5. **运维工程师** - 薪资12-22K，需要系统管理能力\n\n这些岗位都覆盖互联网、金融等15+行业，应届生友好度高。建议你根据兴趣选择1-2个方向重点发展。',
    '生成我的职业规划报告': '好的！我将为你生成专属的职业规划报告。\n\n**基础信息**\n- 专业：计算机专业\n- 年级：大三\n- 求职意向：技术类岗位\n\n**推荐学习路径**\n\n大一：打牢基础\n- 学习编程基础（Python/Java）\n- 参加编程社团\n- 完成2-3个小项目\n\n大二：技术提升\n- 深入学习前端/后端技术\n- 参加技术竞赛（如ACM）\n- 完成实习项目\n\n大三：求职准备\n- 准备简历和作品集\n- 投递暑期实习\n- 刷算法题\n\n大四：收割offer\n- 参加秋招/春招\n- 准备面试\n- 选择最佳offer',
    '互联网行业薪资水平怎么样？': '互联网行业薪资水平（仅供参考）：\n\n**技术类**\n- 前端开发：15-30K（应届生8-15K）\n- 后端开发：18-35K（应届生10-18K）\n- 算法工程师：25-50K（应届生15-25K）\n- 测试工程师：12-25K（应届生8-15K）\n\n**产品类**\n- 产品经理：20-40K（应届生10-20K）\n- 产品运营：12-25K（应届生8-15K）\n\n**运营类**\n- 用户运营：10-20K（应届生6-12K）\n- 内容运营：10-18K（应届生6-12K）\n- 电商运营：12-22K（应届生8-15K）',
    '没有实习经验怎么办？': '没有实习经验？这些方法帮你弥补：\n\n1. **项目经验**\n   - 独立完成2-3个完整项目\n   - 参与开源项目贡献\n   - 参加编程竞赛\n\n2. **校园经历**\n   - 担任学生会干部\n   - 组织大型活动\n   - 参加社团技术分享\n\n3. **兼职/外包**\n   - 承接外包项目\n   - 做家教/培训\n   - 自由职业经历\n\n4. **技能证书**\n   - 专业相关证书\n   - 在线课程证书\n   - 开源贡献记录',
    '如何写一份优秀的简历？': '写好简历的关键要点：\n\n**基本结构**\n1. 个人信息（姓名、联系方式、求职意向）\n2. 教育背景（学校、专业、GPA、排名）\n3. 实习/工作经历（用STAR法则）\n4. 项目经验（技术栈、成果、数据）\n5. 技能特长（语言、工具、证书）\n6. 获奖荣誉（奖学金、比赛、竞赛）\n\n**STAR法则**\n- Situation（情境）：项目背景是什么\n- Task（任务）：你的职责是什么\n- Action（行动）：你具体做了什么\n- Result（结果）：取得了什么成果（数据化）',
    '国企和私企怎么选？': '国企vs私企，各有优劣：\n\n**国企优势**\n- 稳定：铁饭碗，不会轻易裁员\n- 福利好：五险一金、带薪年假\n- 工作强度：相对轻松，加班少\n\n**国企劣势**\n- 薪资：起薪相对较低\n- 晋升：论资排辈，晋升慢\n\n**私企优势**\n- 薪资：高薪机会，能力=收入\n- 成长：快速提升，接触核心业务\n\n**私企劣势**\n- 风险：可能面临裁员优化\n- 压力：KPI考核，业绩导向',
    '考研还是找工作？': '考研还是找工作？这是个经典问题：\n\n**适合考研的情况**\n- 对学术研究有浓厚兴趣\n- 想进入需要硕士学历的领域（如AI、芯片）\n- 高考失利，想提升学历背景\n\n**适合找工作的情况**\n- 实践能力强，喜欢做项目\n- 家庭经济需要早点工作\n- 已经明确职业方向\n\n**建议**：不要为了逃避就业而考研！',
    'AI模拟面试（HR岗位）': '好的！开始AI模拟面试——HR岗位\n\n**面试场景设定**\n- 岗位：人力资源专员/HRBP\n- 公司：互联网中型企业\n\n**导入面试**\n\n你好，请简单介绍一下你自己。\n\n【请回复你的回答，我会给你评分和建议】',
    'default': '感谢你的提问！我是职途星的AI职业规划助手。\n\n我可以帮你：\n\n1. **查询岗位信息** - 基于500万+真实招聘JD\n2. **职业规划建议** - 根据你的专业和兴趣\n3. **面试指导** - AI模拟面试\n4. **成功率测算** - 评估你的岗位适配度\n\n请告诉我你的具体情况，比如：\n- 你是什么专业？\n- 现在读大几？\n- 有哪些兴趣爱好？'
  };

  const handleQuickQuestion = (question: string) => {
    if (freeQuota <= 0) {
      setShowQuotaModal(true);
      return;
    }
    sendMessage(question);
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    if (freeQuota > 0) {
      setFreeQuota(prev => prev - 1);
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          conversationId: localStorage.getItem('conversationId') || undefined
        }),
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        const assistantMessage: Message = {
          role: 'assistant',
          content: '',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          fullContent += chunk;
          
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = fullContent;
            return newMessages;
          });
        }

        const conversationIdMatch = fullContent.match(/conversationId["\s:]+([^"\\]+)/);
        if (conversationIdMatch) {
          localStorage.setItem('conversationId', conversationIdMatch[1]);
        }
      } else {
        throw new Error('Failed to get response');
      }
    } catch {
      // 如果API调用失败，显示模拟响应
      const response = mockResponses[messageText] || mockResponses['default'];
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (freeQuota <= 0) {
      setShowQuotaModal(true);
      return;
    }
    sendMessage(inputValue);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              职途星全行业AI职业规划助手
            </h1>
            <p className="text-gray-600">
              我是你的专属求职搭子，所有信息均来自<span className="font-semibold text-[#165DFF]">全行业真实招聘JD</span>，拒绝空泛鸡汤！
            </p>
          </div>
          <Link
            href="/membership"
            className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <span className="text-gray-600">本月剩余免费次数：</span>
            <span className="text-lg font-bold text-[#165DFF]">{freeQuota}/5</span>
          </Link>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📌 试试这些热门问题
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {quickQuestions.map((question, index) => (
              <Button
                key={index}
                variant="ghost"
                className="justify-start h-auto py-3 px-4 text-left bg-white border border-gray-200 hover:border-[#165DFF] hover:bg-[#165DFF]/5 hover:text-[#165DFF] transition-all duration-300"
                onClick={() => handleQuickQuestion(question)}
              >
                <span className="line-clamp-2 text-sm">{question}</span>
              </Button>
            ))}
          </div>
        </div>

        <Card className="border-2 border-gray-200 overflow-hidden">
          <CardContent className="p-0 flex flex-col" style={{ height: '600px' }}>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-br from-gray-50 to-white">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 bg-[#165DFF] rounded-full flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      职途星全行业岗位百科智能体
                    </h3>
                    <p className="text-gray-600 mb-4">
                      输入你想了解的岗位、专业或求职问题，我会基于真实招聘JD为你解答
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['计算机专业', '前端开发', '产品经理'].map((tag) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-[#165DFF]/10 text-[#165DFF] rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-3 ${
                        message.role === 'user' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          message.role === 'user'
                            ? 'bg-[#165DFF]'
                            : 'bg-green-500'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <UserIcon className="w-5 h-5 text-white" />
                        ) : (
                          <Bot className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'user'
                            ? 'bg-[#165DFF] text-white'
                            : 'bg-white border border-gray-200 text-gray-900'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                          {index === messages.length - 1 && isLoading && message.role === 'assistant' && (
                            <span className="inline-block animate-pulse ml-1">▊</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="p-4 border-t bg-white">
              <div className="flex gap-3">
                <Input
                  placeholder="请输入你想了解的岗位、专业或求职问题..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-[#165DFF] hover:bg-[#165DFF]/90 text-white px-6"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      处理中
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      发送
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-4">
          每月免费5次AI服务，开通会员享无限次使用+专属特权
        </p>
      </div>

      {showQuotaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                本月免费次数已用完
              </h3>
              <p className="text-gray-600 mb-6">
                开通会员即可享受无限次AI服务+专属特权，仅需9.9元/月
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/membership" className="flex-1">
                  <Button className="w-full bg-[#FF7D00] hover:bg-[#e67000] text-white">
                    立即开通会员
                  </Button>
                </Link>
                <Link href="/profile/invite" className="flex-1">
                  <Button
                    variant="ghost"
                    className="w-full border border-[#165DFF] text-[#165DFF] hover:bg-[#165DFF]/5"
                    onClick={() => setShowQuotaModal(false)}
                  >
                    邀请好友得免费次数
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
