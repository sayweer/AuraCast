import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { WalletProviderDynamic } from '@/components/WalletProviderDynamic'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'AuraCast - License Your Voice on Solana',
  description: 'Web3 voice licensing platform. Create your voice clone, earn SOL from fan requests.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
        <WalletProviderDynamic>
          {children}
        </WalletProviderDynamic>
      </body>
    </html>
  )
}
