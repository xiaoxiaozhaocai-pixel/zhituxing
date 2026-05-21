import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false },
  })
}

export async function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining?: number }> {
  try {
    const client = getAdminClient()
    const windowStart = new Date(Date.now() - windowMs).toISOString()

    const { count, error: queryError } = await client
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('key', key)
      .gte('created_at', windowStart)

    if (queryError) {
      console.error('Rate limit query error:', queryError)
      return { allowed: true }
    }

    if (count! >= maxRequests) {
      return { allowed: false, remaining: 0 }
    }

    const { error: insertError } = await client
      .from('rate_limits')
      .insert({ key, created_at: new Date().toISOString() })

    if (insertError) {
      console.error('Rate limit insert error:', insertError)
      return { allowed: true }
    }

    const remaining = maxRequests - count! - 1
    return { allowed: true, remaining: Math.max(0, remaining) }
  } catch (err) {
    console.error('Rate limit check failed:', err)
    return { allowed: true }
  }
}
