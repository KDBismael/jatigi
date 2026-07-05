import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Warko — Gestion commerciale',
  description: 'Plateforme de gestion pour commerces vendant via les réseaux sociaux',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full bg-gray-50 font-sans">{children}</body>
    </html>
  )
}
