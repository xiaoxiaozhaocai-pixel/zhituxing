import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gpwekhlltsvoalmqzjyv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1Nzc0NiwiZXhwIjoyMDkyMzMzNzQ2fQ.-hP6eVgWEUsYkM9pyVkXPT9bMP_ek30_wgOeZ0PL1X4'
);

async function main() {
  // 查几个可疑 JD 的硬技能数据
  const { data } = await supabase
    .from('job_descriptions')
    .select('id, job_title, hard_skills, soft_skills')
    .ilike('job_title', '%算法工程师%')
    .limit(3);
  
  for (const jd of data || []) {
    console.log(`\n${jd.job_title} (${jd.id})`);
    console.log(`  hard_skills: ${JSON.stringify(jd.hard_skills)}`);
    console.log(`  soft_skills: ${JSON.stringify(jd.soft_skills)}`);
  }
  
  // 查前端开发
  const { data: fe } = await supabase
    .from('job_descriptions')
    .select('id, job_title, hard_skills, soft_skills')
    .ilike('job_title', '%前端%')
    .limit(3);
  
  for (const jd of fe || []) {
    console.log(`\n${jd.job_title} (${jd.id})`);
    console.log(`  hard_skills: ${JSON.stringify(jd.hard_skills)}`);
  }
}
main();
