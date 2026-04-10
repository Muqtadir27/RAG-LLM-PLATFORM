import type { Metadata } from 'next'
import { Orbitron, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '600', '800', '900'],
  variable: '--font-orbitron',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RAG.NEXUS',
  description: 'Neural Query Engine',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${jetbrains.variable}`}>
      <body style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#020408' }}>
        {children}
      </body>
    </html>
  )
}