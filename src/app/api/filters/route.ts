import { NextResponse } from 'next/server'

export const runtime = 'edge'

const SUPABASE_URL = 'https://gpwekhlltsvoalmqzjyv.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1Nzc0NiwiZXhwIjoyMDkyMzMzNzQ2fQ.-hP6eVgWEUsYkM9pyVkXPT9bMP_ek30_wgOeZ0PL1X4'

let cache: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 3600 * 1000

export async function GET() {
  try {
    if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
      return NextResponse.json(cache.data, {
        headers: { 'Cache-Control': 'public, max-age=3600' }
      })
    }

    const headers = {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }

    const [indRes, cityRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/job_descriptions?select=industry&limit=20000`, { headers }),
      fetch(`${SUPABASE_URL}/rest/v1/job_descriptions?select=city&limit=20000`, { headers }),
    ])

    if (!indRes.ok || !cityRes.ok) {
      throw new Error(`Supabase query failed: industries=${indRes.status}, cities=${cityRes.status}`)
    }

    const [indData, cityData]: [Array<{ industry: string | null }>, Array<{ city: string | null }>] = await Promise.all([
      indRes.json(),
      cityRes.json(),
    ])

    const countAndSort = (data: Array<Record<string, string | null>>, key: string) => {
      const counts: Record<string, number> = {}
      for (const item of data) {
        const val = item[key]
        if (val && val.trim()) {
          counts[val] = (counts[val] || 0) + 1
        }
      }
      return Object.entries(counts)
        .map(([label, count]) => ({ label, value: label, count }))
        .sort((a, b) => b.count - a.count)
    }

    const result = {
      industries: [
        { label: '全部', value: '全部', count: 0 },
        ...countAndSort(indData as Array<Record<string, string | null>>, 'industry'),
      ],
      cities: [
        { label: '全国', value: '全国', count: 0 },
        ...countAndSort(cityData as Array<Record<string, string | null>>, 'city'),
      ],
    }

    result.industries[0].count = result.industries.reduce((sum, i) => sum + i.count, 0)
    result.cities[0].count = result.cities.reduce((sum, c) => sum + c.count, 0)

    cache = { data: result, timestamp: Date.now() }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=3600' }
    })
  } catch (error) {
    console.error('Error fetching filters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filter options' },
      { status: 500 }
    )
  }
}
