import { getPurchaseByTxSignature, getCreatorByWallet } from '@/lib/supabase'
import PlayScreen from '@/components/screens/PlayScreen'
import Link from 'next/link'

interface PlayPageProps {
  params: {
    txSignature: string
  }
}

export default async function PlayPage({ params }: PlayPageProps) {
  const purchase = await getPurchaseByTxSignature(params.txSignature)
  
  if (!purchase) {
    return <PlayScreen purchase={null} />
  }

  const creator = await getCreatorByWallet(purchase.creator_wallet)

  return (
    <PlayScreen 
      purchase={purchase} 
      creatorName={creator?.creator_name} 
    />
  )
}
