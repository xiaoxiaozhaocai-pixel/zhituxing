/**
 * 官方JD同步脚本
 * 功能：从国家官方平台同步真实校招JD
 * 使用方式：node scripts/sync-official-jobs.js
 */

const https = require('https');
const http = require('http');

// 配置
const config = {
  // 国家24365就业服务平台
  ncss: {
    url: 'https://job.ncss.cn/api/job/open/list',
    params: {
      pageNum: 1,
      pageSize: 100,
      jobType: 1, // 1=校招，2=实习
      education: 3 // 3=本科及以上
    }
  }
};

// 同步日志表（如果不存在则创建）
const createSyncLogTable = async () => {
  console.log('检查同步日志表...');
  // 日志记录将通过控制台输出
};

// HTTP请求封装
function httpGet(url, params = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    Object.keys(params).forEach(key => urlObj.searchParams.append(key, params[key]));
    
    console.log(`请求URL: ${urlObj.toString()}`);
    
    https.get(urlObj.toString(), (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          console.error('JSON解析失败:', data.substring(0, 200));
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error('请求失败:', err.message);
      reject(err);
    });
  });
}

// 数据清洗函数
function cleanJobData(rawData) {
  if (!rawData) return null;
  
  // 国家24365平台数据映射
  const jobName = rawData.jobName || rawData.job_name || '';
  const cityName = rawData.cityName || rawData.city_name || '';
  const industryName = rawData.industryName || rawData.industry_name || '';
  
  // 过滤无效数据
  if (!jobName || !cityName) {
    return null;
  }
  
  // 解析薪资
  let salaryMin = 5000;
  let salaryMax = 10000;
  const salaryStr = rawData.salary || rawData.salary_range || '';
  
  if (salaryStr) {
    const match = salaryStr.match(/(\d+)[kK]?\s*[-~至]\s*(\d+)[kK]?/);
    if (match) {
      salaryMin = parseInt(match[1]) * 1000;
      salaryMax = parseInt(match[2]) * 1000;
    } else {
      const singleMatch = salaryStr.match(/(\d+)[kK]?/);
      if (singleMatch) {
        const val = parseInt(singleMatch[1]) * 1000;
        salaryMin = Math.floor(val * 0.8);
        salaryMax = Math.floor(val * 1.2);
      }
    }
  }
  
  // 提取技能
  let skills = rawData.skillRequire || rawData.skills || '';
  if (typeof skills === 'string' && skills.length > 0) {
    // 取前5个技能，逗号分隔
    const skillList = skills.split(/[,，、]/).slice(0, 5).join(',');
    skills = skillList;
  } else {
    skills = '';
  }
  
  // 处理JD内容
  let jdContent = rawData.jobDesc || rawData.jd_content || rawData.job_duty || '';
  if (jdContent.length > 500) {
    jdContent = jdContent.substring(0, 500) + '...';
  }
  
  // 处理城市（只保留城市名）
  let city = cityName.replace(/^(.+?)[省市]/, '$1');
  
  // 处理企业类型
  let companyType = rawData.companyType || rawData.company_type || '民营企业';
  companyType = normalizeCompanyType(companyType);
  
  return {
    job_name: jobName,
    industry: industryName || '互联网',
    city: city,
    company_type: companyType,
    salary_min: salaryMin,
    salary_max: salaryMax,
    skills: skills,
    jd_content: jdContent,
    is_fresh_friendly: 1, // 校招岗位默认应届友好
    source: '国家24365就业平台'
  };
}

// 企业类型标准化
function normalizeCompanyType(type) {
  const mapping = {
    '国有企业': '国有企业',
    '国企': '国有企业',
    '民营企业': '民营企业',
    '民企': '民营企业',
    '上市公司': '上市公司',
    '外资企业': '外资企业',
    '外企': '外资企业',
    '合资企业': '外资企业',
    '事业单位': '事业单位',
    '机关单位': '事业单位'
  };
  return mapping[type] || '民营企业';
}

// 检查是否重复
async function checkDuplicate(job) {
  // 这里需要连接数据库检查
  // 暂时返回false，由调用方处理
  return false;
}

// 同步国家24365平台数据
async function syncFromNcss() {
  console.log('\n========== 开始同步国家24365就业平台 ==========');
  
  try {
    const data = await httpGet(config.ncss.url, config.ncss.params);
    
    if (!data || !data.data || !data.data.list) {
      console.log('未获取到有效数据');
      return { success: 0, failed: 0 };
    }
    
    const jobs = data.data.list;
    console.log(`获取到 ${jobs.length} 条数据`);
    
    let successCount = 0;
    let failedCount = 0;
    let skipCount = 0;
    
    for (const rawJob of jobs) {
      try {
        const job = cleanJobData(rawJob);
        if (!job) {
          skipCount++;
          continue;
        }
        
        // TODO: 插入数据库
        console.log(`准备插入: ${job.job_name} - ${job.city}`);
        successCount++;
        
      } catch (err) {
        console.error(`处理失败:`, err.message);
        failedCount++;
      }
    }
    
    console.log(`同步完成: 成功${successCount}, 失败${failedCount}, 跳过${skipCount}`);
    return { success: successCount, failed: failedCount, skipped: skipCount };
    
  } catch (error) {
    console.error('同步失败:', error.message);
    return { success: 0, failed: 1, error: error.message };
  }
}

// 主函数
async function main() {
  console.log('===========================================');
  console.log('  职途星 - 官方JD同步脚本');
  console.log('  执行时间:', new Date().toLocaleString('zh-CN'));
  console.log('===========================================\n');
  
  // 创建日志表
  await createSyncLogTable();
  
  // 同步各平台数据
  const results = {
    ncss: null
  };
  
  // 同步国家24365
  results.ncss = await syncFromNcss();
  
  // 输出汇总
  console.log('\n========== 同步汇总 ==========');
  console.log(`国家24365平台: 成功${results.ncss?.success || 0}, 失败${results.ncss?.failed || 0}`);
  console.log('==============================');
  
  // 如果是定时任务，可以通过环境变量或参数控制是否写入日志
  const logFile = process.argv.includes('--log');
  if (logFile) {
    const logTime = new Date().toISOString();
    const logContent = `[${logTime}] 同步完成: 国家24365成功${results.ncss?.success || 0}, 失败${results.ncss?.failed || 0}\n`;
    require('fs').appendFileSync('/app/work/logs/bypass/jd-sync.log', logContent);
    console.log('已写入同步日志');
  }
}

// 执行
main().catch(console.error);
