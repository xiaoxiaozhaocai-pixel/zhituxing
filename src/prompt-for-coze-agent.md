// ==========================================
// 职搭子智能体 - Coze平台配置代码
// ==========================================

// 1. 环境变量配置 (.env)
```
NEXT_PUBLIC_COZE_API_KEY=eyJhbGciOiJSUzI1NiIsImtpZCI6IjUwNzgwN2ZkLWVhMzEtNGFyYS04NjE4LWE3OWMxODY3MzI2NyJ9...
NEXT_PUBLIC_COZE_BOT_ID=7629654356933050409
```

// 2. API请求代码 (JavaScript/TypeScript)
```javascript
// 搜索JD的API地址
const SEARCH_API_URL = "https://abc123.dev.coze.site/api/search-jd";

// 调用方式
const response = await fetch(
  `${SEARCH_API_URL}?query=${encodeURIComponent(jobKeyword)}`
);

const data = await response.json();
const result = data.result; // 返回岗位信息字符串
```

// 3. 智能体提示词 (System Prompt)
```
你是「职途星-职搭子」，一个专业的HR岗位咨询助手。

当你需要查询岗位信息时，调用以下API：
- URL: https://abc123.dev.coze.site/api/search-jd
- Method: GET
- Params: query=岗位关键词

示例：
query=招聘专员 → 返回所有招聘专员岗位
query=HRBP → 返回所有HRBP岗位
query=北京+HR → 返回北京地区的HR岗位

收到结果后：
1. 解析result字段中的岗位列表
2. 提取关键信息：岗位名称、企业、薪资、城市、描述
3. 用友好的方式展示给用户
4. 可以补充求职建议

如果result为空或提示未找到，告诉用户：
"抱歉，这个岗位的真实JD还在收集中哦～你可以试试其他热门HR岗位，如招聘专员、培训专员、薪酬绩效专员等！"
```

// 4. 期望输出格式
当用户问"招聘专员岗位怎么样"时，智能体应输出：
```json
{
  "content": "找到了21个招聘专员岗位，以下是部分信息：\n\n[Position 1]\nJob Title: 招聘专员 - 北京（校招）\nCompany: 某公司\nCity: 北京\nSalary: 6k-12k/month\nFresh Graduate Friendly: Yes\nDescription: 支持业务线招聘，熟练掌握招聘渠道...\n\n求职建议：招聘专员入门门槛较低，适合对HR有兴趣的同学..."
}
```

// ==========================================
// 完整可运行的示例代码
// ==========================================

// API配置
const API_BASE = "https://abc123.dev.coze.site";

// 搜索岗位
async function searchJobs(keyword) {
  try {
    const response = await fetch(`${API_BASE}/api/search-jd?query=${encodeURIComponent(keyword)}`);
    const data = await response.json();
    
    if (data.code === 0) {
      return data.result; // 返回岗位信息字符串
    } else {
      return "搜索服务暂时不可用，请稍后重试";
    }
  } catch (error) {
    console.error("搜索失败:", error);
    return "网络请求失败，请检查网络连接";
  }
}

// 对话处理
async function handleUserQuery(userMessage) {
  // 提取关键词
  const keywords = extractKeywords(userMessage);
  
  if (keywords) {
    // 调用搜索API
    const jobInfo = await searchJobs(keywords);
    return formatResponse(jobInfo, userMessage);
  } else {
    return "你想了解什么岗位呢？比如：招聘专员、HRBP、培训专员、薪酬绩效等～";
  }
}

// 格式化回复
function formatResponse(jobInfo, userQuery) {
  return `
根据你的需求，我找到了以下岗位信息：

${jobInfo}

---
💡 应届生求职小提示：
• 招聘专员入门门槛相对较低，适合作为HR的入门岗位
• 建议在校期间考取人力资源相关证书
• 培养沟通能力和数据分析能力对岗位很有帮助

还有其他想了解的岗位吗？
  `.trim();
}
