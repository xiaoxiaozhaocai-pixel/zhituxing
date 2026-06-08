/**
 * 数据回填脚本：为 job_descriptions 表中缺失的字段补充数据
 * 
 * 回填字段：
 * - core_duty_module：从 responsibilities 提取关键职责
 * - major_require：从 responsibilities 提取专业要求
 * 
 * 不回填：
 * - source_url：原始爬取时就没有则跳过
 * - soft_skills：覆盖率 92%，问题不大
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('请设置环境变量 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

/**
 * 从 responsibilities 中提取核心职责
 * 规则：
 * 1. 查找"岗位职责"、"工作职责"、"职位职责"等关键词后的内容
 * 2. 提取每个职责条目的第一句话（通常是核心动作）
 * 3. 合并为顿号分隔的字符串
 */
function extractCoreDuties(responsibilities: string): string {
  if (!responsibilities) return '';
  
  const text = responsibilities;
  
  // 1. 查找职责部分的开始位置
  const dutyKeywords = ['岗位职责', '工作职责', '职位职责', '职责描述', '岗位职责描述', '工作内容'];
  let dutyStart = -1;
  
  for (const keyword of dutyKeywords) {
    const idx = text.indexOf(keyword);
    if (idx !== -1) {
      dutyStart = idx + keyword.length;
      break;
    }
  }
  
  // 如果没找到明确的职责部分，从头开始
  if (dutyStart === -1) dutyStart = 0;
  
  // 2. 查找职责部分的结束位置（遇到"任职要求"等关键词）
  const requirementKeywords = ['任职要求', '岗位要求', '职位要求', '招聘要求', '要求条件', '任职资格'];
  let dutyEnd = text.length;
  
  for (const keyword of requirementKeywords) {
    const idx = text.indexOf(keyword);
    if (idx !== -1 && idx > dutyStart) {
      dutyEnd = Math.min(dutyEnd, idx);
    }
  }
  
  // 3. 提取职责文本
  const dutyText = text.slice(dutyStart, dutyEnd).trim();
  
  // 4. 按条目分割（常见分隔符：数字编号、破折号、句号、换行）
  const dutyItems: string[] = [];
  
  // 尝试按编号分割（1. 2. 3. 或 1、2、3、）
  const numberedPattern = /(?:^|\n)\s*(?:\d+[.、．]|[-—·])\s*([^\n]+)/g;
  let match;
  let hasNumberedItems = false;
  
  while ((match = numberedPattern.exec(dutyText)) !== null) {
    hasNumberedItems = true;
    const item = match[1].trim();
    if (item && item.length > 2 && item.length < 50) {
      // 提取第一句话（取第一个句号/逗号前的内容，或整句）
      const firstSentence = extractFirstSentence(item);
      if (firstSentence) dutyItems.push(firstSentence);
    }
  }
  
  // 如果没有编号条目，尝试按换行分割
  if (!hasNumberedItems) {
    const lines = dutyText.split(/\n/);
    for (const line of lines) {
      const item = line.replace(/^[-—·•]\s*/, '').trim();
      if (item && item.length > 2 && item.length < 50 && !isRequirementPhrase(item)) {
        const firstSentence = extractFirstSentence(item);
        if (firstSentence) dutyItems.push(firstSentence);
      }
    }
  }
  
  // 5. 去重并限制数量
  const uniqueDuties = [...new Set(dutyItems)].slice(0, 6);
  
  return uniqueDuties.join('、');
}

/**
 * 提取第一句话（核心动作）
 */
function extractFirstSentence(text: string): string {
  // 移除前导符号
  text = text.replace(/^[-—·•※✦▶►]\s*/, '').trim();
  
  // 取第一个句号、逗号、分号前的内容
  const stopChars = ['。', '，', '；', ',', ';', '、'];
  let minIdx = text.length;
  
  for (const char of stopChars) {
    const idx = text.indexOf(char);
    if (idx !== -1 && idx < minIdx) {
      minIdx = idx;
    }
  }
  
  const result = text.slice(0, minIdx).trim();
  
  // 过滤太短或太长的结果
  if (result.length < 3 || result.length > 30) return '';
  
  // 过滤明显不是职责的短语
  if (isRequirementPhrase(result)) return '';
  
  return result;
}

/**
 * 判断是否是任职要求短语（而非职责）
 */
function isRequirementPhrase(text: string): boolean {
  const requireKeywords = [
    '本科', '硕士', '博士', '大专', '学历', '专业',
    '年以上', '年经验', '工作经验', '工作年限',
    '熟练', '精通', '掌握', '了解', '熟悉',
    '具有良好的', '具有较强的', '具备', '具有',
    '优先', '加分', '全职', '兼职'
  ];
  
  return requireKeywords.some(kw => text.includes(kw));
}

/**
 * 从 responsibilities 中提取专业要求
 * 规则：
 * 1. 查找"任职要求"、"岗位要求"等关键词后的内容
 * 2. 匹配专业相关的关键词（XX专业、专业不限等）
 */
function extractMajorRequire(responsibilities: string): string {
  if (!responsibilities) return '';
  
  const text = responsibilities;
  
  // 1. 查找任职要求部分的开始位置
  const requireKeywords = ['任职要求', '岗位要求', '职位要求', '招聘要求', '任职资格', '要求条件'];
  let requireStart = -1;
  
  for (const keyword of requireKeywords) {
    const idx = text.indexOf(keyword);
    if (idx !== -1) {
      requireStart = idx + keyword.length;
      break;
    }
  }
  
  if (requireStart === -1) return '';
  
  // 2. 提取要求部分（取后面500字符）
  const requireText = text.slice(requireStart, requireStart + 500);
  
  // 3. 匹配专业相关模式
  const _majorPatterns = [
    // XX专业优先
    /([^\n，。；]{2,15}专业)[^\n，。；]*(?:优先|以上|均可|不限)/g,
    // 专业不限
    /专业不限/g,
    // XX、XX、XX相关专业
    /([^\n，。；]{2,30}(?:相关专业|及相关专业))/g,
    // XX类相关专业
    /([^\n，。；]{2,15}类相关专业)/g,
    // 统招本科及以上学历，专业不限
    /专业不限/g,
  ];
  
  const majors: string[] = [];
  
  // 匹配具体专业名称
  const specificMajorPattern = /([\u4e00-\u9fa5]{2,8}专业)/g;
  let match;
  
  while ((match = specificMajorPattern.exec(requireText)) !== null) {
    const major = match[1];
    if (!majors.includes(major) && !major.includes('相关专业')) {
      majors.push(major);
    }
  }
  
  // 如果找到具体专业，返回
  if (majors.length > 0) {
    return majors.slice(0, 4).join('、');
  }
  
  // 检查是否专业不限
  if (requireText.includes('专业不限') || requireText.includes('不限专业')) {
    return '专业不限';
  }
  
  // 检查是否有相关专业
  const relatedPattern = /([\u4e00-\u9fa5]{2,15}(?:相关专业|及相关专业))/;
  const relatedMatch = requireText.match(relatedPattern);
  if (relatedMatch) {
    return relatedMatch[1];
  }
  
  return '';
}

/**
 * 查询需要回填的记录
 */
async function fetchRecordsToFill() {
  const query = new URLSearchParams({
    select: 'id,responsibilities,core_duty_module,major_require',
    // core_duty_module 为空或 null
    or: 'core_duty_module.is.null,core_duty_module.eq.',
    limit: '1000'
  });
  
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/job_descriptions?${query}`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`查询失败: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * 更新单条记录
 */
async function updateRecord(id: number, data: { core_duty_module?: string; major_require?: string }) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/job_descriptions?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data),
    }
  );
  
  if (!response.ok) {
    throw new Error(`更新记录 ${id} 失败: ${response.status}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 数据回填脚本开始 ===\n');
  
  // 1. 查询需要回填的记录
  console.log('查询需要回填的记录...');
  const records = await fetchRecordsToFill();
  console.log(`找到 ${records.length} 条记录需要处理\n`);
  
  if (records.length === 0) {
    console.log('没有需要回填的记录，退出');
    return;
  }
  
  // 2. 统计
  let coreDutyFilled = 0;
  let majorRequireFilled = 0;
  let bothFilled = 0;
  let skipped = 0;
  
  // 3. 逐条处理
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
    if ((i + 1) % 100 === 0) {
      console.log(`进度: ${i + 1}/${records.length}`);
    }
    
    // 跳过没有 responsibilities 的记录
    if (!record.responsibilities) {
      skipped++;
      continue;
    }
    
    const updateData: { core_duty_module?: string; major_require?: string } = {};
    
    // 提取 core_duty_module
    if (!record.core_duty_module) {
      const coreDuty = extractCoreDuties(record.responsibilities);
      if (coreDuty) {
        updateData.core_duty_module = coreDuty;
        coreDutyFilled++;
      }
    }
    
    // 提取 major_require
    if (!record.major_require) {
      const major = extractMajorRequire(record.responsibilities);
      if (major) {
        updateData.major_require = major;
        majorRequireFilled++;
      }
    }
    
    // 更新数据库
    if (Object.keys(updateData).length > 0) {
      try {
        await updateRecord(record.id, updateData);
        if (updateData.core_duty_module && updateData.major_require) {
          bothFilled++;
        }
      } catch (error) {
        console.error(`更新记录 ${record.id} 失败:`, error);
      }
    }
  }
  
  // 4. 输出统计
  console.log('\n=== 回填完成 ===');
  console.log(`总处理: ${records.length} 条`);
  console.log(`core_duty_module 回填: ${coreDutyFilled} 条`);
  console.log(`major_require 回填: ${majorRequireFilled} 条`);
  console.log(`两者都回填: ${bothFilled} 条`);
  console.log(`跳过（无 responsibilities）: ${skipped} 条`);
}

main().catch(console.error);
