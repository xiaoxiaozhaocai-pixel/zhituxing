/**
 * HR岗位JD数据导入脚本
 * 将Excel数据导入到jobs表中
 * 
 * 使用方法: node scripts/import-jobs.js
 */

const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Supabase配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// 字段映射
const fieldMapping = {
  'post_full_name': 'job_name',
  'industry': 'industry',
  'work_city': 'city',
  'company_type': 'company_type',
  'job_duty': 'jd_content',
  'hard_skill': 'skills',
  'soft_skill': 'soft_skills',
  'salary_range': 'salary_range',
  'graduate_friendly_level': 'friendly_level',
  'education_require': 'education',
  'major_require': 'major',
  'experience_require': 'experience',
  'post_nature': 'post_type',
  'core_duty_module': 'core_duties'
};

// 应届生友好度映射
const friendlyMapping = {
  '极度友好（接受无经验 + 带教）': { is_friendly: 1, level: '极度友好' },
  '友好（相关实习优先）': { is_friendly: 1, level: '友好' },
  '一般（需相关经验）': { is_friendly: 0, level: '一般' },
  '不友好（需多年经验）': { is_friendly: 0, level: '不友好' }
};

// 薪资解析
function parseSalary(salaryStr) {
  if (!salaryStr || salaryStr === '薪资面议') {
    return { min: 5000, max: 10000 };
  }
  
  // 匹配 8k-12k 或 8000-12000 格式
  const rangeMatch = salaryStr.match(/(\d+(?:\.\d+)?)[kK]?\s*[-~]\s*(\d+(?:\.\d+)?)[kK]?/);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1]);
    let max = parseFloat(rangeMatch[2]);
    if (min < 100) { min *= 1000; }
    if (max < 100) { max *= 1000; }
    return { min: Math.floor(min), max: Math.floor(max) };
  }
  
  // 匹配 120-150/天 格式
  const dailyMatch = salaryStr.match(/(\d+)\s*[-~]\s*(\d+)\s*[\/天]/);
  if (dailyMatch) {
    const min = parseInt(dailyMatch[1]) * 22;
    const max = parseInt(dailyMatch[2]) * 22;
    return { min, max };
  }
  
  return { min: 5000, max: 10000 };
}

async function importJobs() {
  console.log('开始导入岗位数据...');
  
  // 读取Excel文件
  const filePath = path.join(__dirname, '../../assets/HR岗位JD基础库.xlsx');
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log(`共读取 ${data.length} 条数据`);
  
  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  // 批量插入，每批100条
  const batchSize = 100;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const jobs = [];
    
    for (const row of batch) {
      try {
        const salary = parseSalary(row['salary_range'] || '');
        const friendly = friendlyMapping[row['graduate_friendly_level']] || friendlyMapping['友好（相关实习优先）'];
        
        const job = {
          job_name: row['post_full_name'] || '',
          industry: row['industry'] || '互联网',
          city: row['work_city'] || '全国',
          company_type: row['company_type'] || '民营企业',
          salary_min: salary.min,
          salary_max: salary.max,
          skills: (row['hard_skill'] || '').replace(/<br\s*\/?>/gi, ', ').replace(/,/g, ', '),
          soft_skills: (row['soft_skill'] || '').replace(/<br\s*\/?>/gi, ', '),
          is_fresh_friendly: friendly.is_friendly,
          friendly_level: friendly.level,
          jd_content: (row['job_duty'] || '').replace(/<br\s*\/?>/gi, '\n'),
          core_duties: row['core_duty_module'] || '',
          education: row['education_require'] || '本科及以上',
          major: row['major_require'] || '',
          experience: row['experience_require'] || '',
          post_type: row['post_nature'] || '',
          education_require: row['education_require'] || '',
          experience_require: row['experience_require'] || '',
          bonus_skill: row['bonus_skill_cert'] || '',
          salary_range: row['salary_range'] || '',
          post_time: row['post_time'] || null,
          apply_deadline: row['apply_deadline'] || null,
          jd_link: row['jd_original_link'] || '',
          post_category: row['post_category'] || '',
          party_label: row['party_label'] || ''
        };
        
        jobs.push(job);
      } catch (err) {
        errorCount++;
        errors.push({ row: i, error: err.message });
      }
    }
    
    // 批量插入
    if (jobs.length > 0) {
      const { error } = await supabase.from('jobs').insert(jobs);
      if (error) {
        console.error(`插入批次 ${i/batchSize + 1} 失败:`, error);
        errorCount += jobs.length;
      } else {
        successCount += jobs.length;
        console.log(`已导入 ${successCount} / ${data.length}`);
      }
    }
  }
  
  console.log('\n导入完成!');
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\n错误详情:');
    errors.slice(0, 10).forEach(e => console.log(`行 ${e.row}: ${e.error}`));
  }
}

importJobs().catch(console.error);
