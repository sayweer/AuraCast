# 🎙 AuraCast
> License your voice. Earn while you sleep.
Built on Solana · Powered by ElevenLabs · Protected by Llama 3.1 (Groq)

## Overview
AuraCast is a Web3 voice licensing platform. Creators clone their voice once, set a price in SOL, and earn SOL every time a fan requests a personalized AI-generated voice message via their dedicated Fan Page. AuraCast features a selectable bilingual interface (English and Turkish) and filters all requests through an AI moderation firewall before audio is generated.

## How It Works

### Creator Flow
1. Read/record a voice sample → ElevenLabs clones it
2. Set price in SOL (e.g., per 150 characters) and brand safety filters
3. Get a dedicated Fan Page link → share anywhere

### Fan Flow
1. Click the Fan Page link
2. Type message → approve SOL payment via connected Phantom wallet
3. AI moderates text for safety checks (<800ms)
4. ElevenLabs generates audio in the creator's voice
5. Fan plays and downloads the generated audio clip

## Tech Stack
| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Dashboard, Fan/Play views, & API routes |
| Blockchain | Solana Devnet | Wallet connections, transactions & payments |
| Voice AI | ElevenLabs IVC | Instant Voice Cloning & text-to-speech |
| Moderation | Llama 3.1 8B (Groq) | Brand safety AI firewall |
| Database | Supabase (Postgres) | Creator profiles, settings, & transaction records |
| Rate Limiting | Upstash Redis | Persistent API rate limiting |
| Styling | Tailwind CSS | Modern glassmorphism UI |

## Architecture
```
[Creator]
    ↓ records voice sample
[ElevenLabs IVC] → voice_id stored in Supabase
    ↓
[Fan Page link] → shared on social media

[Fan visits Fan Page]
    ↓ types message + approves SOL
[Solana Transaction] → 90% creator wallet / 10% platform wallet
    ↓
[Llama 3.1 Moderation]
    ├── UNSAFE → Transaction fails, request rejected
    └── SAFE → ElevenLabs TTS generates audio
                    ↓
              Fan plays audio on play screen
```

## Bilingual Support (TR/EN)
AuraCast has full bilingual capabilities. Users can dynamically switch between English and Turkish:
- Persists user preferences locally via `localStorage` under `auracast_lang`.
- Responsive floating glassmorphism `<LanguageToggle />` button.
- Comprehensive UI localization covering landing, onboarding, analytics charts, settings, creator dashboard, and purchase playback pages.

## Getting Started

### Prerequisites
- Node.js 18+
- Solana CLI + Phantom wallet (devnet)
- ElevenLabs account & API key
- Groq account & API key
- Supabase project
- Upstash Redis database (for rate limiting)

### Installation
```bash
git clone https://github.com/sayweer/auracast
cd auracast
npm install
cp .env.local.example .env.local
npm run dev
```

### Environment Variables
Configure your `.env.local` file with the following:

| Variable | Description | Where to get |
|---|---|---|
| ELEVENLABS_API_KEY | ElevenLabs API key | elevenlabs.io/app/settings |
| GROQ_API_KEY | Groq API key | console.groq.com |
| SUPABASE_URL | Supabase project URL | supabase.com dashboard |
| SUPABASE_ANON_KEY | Supabase anon key | supabase.com dashboard |
| SOLANA_RPC_URL | Solana devnet RPC endpoint | api.devnet.solana.com |
| NEXT_PUBLIC_SOLANA_RPC_URL | Solana devnet RPC endpoint (Client-side) | api.devnet.solana.com |
| PLATFORM_WALLET | Platform fee wallet address | Phantom / Sollet wallet |
| UPSTASH_REDIS_REST_URL | Upstash Redis REST URL | console.upstash.com |
| UPSTASH_REDIS_REST_TOKEN | Upstash Redis REST token | console.upstash.com |

### Database Setup
Run the SQL script in `lib/schema.sql` inside your Supabase SQL editor.

## API Reference

```
POST /api/creator/register
Body: { walletAddress, creatorName, audioBase64, fileName, priceInLamports }

GET /api/creator/[walletAddress]
Returns creator info by wallet address.

PATCH /api/creator/update-price
Body: { walletAddress, signature, priceInLamports }

PATCH /api/creator/update-filters
Body: { walletAddress, signature, blockAdult, blockProfanity, blockPolitical }

DELETE /api/creator/delete-voice
Body: { walletAddress, signature }

POST /api/voice/generate
Body: { creatorWallet, fanText, txSignature, buyerWallet }

POST /api/voice/play/[purchaseId]
Increments play counts for the audio clip.
```