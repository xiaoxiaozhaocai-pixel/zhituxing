import { createClient } from '@supabase/supabase-js';
import { matchJobs } from '../src/lib/matching-service';

// Override env vars for direct test
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://gpwekhlltsvoalmqzjyv.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1Nzc0NiwiZXhwIjoyMDkyMzMzNzQ2fQ.-hP6eVgWEUsYkM9pyVkXPT9bMP_ek30_wgOeZ0PL1X4';

async function main() {
  const result = await matchJobs({
    skills: 'Python,SQL',
    limit: 5,
  });
  
  console.log('\n岗位'.padEnd(20) + '总分'.padStart(4) + ' 技能'.padStart(4) + ' 学历'.padStart(4) + ' 专业'.padStart(4) + ' 地点'.padStart(4) + ' 经验'.padStart(4) + ' 薪资'.padStart(4) + '  匹配技能');
  console.log('-'.repeat(90));
  
  for (const m of result) {
    const d = m.dimensions;
    const title = m.jobTitle.slice(0, 18).padEnd(20);
    console.log(`${title}${String(m.totalScore).padStart(4)} ${String(d.skillScore).padStart(4)} ${String(d.educationScore).padStart(4)} ${String(d.majorScore).padStart(4)} ${String(d.locationScore).padStart(4)} ${String(d.experienceScore).padStart(4)} ${String(d.salaryScore).padStart(4)}  ${m.matchedSkills?.join(',')}`);
  }
}
main();
