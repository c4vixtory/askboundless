// lib/supabase-server.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase' // make sure this exists

export function createClient() {
  return createServerComponentClient<Database>({ cookies })
}
