'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'

const WalletProviderInner = dynamic(
  () => import('./WalletProvider').then(m => ({ default: m.SolanaWalletProvider })),
  { ssr: false }
)

export function WalletProviderDynamic({ children }: { children: ReactNode }) {
  return <WalletProviderInner>{children}</WalletProviderInner>
}
