import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://gpwekhlltsvoalmqzjyv.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1Nzc0NiwiZXhwIjoyMDkyMzMzNzQ2fQ.-hP6eVgWEUsYkM9pyVkXPT9bMP_ek30_wgOeZ0PL1X4'
);

async function main() {
  const { data } = await supabase
    .from('job_descriptions')
    .select('id, job_title, industry, salary_range')
    .ilike('job_title', '%python程序员%')
    .limit(3);
  for (const jd of data || []) {
    console.log(`${jd.job_title} | industry=${jd.industry} | salary=${jd.salary_range}`);
  }
}
main();
