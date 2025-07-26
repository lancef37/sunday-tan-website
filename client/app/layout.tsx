import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sunday Tan - Professional Mobile Spray Tan',
  description: 'Book your professional mobile spray tan appointment with Sunday Tan',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-tan-cream">
          {children}
        </main>
      </body>
    </html>
  )
}