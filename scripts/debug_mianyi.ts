import { createClient } from '@supabase/supabase-js';
import { estimateDefaultSalary, parseSalaryRange } from '../src/lib/matching-algorithm';

const supabase = createClient(
  'https://gpwekhlltsvoalmqzjyv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1Nzc0NiwiZXhwIjoyMDkyMzMzNzQ2fQ.-hP6eVgWEUsYkM9pyVkXPT9bMP_ek30_wgOeZ0PL1X4'
);

async function main() {
  // 找几条"面议"或无法解析薪资的JD
  const { data } = await supabase
    .from('job_descriptions')
    .select('id, job_title, industry, salary_range')
    .or('salary_range.ilike.%面议%,salary_range.is.null')
    .eq('status', 'parsed')
    .limit(5);
  
  for (const jd of data || []) {
    const parsed = parseSalaryRange(jd.salary_range || '');
    const defaults = estimateDefaultSalary(jd.industry, jd.job_title);
    console.log(`${jd.job_title.slice(0,25).padEnd(25)} industry=${(jd.industry||'?').padEnd(10)} salary=${jd.salary_range||'NULL'}`);
    console.log(`  parsed=${parsed ? parsed.min+'-'+parsed.max : 'null'}  default=${defaults ? defaults.min+'-'+defaults.max : 'null'}`);
  }
  
  // 也看看无法解析的其他格式
  const { data: weird } = await supabase
    .from('job_descriptions')
    .select('id, job_title, industry, salary_range')
    .eq('status', 'parsed')
    .not('salary_range', 'is', null)
    .limit(20);
  
  let unparseable = 0;
  for (const jd of weird || []) {
    if (!parseSalaryRange(jd.salary_range)) {
      unparseable++;
      if (unparseable <= 5) {
        const defaults = estimateDefaultSalary(jd.industry, jd.job_title);
        console.log(`\n${jd.job_title.slice(0,25).padEnd(25)} industry=${(jd.industry||'?').padEnd(10)} salary=${jd.salary_range}`);
        console.log(`  default=${defaults ? defaults.min+'-'+defaults.max : 'null'}`);
      }
    }
  }
  console.log(`\n总计抽查 ${(weird||[]).length} 条，${unparseable} 条无法解析`);
}
main();
