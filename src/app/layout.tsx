import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'Thinking Partner',
  description: 'AI-powered knowledge graph and thinking partner.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Thinking Partner',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#080706' },
    { media: '(prefers-color-scheme: dark)', color: '#080706' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${mono.variable} dark`} suppressHydrationWarning>
      <body className={mono.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
