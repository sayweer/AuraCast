import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { getCreatorByWallet } from '@/lib/supabase'
import { getErrorResponse } from '@/lib/errors'
import { isValidWalletAddress } from '@/lib/validation'

export const dynamic = 'force-dynamic'

/**
 * Public Metaplex-compatible metadata for a creator's Voice License NFT.
 *
 * Keyed by walletAddress (NOT the voice secret) — the NFT's on-chain `uri` field
 * is permanent, so embedding the raw reference key / voice_id there would leak it
 * forever. Instead we publish a one-way SHA-256 "Voice Fingerprint" that binds
 * the license to the specific voice without exposing it. Voclira holds the
 * pre-image (the R2 reference key, or a legacy ElevenLabs voice_id) and can prove
 * the binding when needed.
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
    if (creator === null) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }
    // Zero-shot creators have no voice_id; their permanent secret is the R2 reference key.
    // Legacy ElevenLabs creators fall back to voice_id so existing NFT fingerprints stay stable.
    const voiceSecret = creator.voice_profile_object_key || creator.voice_id
    if (!voiceSecret) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    const fingerprint = createHash('sha256')
      .update(`${voiceSecret}:${walletAddress}`)
      .digest('hex')

    const issuedDate = creator.created_at.slice(0, 10)
    const origin = _req.nextUrl.origin

    const metadata = {
      name: 'Voclira Voice License',
      description:
        'On-chain voice license issued on Voclira — the Web3 voice licensing platform. ' +
        'This NFT certifies that the holder cloned and licensed their voice through Voclira.',
      image: `${origin}/voice-license-nft.svg`,
      external_url: origin,
      attributes: [
        { trait_type: 'Voice Fingerprint', value: fingerprint },
        { trait_type: 'Creator', value: walletAddress },
        { trait_type: 'Platform', value: 'Voclira' },
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
