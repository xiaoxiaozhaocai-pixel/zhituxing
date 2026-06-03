/**
 * HR岗位JD数据导入脚本
 * 读取本地Excel文件并导入到Supabase数据库
 */

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// 读取Excel文件
const filePath = path.join(__dirname, '../assets/HR 岗位 JD 基础库.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

// 获取表头
const headers = rawData[0];
console.log('表头:', headers);
console.log(`共 ${rawData.length - 1} 条数据\n`);

// 转换为字符串并处理引号
function toSqlString(v) {
  if (v === null || v === undefined) return 'NULL';
  const str = String(v).replace(/'/g, "''");
  return `'${str}'`;
}

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
  
  // 匹配 8k-12k 或 8000-12000 格式
  const rangeMatch = str.match(/(\d+(?:\.\d+)?)\s*[kK]?\s*[-~至]\s*(\d+(?:\.\d+)?)\s*[kK]?/);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1]);
    let max = parseFloat(rangeMatch[2]);
    if (min < 100) { min *= 1000; }
    if (max < 100) { max *= 1000; }
    return { min: Math.floor(min), max: Math.floor(max) };
  }
  
  // 匹配 120-150/天 格式
  const dailyMatch = str.match(/(\d+)\s*[-~至]\s*(\d+)\s*[\/天]/);
  if (dailyMatch) {
    const min = parseInt(dailyMatch[1]) * 22;
    const max = parseInt(dailyMatch[2]) * 22;
    return { min, max };
  }
  
  // 匹配单个数字如 8k
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

// 生成SQL语句
const sqlStatements = [];

for (let i = 0; i < jobs.length; i++) {
  const job = jobs[i];
  const vals = [
    toSqlString(job.job_name),
    toSqlString(job.industry),
    toSqlString(job.city),
    toSqlString(job.company_type),
    job.salary_min,
    job.salary_max,
    toSqlString(job.skills),
    toSqlString(job.soft_skills),
    job.is_fresh_friendly,
    toSqlString(job.friendly_level),
    toSqlString(job.jd_content),
    toSqlString(job.core_duties),
    toSqlString(job.education),
    toSqlString(job.major),
    toSqlString(job.experience),
    toSqlString(job.post_type),
    toSqlString(job.bonus_skills),
    toSqlString(job.salary_range),
    toSqlString(job.post_time),
    toSqlString(job.apply_deadline),
    toSqlString(job.jd_link),
    toSqlString(job.post_category),
    toSqlString(job.party_label)
  ];
  
  const sql = `INSERT INTO jobs (job_name, industry, city, company_type, salary_min, salary_max, skills, soft_skills, is_fresh_friendly, friendly_level, jd_content, core_duties, education, major, experience, post_type, bonus_skills, salary_range, post_time, apply_deadline, jd_link, post_category, party_label)
VALUES (${vals.join(', ')});`;
  
  sqlStatements.push(sql);
}

// 输出SQL到文件
const outputPath = path.join(__dirname, '../sql/import_jobs_data.sql');
fs.writeFileSync(outputPath, sqlStatements.join('\n'));

console.log(`\nSQL语句已生成到: ${outputPath}`);
console.log(`共 ${sqlStatements.length} 条INSERT语句`);

// 输出一些样本数据
console.log('\n样本数据预览:');
jobs.slice(0, 5).forEach((job, i) => {
  console.log(`\n--- 数据 ${i + 1} ---`);
  console.log(`岗位: ${job.job_name}`);
  console.log(`行业: ${job.industry}`);
  console.log(`城市: ${job.city}`);
  console.log(`薪资: ${job.salary_min}-${job.salary_max}`);
  console.log(`应届友好: ${job.is_fresh_friendly === 1 ? '是' : '否'}`);
  console.log(`友好级别: ${job.friendly_level}`);
});

// 统计信息
const stats = {
  total: jobs.length,
  freshFriendly: jobs.filter(j => j.is_fresh_friendly === 1).length,
  industries: [...new Set(jobs.map(j => j.industry))],
  cities: [...new Set(jobs.map(j => j.city))],
  companyTypes: [...new Set(jobs.map(j => j.company_type))]
};

console.log('\n=== 数据统计 ===');
console.log(`总岗位数: ${stats.total}`);
console.log(`应届友好岗位: ${stats.freshFriendly} (${(stats.freshFriendly / stats.total * 100).toFixed(1)}%)`);
console.log(`行业分布: ${stats.industries.join(', ')}`);
console.log(`城市分布: ${stats.cities.join(', ')}`);
console.log(`企业类型: ${stats.companyTypes.join(', ')}`);
