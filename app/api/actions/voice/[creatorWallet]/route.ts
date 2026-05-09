import { NextRequest, NextResponse } from 'next/server'
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js'
import { getCreatorByWallet } from '@/lib/supabase'
import { lamportsToSol } from '@/lib/solana'
import { getErrorResponse } from '@/lib/errors'
import type { ActionGetResponse, ActionPostResponse } from '@/types'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-action-version, x-blockchain-ids',
}

export async function OPTIONS(): Promise<NextResponse> {
  return NextResponse.json(null, { status: 200, headers: CORS_HEADERS })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { creatorWallet: string } }
): Promise<NextResponse> {
  try {
    const creator = await getCreatorByWallet(params.creatorWallet)
    if (creator === null) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404, headers: CORS_HEADERS })
    }

    const priceInSol = lamportsToSol(creator.price_lamports)

    const body: ActionGetResponse = {
      icon: 'https://auracast.xyz/icon.png',
      title: `Get a voice message from ${creator.creator_name}`,
      description: `Receive a personalized AI voice message from ${creator.creator_name}. Price: ${priceInSol} SOL. Protected by AI brand safety.`,
      label: 'Generate Voice Message',
      links: {
        actions: [
          {
            label: 'Send Message',
            href: `/api/actions/voice/${params.creatorWallet}?text={text}`,
            parameters: [
              {
                name: 'text',
                label: 'Your message (max 300 characters)',
                required: true,
              },
            ],
          },
        ],
      },
    }

    return NextResponse.json(body, { status: 200, headers: CORS_HEADERS })
  } catch (error) {
    const { error: message, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: message }, { status: statusCode, headers: CORS_HEADERS })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { creatorWallet: string } }
): Promise<NextResponse> {
  try {
    const { account } = (await req.json()) as { account: string }
    const text = req.nextUrl.searchParams.get('text') ?? ''

    const creator = await getCreatorByWallet(params.creatorWallet)
    if (creator === null) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404, headers: CORS_HEADERS })
    }

    const connection = new Connection(
      process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com',
      'confirmed'
    )

    const transaction = new Transaction()
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(account),
        toPubkey: new PublicKey(params.creatorWallet),
        lamports: creator.price_lamports,
      })
    )
    transaction.feePayer = new PublicKey(account)
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

    const base64Tx = transaction
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString('base64')

    const body: ActionPostResponse = {
      transaction: base64Tx,
      message: `Approve to get a voice message from ${creator.creator_name}!`,
    }

    return NextResponse.json(body, { status: 200, headers: CORS_HEADERS })
  } catch (error) {
    const { error: message, statusCode } = getErrorResponse(error)
    return NextResponse.json({ error: message }, { status: statusCode, headers: CORS_HEADERS })
  }
}
