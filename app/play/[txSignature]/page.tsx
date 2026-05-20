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
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-3xl font-extrabold text-rose-500">Ses Klibi Bulunamadı</h1>
          <p className="text-muted-foreground text-sm">
            İşlem imzasına ait herhangi bir ses kaydı veritabanımızda bulunamadı. Lütfen adresi kontrol edin veya işlemin tamamlandığından emin olun.
          </p>
          <Link href="/" className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-secondary transition-colors">
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    )
  }

  const creator = await getCreatorByWallet(purchase.creator_wallet)

  return (
    <PlayScreen 
      purchase={purchase} 
      creatorName={creator?.creator_name || 'AuraCast Yaratıcısı'} 
    />
  )
}
