# 🎙 AuraCast
> License your voice. Earn while you sleep.
Built on Solana · Powered by ElevenLabs · Protected by Claude

## Overview
AuraCast is a Web3 voice licensing platform. Creators clone their voice once, set a price, and earn SOL every time a fan requests a personalized AI-generated voice message — directly from X/Twitter via Solana Blinks. Every request passes through a Claude AI moderation firewall before audio is ever generated.

## How It Works

### Creator Flow
1. Upload 2min voice sample → ElevenLabs clones it
2. Set price in SOL
3. Get a Blink URL → share anywhere

### Fan Flow
1. Click Blink in X feed
2. Type message → approve SOL payment in Phantom
3. Claude moderates text (<800ms)
4. ElevenLabs generates audio in creator's voice
5. Fan hears it instantly

## Tech Stack
| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Dashboard + API routes |
| Blockchain | Solana + @solana/actions | Blinks + payments |
| Voice AI | ElevenLabs IVC | Voice cloning + TTS |
| Moderation | Anthropic Claude Haiku | Brand safety firewall |
| Database | Supabase (Postgres) | Creator + purchase data |
| Styling | Tailwind CSS | UI |

## Architecture
```
[Creator]
    ↓ upload voice sample
[ElevenLabs IVC] → voice_id stored in Supabase
    ↓
[Blink URL generated] → shared on X

[Fan sees Blink in X feed]
    ↓ types message + approves SOL
[Solana TX] → 90% creator wallet / 10% platform wallet
    ↓
[Claude Haiku moderation]
    ├── UNSAFE → TX reverts, SOL refunded
    └── SAFE → ElevenLabs TTS generates audio
                    ↓
              Fan hears audio in feed
```

## Getting Started

### Prerequisites
- Node.js 18+
- Solana CLI + Phantom wallet (devnet)
- ElevenLabs account
- Anthropic account
- Supabase project

### Installation
```bash
git clone https://github.com/sayweer/auracast
cd auracast
npm install
cp .env.local.example .env.local
npm run dev
```

### Environment Variables
| Variable | Description | Where to get |
|---|---|---|
| ELEVENLABS_API_KEY | ElevenLabs API key | elevenlabs.io/app/settings |
| ANTHROPIC_API_KEY | Anthropic API key | console.anthropic.com |
| SUPABASE_URL | Supabase project URL | supabase.com dashboard |
| SUPABASE_ANON_KEY | Supabase anon key | supabase.com dashboard |
| SOLANA_RPC_URL | Solana RPC endpoint | devnet provided |
| PLATFORM_WALLET | Your wallet address | receives 10% protocol fee |

### Database Setup
Run the SQL in `lib/schema.sql` in your Supabase SQL editor.

## API Reference

```
POST /api/creator/register
Body: { walletAddress, creatorName, audioBase64, fileName, priceInLamports }

GET /api/creator/[walletAddress]
Returns creator info by wallet address.

POST /api/voice/generate
Body: { creatorWallet, fanText, txSignature, buyerWallet }

GET+POST /api/actions/voice/[creatorWallet]
Solana Blink endpoint. GET returns action metadata, POST returns unsigned transaction.
```

## Hackathon
Built solo at Dev3pack Global Hackathon — Bursa, May 2026  
Sponsors: Solana · ElevenLabs · Anthropic

## License
MIT
