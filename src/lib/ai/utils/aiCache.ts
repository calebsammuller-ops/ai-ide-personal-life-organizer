import type { SupabaseClient } from '@supabase/supabase-js'

export type CacheType = 'cognitive_mirror' | 'strategy' | 'trajectory'

const TTL_HOURS: Record<CacheType, number> = {
  cognitive_mirror: 24,
  strategy: 12,
  trajectory: 24,
}

export async function getCached<T>(
  supabase: SupabaseClient,
  userId: string,
  type: CacheType
): Promise<T | null> {
  const { data } = await supabase
    .from('knowledge_ai_cache')
    .select('result, expires_at')
    .eq('user_id', userId)
    .eq('cache_type', type)
    .single()
  if (!data) return null
  if (new Date(data.expires_at) < new Date()) return null
  return data.result as T
}

export async function setCache<T>(
  supabase: SupabaseClient,
  userId: string,
  type: CacheType,
  result: T
): Promise<void> {
  const expiresAt = new Date(
    Date.now() + TTL_HOURS[type] * 60 * 60 * 1000
  ).toISOString()
  await supabase.from('knowledge_ai_cache').upsert({
    user_id: userId,
    cache_type: type,
    result,
    generated_at: new Date().toISOString(),
    expires_at: expiresAt,
  }, { onConflict: 'user_id,cache_type' })
}
