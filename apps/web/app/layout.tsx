import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'RailSense — India\'s Railway, Finally Intelligent', template: '%s | RailSense' },
  description: 'AI-powered real-time Indian Railways tracking. Live train positions, cascade delay prediction, and passenger alerts.',
  keywords: ['Indian Railways', 'train tracking', 'real-time', 'IRCTC', 'train delay', 'AI'],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="bg-bg-primary text-text-primary min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
