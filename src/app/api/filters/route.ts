import { NextResponse } from 'next/server'

export const runtime = 'nodejs';

const SUPABASE_URL = 'https://gpwekhlltsvoalmqzjyv.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1Nzc0NiwiZXhwIjoyMDkyMzMzNzQ2fQ.-hP6eVgWEUsYkM9pyVkXPT9bMP_ek30_wgOeZ0PL1X4'

let cache: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 3600 * 1000

function groupExperience(raw: Record<string, number>): { label: string; value: string; count: number }[] {
  const categories: Record<string, { label: string; keywords: string[]; count: number }> = {
    '\u5e94\u5c4a\u751f': { label: '\u5e94\u5c4a\u751f', keywords: ['\u5e94\u5c4a'], count: 0 },
    '1-3\u5e74': { label: '1-3\u5e74', keywords: ['1-3', '1\u5e74', '1-2'], count: 0 },
    '3-5\u5e74': { label: '3-5\u5e74', keywords: ['3-5', '3\u5e74\u53ca', '3\u5e74\u4ee5\u4e0a', '4\u5e74'], count: 0 },
    '5\u5e74\u4ee5\u4e0a': { label: '5\u5e74\u4ee5\u4e0a', keywords: ['5-', '5\u5e74\u53ca', '5\u5e74\u4ee5\u4e0a', '6\u5e74', '7\u5e74', '8\u5e74', '10\u5e74'], count: 0 },
    '\u4e0d\u9650': { label: '\u4e0d\u9650', keywords: ['\u4e0d\u9650'], count: 0 },
  }

  for (const [val, cnt] of Object.entries(raw)) {
    let matched = false
    for (const [catKey, cat] of Object.entries(categories)) {
      if (catKey === '\u4e0d\u9650' && val === '\u4e0d\u9650') { cat.count += cnt; matched = true; break }
      if (catKey !== '\u4e0d\u9650') {
        for (const kw of cat.keywords) { if (val.includes(kw)) { cat.count += cnt; matched = true; break } }
      }
      if (matched) break
    }
  }

  return Object.entries(categories).filter(([_, cat]) => cat.count > 0).map(([key, cat]) => ({ label: cat.label, value: key, count: cat.count })).sort((a, b) => b.count - a.count)
}

function dedupeAndPrependDefault(
  items: { label: string; value: string; count: number }[],
  defaultLabel: string,
  defaultValue: string
): { label: string; value: string; count: number }[] {
  const filtered = items.filter(item => item.value !== defaultValue)
  const totalCount = filtered.reduce((sum, item) => sum + item.count, 0)
  return [
    { label: defaultLabel, value: defaultValue, count: totalCount },
    ...filtered,
  ]
}

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data, { headers: { 'Cache-Control': 'public, max-age=3600' } })
    }
    const headers = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    const fetchAll = async (select: string): Promise<any[]> => {
      const all: any[] = []
      for (let offset = 0; offset < 20000; offset += 1000) {
        const res = await fetch(SUPABASE_URL + '/rest/v1/job_descriptions?select=' + select + '&limit=1000&offset=' + offset, { headers })
        if (!res.ok) throw new Error('Supabase query failed: ' + res.status)
        const data = await res.json()
        if (!data.length) break
        all.push(...data)
      }
      return all
    }

    const [indData, cityData, eduData, expData, compData] = await Promise.all([fetchAll('industry'), fetchAll('city'), fetchAll('education'), fetchAll('experience'), fetchAll('company_type')])

    const countAndSort = (data: Array<Record<string, string | null>>, key: string) => {
      const counts: Record<string, number> = {}
      for (const item of data) { const val = item[key]; if (val && val.trim()) { counts[val] = (counts[val] || 0) + 1 } }
      return Object.entries(counts).map(([label, count]) => ({ label, value: label, count })).sort((a, b) => b.count - a.count)
    }

    const rawExpCounts: Record<string, number> = {}
    for (const item of expData) { const val = item['experience']; if (val && val.trim()) { rawExpCounts[val] = (rawExpCounts[val] || 0) + 1 } }

    const rawIndustries = countAndSort(indData, 'industry')
    const rawCities = countAndSort(cityData, 'city')
    const rawEducation = countAndSort(eduData, 'education')
    const rawExperience = groupExperience(rawExpCounts)
    const rawCompanyTypes = countAndSort(compData, 'company_type')

    const industries = dedupeAndPrependDefault(rawIndustries, "全部", "全部")
    const cities = dedupeAndPrependDefault(rawCities, "全国", "全国")
    const education = dedupeAndPrependDefault(rawEducation, "不限", "不限")
    const experience = dedupeAndPrependDefault(rawExperience, "不限", "不限")
    const companyTypes = dedupeAndPrependDefault(rawCompanyTypes, "全部", "全部")

    const result = {
      industries,
      cities,
      education,
      experience,
      companyTypes,
    }

    cache = { data: result, timestamp: Date.now() }
    return NextResponse.json(result, { headers: { 'Cache-Control': 'public, max-age=3600' } })
  } catch (error) {
    console.error('Error fetching filters:', error)
    return NextResponse.json({ error: 'Failed to fetch filter options' }, { status: 500 })
  }
}
