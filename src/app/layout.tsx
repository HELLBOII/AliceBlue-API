import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { APIContextProvider } from '@/contexts/APIContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Alice Blue Trading Platform',
  description: 'Professional trading platform with real-time market data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <APIContextProvider>
          {children}
        </APIContextProvider>
      </body>
    </html>
  )
}
