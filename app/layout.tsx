import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Warko — Gestion commerciale',
  description: 'Plateforme de gestion pour commerces vendant via les réseaux sociaux',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full bg-gray-50 font-sans">{children}</body>
    </html>
  )
}
