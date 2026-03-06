'use client'

import { ReduxProvider } from './ReduxProvider'
import { SupabaseProvider } from './SupabaseProvider'
import { ThemeProvider } from './ThemeProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <SupabaseProvider>
        <ThemeProvider defaultTheme="system" storageKey="life-organizer-theme">
          {children}
        </ThemeProvider>
      </SupabaseProvider>
    </ReduxProvider>
  )
}

export { useSupabase } from './SupabaseProvider'
export { useTheme } from './ThemeProvider'
