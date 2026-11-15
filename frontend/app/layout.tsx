import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Orbitron } from 'next/font/google'
import './globals.css'
import { ToastProvider } from './components/ui/Toast'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
})

// Only used for the wordmark
const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-orbitron',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RAG.NEXUS — Chat with your documents',
  description: 'Upload PDFs, ask questions, and get answers grounded in your documents — with sources and quality scores.',
}

export const viewport: Viewport = {
  themeColor: '#04060c',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} ${orbitron.variable}`}>
      <body className="bg-bg text-ink antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
