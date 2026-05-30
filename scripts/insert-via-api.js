/**
 * 直接通过Supabase REST API执行批量插入
 */

const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
const https = require('https');
const http = require('http');

// Supabase配置 - 硬编码（从.env.local读取）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

// 薪资解析函数
function parseSalary(str) {
  if (!str || str === '薪资面议' || str === '面议') {
    return { min: 5000, max: 10000 };
  }
  
  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*[kK]?\s*[-~至]\s*(\d+(?:\.\d+)?)\s*[kK]?/);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1]);
    let max = parseFloat(rangeMatch[2]);
    if (min < 100) { min *= 1000; }
    if (max < 100) { max *= 1000; }
    return { min: Math.floor(min), max: Math.floor(max) };
  }
  
  const dailyMatch = str.match(/(\d+)\s*[-~至]\s*(\d+)\s*[\/天]/);
  if (dailyMatch) {
    const min = parseInt(dailyMatch[1]) * 22;
    const max = parseInt(dailyMatch[2]) * 22;
    return { min, max };
  }
  
  const singleMatch = str.match(/(\d+(?:\.\d+)?)\s*[kK]?/);
  if (singleMatch) {
    let val = parseFloat(singleMatch[1]);
    if (val < 100) { val *= 1000; }
    return { min: Math.floor(val * 0.8), max: Math.floor(val * 1.2) };
  }
  
  return { min: 5000, max: 10000 };
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
    salary_range: row[14] || '',
    post_time: row[16] || null,
    apply_deadline: row[17] || null,
    jd_link: row[18] || '',
    post_category: row[19] || '',
    party_label: row[3] || ''
  };
  
  jobs.push(job);
}

console.log(`解析完成，共 ${jobs.length} 条岗位数据`);
console.log(`应届友好岗位: ${jobs.filter(j => j.is_fresh_friendly === 1).length}`);

// 通过fetch发送POST请求
async function insertJobs(batch) {
  const url = `${supabaseUrl}/rest/v1/jobs`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(batch)
  });
  
  return response.ok;
}

async function main() {
  const batchSize = 20;
  let successCount = 0;
  
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    try {
      const ok = await insertJobs(batch);
      if (ok) {
        successCount += batch.length;
        console.log(`已导入 ${successCount} / ${jobs.length}`);
      } else {
        console.error(`批次 ${i / batchSize + 1} 插入失败`);
      }
    } catch (err) {
      console.error(`批次 ${i / batchSize + 1} 错误:`, err.message);
    }
  }
  
  console.log(`\n导入完成! 成功导入 ${successCount} 条数据`);
}

main().catch(console.error);
