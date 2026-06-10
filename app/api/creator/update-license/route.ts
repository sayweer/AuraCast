import { NextRequest, NextResponse } from 'next/server'
import { getCreatorByWallet, updateCreatorNftMint } from '@/lib/supabase'
import { verifyLicenseMint } from '@/lib/solana'
import { getErrorResponse } from '@/lib/errors'
import { safeParseJson, isValidWalletAddress, isValidTxSignature } from '@/lib/validation'
import { verifyWalletAuthOrSession } from '@/lib/auth'

interface UpdateLicenseBody {
  walletAddress?: string
  nftMint?: string
  txSignature?: string
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const body = await safeParseJson<UpdateLicenseBody>(req)
  if (body === null) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { walletAddress, nftMint, txSignature } = body

  if (!walletAddress || !nftMint || !txSignature) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  // nftMint is a Solana account public key — same base58 shape as a wallet.
  if (!isValidWalletAddress(nftMint)) {
    return NextResponse.json({ error: 'Invalid mint address' }, { status: 400 })
  }

  if (!isValidTxSignature(txSignature)) {
    return NextResponse.json({ error: 'Invalid transaction signature' }, { status: 400 })
  }

  const authorized = await verifyWalletAuthOrSession(walletAddress, req.headers)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const creator = await getCreatorByWallet(walletAddress)
    if (creator === null || !creator.is_active) {
      return NextResponse.json({ error: 'Creator not found or inactive' }, { status: 404 })
    }

    // Verify on-chain: the creator signed a tx that created this NFT mint.
    await verifyLicenseMint(txSignature, nftMint, walletAddress)

    await updateCreatorNftMint(walletAddress, nftMint)

    return NextResponse.json({ success: true, nftMint }, { status: 200 })
  } catch (error) {
    const { error: msg, code, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: msg, code }, { status: statusCode })
  }
}
