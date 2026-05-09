'use client'
import dynamic from 'next/dynamic'

const WalletMultiButtonDynamic = dynamic(
  async () => {
    const { WalletMultiButton } = await import('@solana/wallet-adapter-react-ui')
    return WalletMultiButton
  },
  { ssr: false }
)

export function WalletButton() {
  return <WalletMultiButtonDynamic />
}
