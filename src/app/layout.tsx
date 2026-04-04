import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600', '700'],
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['300', '400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'Thinking Partner',
  description: 'AI-powered knowledge graph and thinking partner.',
  manifest: '/manifest.json',
  icons: {
    apple: '/icon-192.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Thinking Partner',
  },
  openGraph: {
    title: 'Thinking Partner',
    description: 'Capture ideas. Build your knowledge graph. Get AI insights.',
    type: 'website',
    siteName: 'Thinking Partner',
  },
  twitter: {
    card: 'summary',
    title: 'Thinking Partner',
    description: 'Capture ideas. Build your knowledge graph. Get AI insights.',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0a0a14' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a14' },
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
    <html lang="en" className={`${sans.variable} ${mono.variable} dark`} suppressHydrationWarning>
      <body className={sans.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
