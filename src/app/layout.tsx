import type { Metadata, Viewport } from 'next'
import { Manrope, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { initServer } from '@/lib/server-init'
import { ThemeProvider } from '@/components/theme-provider'

const manrope = Manrope({
  variable: '--font-heading',
  subsets: ['latin'],
  display: 'swap',
})

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#0D9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'Call Track — Tele-Calling Command Center',
  description: 'Enterprise Marketing Call & Feedback Tracking Platform',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Call Track' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  initServer()

  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="bg-[var(--bg)] text-[var(--text-primary)] font-sans antialiased min-h-screen selection:bg-[var(--accent)] selection:text-white transition-colors duration-150">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
