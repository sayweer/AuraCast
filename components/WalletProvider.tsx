'use client'

import { FC, ReactNode, useMemo } from 'react'
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { clusterApiUrl } from '@solana/web3.js'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import {
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
} from '@solana-mobile/wallet-adapter-mobile'
import '@solana/wallet-adapter-react-ui/styles.css'

interface Props { children: ReactNode }

type Network = 'devnet' | 'mainnet-beta'

function resolveNetwork(): Network {
  const raw = process.env.NEXT_PUBLIC_SOLANA_NETWORK
  return raw === 'mainnet-beta' ? 'mainnet-beta' : 'devnet'
}

export const SolanaWalletProvider: FC<Props> = ({ children }) => {
  const network = resolveNetwork()
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
    ?? clusterApiUrl(network)

  const wallets = useMemo(
    () => [
      new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'AuraCast',
          uri: typeof window !== 'undefined' ? window.location.origin : '',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        chain: network === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet',
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      }),
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [network]
  )

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
