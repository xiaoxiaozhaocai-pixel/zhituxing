/**
 * 修复Excel数据薪资并重新导入
 */

const XLSX = require('xlsx');
const path = require('path');
const { execSync } = require('child_process');

// Supabase配置
const supabaseUrl = 'https://br-loyal-lynx-b8e11685.supabase2.aidap-global.cn-beijing.volces.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMzNTY5OTczODQsInJvbGUiOiJzZXJ2aWNlX3JvbGUifQ.3jeOyTGZngC7uixF40G9Wo4VG0EfurS9BWFMI6zSsAw';

// 读取Excel文件
const filePath = path.join(__dirname, '../assets/HR 岗位 JD 基础库.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log(`共 ${rawData.length - 1} 条数据`);

// 清理文本
function cleanText(str) {
  if (!str) return '';
  return str.toString()
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 2000);
}

// 修复的薪资解析函数
function parseSalary(str) {
  if (!str || str === '薪资面议' || str === '面议') {
    return { min: 5000, max: 10000, raw: str || '面议' };
  }
  
  // 判断是否为日薪
  const isDaily = str.includes('/天') || str.includes('元/天');
  
  // 匹配 8k-12k 或 8000-12000 格式
  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*[kK]?\s*[-~至]\s*(\d+(?:\.\d+)?)\s*[kK]?/);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1]);
    let max = parseFloat(rangeMatch[2]);
    if (min < 100) { min *= 1000; }
    if (max < 100) { max *= 1000; }
    // 如果是日薪，转换为月薪
    if (isDaily) {
      min = min * 22;
      max = max * 22;
    }
    return { min: Math.floor(min), max: Math.floor(max), raw: str };
  }
  
  // 匹配 120-150/天 格式
  const dailyMatch = str.match(/(\d+)\s*[-~至]\s*(\d+)\s*[\/天]/);
  if (dailyMatch) {
    const min = parseInt(dailyMatch[1]) * 22;
    const max = parseInt(dailyMatch[2]) * 22;
    return { min, max, raw: str };
  }
  
  // 匹配单个数字如 8k
  const singleMatch = str.match(/(\d+(?:\.\d+)?)\s*[kK]?/);
  if (singleMatch) {
    let val = parseFloat(singleMatch[1]);
    if (val < 100) { val *= 1000; }
    // 如果是日薪
    if (isDaily) {
      val = val * 22;
    }
    return { min: Math.floor(val * 0.8), max: Math.floor(val * 1.2), raw: str };
  }
  
  return { min: 5000, max: 10000, raw: str };
}

// 应届生友好度映射
const friendlyMap = {
  '极度友好（接受无经验 + 带教）': { is_friendly: 1, level: '极度友好' },
  '极度友好（接受无经验 + 带教，可转正）': { is_friendly: 1, level: '极度友好' },
  '极度友好（接受大一/大二，零基础可实习）': { is_friendly: 1, level: '极度友好' },
  '极度友好（接受零基础）': { is_friendly: 1, level: '极度友好' },
  '极度友好（接受零基础，可转正）': { is_friendly: 1, level: '极度友好' },
  '友好（相关实习优先）': { is_friendly: 1, level: '友好' },
  '友好（相关专业优先）': { is_friendly: 1, level: '友好' },
  '一般（需基础经验）': { is_friendly: 0, level: '一般' },
  '不友好（需多年经验）': { is_friendly: 0, level: '不友好' }
};

// 转换数据
const jobs = [];
for (let i = 1; i < rawData.length; i++) {
  const row = rawData[i];
  if (!row || row.length === 0 || !row[0]) continue;
  
  const salary = parseSalary(row[14] || '');
  const friendly = friendlyMap[row[15]] || { is_friendly: 1, level: '友好' };
  
  const job = {
    job_name: row[0] || '',
    industry: row[1] || '互联网',
    city: row[4] || '全国',
    company_type: row[2] || '民营企业',
    salary_min: salary.min,
    salary_max: salary.max,
    skills: cleanText(row[11]),
    soft_skills: cleanText(row[12]),
    is_fresh_friendly: friendly.is_friendly,
    friendly_level: friendly.level,
    jd_content: cleanText(row[6]),
    core_duties: cleanText(row[7]),
    education: row[8] || '本科及以上',
    major: row[9] || '',
    experience: row[10] || '',
    post_type: row[5] || '',
    bonus_skills: cleanText(row[13]),
    salary_range: salary.raw,
    post_time: row[16] || null,
    apply_deadline: row[17] || null,
    jd_link: row[18] || '',
    post_category: row[19] || '',
    party_label: row[3] || ''
  };
  
  jobs.push(job);
}

console.log(`解析完成，共 ${jobs.length} 条岗位数据`);

// 显示薪资修复前后对比
console.log('\n薪资修复对比（部分数据）:');
jobs.filter(j => j.salary_range.includes('/天')).slice(0, 5).forEach(job => {
  console.log(`${job.job_name}: ${job.salary_range} -> ${job.salary_min}-${job.salary_max}`);
});

// 先清空现有数据
console.log('\n清空现有岗位数据...');
const deleteCmd = `curl -s -X DELETE "${supabaseUrl}/rest/v1/jobs" \
  -H "apikey: ${supabaseKey}" \
  -H "Authorization: Bearer ${supabaseKey}"`;
try {
  execSync(deleteCmd, { encoding: 'utf-8' });
  console.log('已清空');
} catch (err) {
  console.error('清空失败:', err.message);
}

// 使用curl插入
function insertWithCurl(data) {
  const jsonData = JSON.stringify(data);
  const escaped = jsonData.replace(/'/g, "'\\''");
  
  const cmd = `curl -s -X POST "${supabaseUrl}/rest/v1/jobs" \
    -H "apikey: ${supabaseKey}" \
    -H "Authorization: Bearer ${supabaseKey}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d '${escaped}'`;
  
  try {
    execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
    return true;
  } catch (err) {
    console.error('Error:', err.message);
    return false;
  }
}

// 分批插入
async function main() {
  const batchSize = 10;
  let successCount = 0;
  
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const ok = insertWithCurl(batch);
    if (ok) {
      successCount += batch.length;
      console.log(`已导入 ${successCount} / ${jobs.length}`);
    } else {
      console.error(`批次 ${i / batchSize + 1} 插入失败`);
    }
  }
  
  console.log(`\n导入完成! 成功导入 ${successCount} 条数据`);
}

main().catch(console.error);
