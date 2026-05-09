# 🎙 AuraCast
### License your voice. Earn while you sleep.
> Built at Dev3pack Global Hackathon — Bursa, May 2026

---

## 🚨 The Problem

**Deepfakes are destroying creator trust.**
Celebrities' voices are being cloned without consent — used 
for scams, political propaganda, adult content. Creators can't 
stop it, and they know it's happening.

Meanwhile, a creator with 2M followers gets 10,000 DMs asking 
for personalized voice messages. They can't fulfill a single one.

Two massive problems. Zero solutions. Until now.

---

## ✅ The Solution

AuraCast turns the deepfake threat into a revenue stream.

Creators upload their voice once. Our system clones it with 
ElevenLabs, wraps it in an AI moderation firewall (Claude), 
and makes it purchasable via Solana Blinks — directly inside 
X/Twitter feeds. No app. No redirect. One click.

**The creator earns SOL. The fan gets a personalized voice 
message. The brand stays 100% safe.**

---

## 🔄 Full User Flow

**Creator side (one time):**
1. Upload 2 min voice sample → ElevenLabs clones the voice
2. Set price (e.g. 0.5 SOL per message)
3. Share your Blink URL on X

**Fan side (every time):**
1. See the Blink in their X feed
2. Type a message → click "Generate"
3. Phantom wallet opens → approve SOL payment
4. Claude moderates the text in <800ms
5. ElevenLabs generates audio in creator's voice
6. Fan hears it instantly — never left their feed

---

## 🛡 Brand Safety Firewall

Every single request passes through Claude Haiku before 
touching ElevenLabs. If the text contains profanity, sexual 
content, political propaganda or fraud — the transaction 
reverts, SOL is refunded, audio is never generated.

The creator's voice cannot be used against them. This is the 
core trust mechanism that makes creators willing to participate.

---

## ⚡ Why Only Solana

| Requirement | Why Solana |
|---|---|
| Micro-payments | $0.00025 fees — economically viable at $0.50/tx |
| Speed | Sub-second finality — audio ready before user blinks |
| Blinks | Only chain with native in-feed payment UI |
| Composability | On-chain voice registry, future DAO governance |

---

## 💰 Business Model

- **10% protocol fee** on every voice generation (auto-split in smart contract)
- **Premium creator tier** (future): monthly subscription → fee drops to 2%
- **TAM reference**: Cameo hit $100M revenue proving fans pay for personalized creator content

---

## 🏗 What We Actually Built

- ✅ Solana smart contract — handles 90/10 payment split on-chain
- ✅ ElevenLabs IVC — voice cloning + turbo TTS generation
- ✅ Claude Haiku moderation — <800ms brand safety firewall  
- ✅ Solana Blink — working end-to-end on devnet
- ✅ Creator dashboard — register, monitor earnings, manage settings
- ✅ Next.js API layer — connects everything together

---

## 🎬 Try The Demo

1. Open → https://auracast-murex.vercel.app
2. See demo creator **"Sarco"** already registered
3. Copy the Blink URL → open in browser
4. Type any message → pay on devnet
5. Hear it in Sarco's voice

---

## 🛠 Sponsors Used

| Sponsor | How |
|---|---|
| **Solana** | Actions/Blinks — in-feed payment + smart contract |
| **ElevenLabs** | Instant Voice Cloning + eleven_turbo_v2 TTS |
| **Anthropic** | Claude Haiku — real-time content moderation |

---

## 👤 Builder
**Sayweer** — Dev3pack Global Hackathon, Bursa, May 2026
