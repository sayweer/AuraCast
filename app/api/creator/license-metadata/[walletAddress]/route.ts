import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getCreatorByWallet } from '@/lib/supabase'
import { getErrorResponse } from '@/lib/errors'
import { isValidWalletAddress } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * Public Metaplex-compatible metadata for a creator's Voice License NFT.
 *
 * Keyed by walletAddress (NOT voice_id) — the NFT's on-chain `uri` field is
 * permanent, so embedding the raw ElevenLabs voice_id there would leak it
 * forever. Instead we publish a one-way SHA-256 "Voice Fingerprint" that binds
 * the license to the specific voice without exposing it. AuraCast holds the
 * pre-image (voice_id) and can prove the binding when needed.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { walletAddress: string } }
): Promise<NextResponse> {
  const { walletAddress } = params

  if (!isValidWalletAddress(walletAddress)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }

  try {
    const creator = await getCreatorByWallet(walletAddress)
    if (creator === null || !creator.voice_id) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const fingerprint = createHash('sha256')
      .update(`${creator.voice_id}:${walletAddress}`)
      .digest('hex')

    const issuedDate = creator.created_at.slice(0, 10)
    const origin = _req.nextUrl.origin

    const metadata = {
      name: 'AuraCast Voice License',
      description:
        'On-chain voice license issued on AuraCast — the Web3 voice licensing platform. ' +
        'This NFT certifies that the holder cloned and licensed their voice through AuraCast.',
      image: `${origin}/voice-license-nft.svg`,
      external_url: origin,
      attributes: [
        { trait_type: 'Voice Fingerprint', value: fingerprint },
        { trait_type: 'Creator', value: walletAddress },
        { trait_type: 'Platform', value: 'AuraCast' },
        { trait_type: 'License Type', value: 'Voice Clone' },
        { trait_type: 'Issued', value: issuedDate },
      ],
    }

    return NextResponse.json(metadata, {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=300' },
    })
  } catch (error) {
    const { error: message, code, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: message, code }, { status: statusCode })
  }
}
