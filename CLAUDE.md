# AuraCast — Claude Code Context

## What This Project Is
AuraCast is a Web3 voice licensing platform built on Solana.
Creators clone their voice with ElevenLabs, fans purchase 
personalized voice messages via Solana Blinks, Claude Haiku 
moderates every request for brand safety.

## Tech Stack
- Framework: Next.js 14, App Router, TypeScript strict mode
- Blockchain: Solana devnet, @solana/web3.js, @solana/actions
- Voice AI: ElevenLabs Instant Voice Cloning + eleven_turbo_v2_5 (multilingual)
- Moderation: Groq llama-3.1-8b-instant (via groq-sdk)
- Database: Supabase (Postgres)
- Styling: Tailwind CSS

## Project Structure
app/api/creator/ → creator registration endpoints
app/api/voice/generate/ → voice generation endpoint
app/api/actions/voice/ → Solana Blink endpoint
lib/elevenlabs.ts → ElevenLabs service
lib/moderation.ts → Claude moderation service
lib/supabase.ts → DB helpers
types/index.ts → all TypeScript interfaces

## Core Rules — Never Break These
- Always use TypeScript strict mode, no `any` types
- All API routes return NextResponse.json() with proper status codes
- Voice is NEVER generated before moderation passes
- SOL payment split: 90% creator, 10% platform (PLATFORM_WALLET env)
- ElevenLabs model is always "eleven_turbo_v2_5" (multilingual + speed critical)
- Moderation model: "llama-3.1-8b-instant" via Groq API (cost + speed critical)
- No Anchor for hackathon — use SystemProgram.transfer directly
- Audio stored as base64 data URL for hackathon (no S3)
- Git Control: Do NEVER automatically run 'git commit' or 'git push'. I will handle all version control and repository updates manually.

## Environment Variables
ELEVENLABS_API_KEY → ElevenLabs dashboard
ANTHROPIC_API_KEY → console.anthropic.com
SUPABASE_URL → Supabase project settings
SUPABASE_ANON_KEY → Supabase project settings
SOLANA_RPC_URL → https://api.devnet.solana.com
PLATFORM_WALLET → our Solana wallet address (receives 10%)

## Current Status
Project is being built from scratch at hackathon.
Build order: types → supabase → elevenlabs → 
moderation → API routes → Blink → UI