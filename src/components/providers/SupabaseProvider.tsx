'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAppDispatch } from '@/state/hooks'
import { setSession, setLoading } from '@/state/slices/authSlice'
import type { SupabaseClient, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

type SupabaseContext = {
  supabase: SupabaseClient<Database>
  session: Session | null
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createClient())
  const [session, setLocalSession] = useState<Session | null>(null)
  const dispatch = useAppDispatch()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setLocalSession(session)
      dispatch(setSession(session))
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      setLocalSession(session)
      dispatch(setSession(session))
      dispatch(setLoading(false))
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, dispatch])

  return (
    <Context.Provider value={{ supabase, session }}>
      {children}
    </Context.Provider>
  )
}

export function useSupabase() {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}
