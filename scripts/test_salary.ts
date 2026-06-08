import { matchJobs } from '../src/lib/matching-service';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://gpwekhlltsvoalmqzjyv.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1Nzc0NiwiZXhwIjoyMDkyMzMzNzQ2fQ.-hP6eVgWEUsYkM9pyVkXPT9bMP_ek30_wgOeZ0PL1X4';

async function main() {
  const result = await matchJobs({ skills: 'Python,SQL', limit: 5, expectedSalary: '8000-12000' });
  for (const m of result) {
    const d = m.dimensions;
    const est = m.salaryEstimation;
    const salaryInfo = est ? `${est.estimatedMin}-${est.estimatedMax}(中位${est.estimatedMedian})` : 'N/A';
    console.log(`${m.jobTitle.slice(0,20).padEnd(20)} total=${String(m.totalScore).padStart(3)} salScore=${String(d.salaryScore).padStart(3)} salEst=${salaryInfo}`);
  }
}
main();
