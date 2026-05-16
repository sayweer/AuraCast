// ─── Database Models ───────────────────────────────────

export interface Creator {
  id: string
  wallet_address: string
  creator_name: string
  voice_id: string
  price_lamports: number
  is_active: boolean
  total_earned: number
  total_messages: number
  created_at: string
  block_adult: boolean
  block_profanity: boolean
  block_political: boolean
  language: string
}

export interface Purchase {
  id: string
  buyer_wallet: string
  creator_wallet: string
  tx_signature: string
  fan_text: string
  audio_url: string | null
  status: PurchaseStatus
  amount_lamports: number
  created_at: string
}

export type PurchaseStatus =
  | 'pending'
  | 'completed'
  | 'refunded'
  | 'rejected'

// ─── Moderation ────────────────────────────────────────

export type ModerationCategory =
  | 'profanity'
  | 'sexual'
  | 'political'
  | 'violence'
  | 'spam'
  | 'fraud'

export interface ModerationResult {
  isSafe: boolean
  category?: ModerationCategory
  reason?: string
  processingMs: number
}

// ─── ElevenLabs ────────────────────────────────────────

export interface VoiceSettings {
  stability: number
  similarity_boost: number
}

export interface GenerateSpeechOptions {
  voiceId: string
  text: string
  language?: string
  voiceSettings?: Partial<VoiceSettings>
}

export interface GenerateSpeechResult {
  audioBase64: string
  durationMs: number
}

// ─── API Requests / Responses ──────────────────────────

export interface RegisterCreatorRequest {
  walletAddress: string
  creatorName: string
  audioBase64: string
  fileName: string
  priceInLamports: number
  language?: string
}

export interface RegisterCreatorResponse {
  success: boolean
  voiceId?: string
  creatorId?: string
  error?: string
}

export interface GenerateVoiceRequest {
  creatorWallet: string
  fanText: string
  txSignature: string
  buyerWallet: string
}

export interface GenerateVoiceResponse {
  success: boolean
  audioBase64?: string
  error?: string
  refundNeeded?: boolean
}

// ─── Solana Blink (Actions Spec) ───────────────────────

export interface ActionParameter {
  name: string
  label: string
  required: boolean
}

export interface ActionLink {
  label: string
  href: string
  parameters?: ActionParameter[]
}

export interface ActionGetResponse {
  icon: string
  title: string
  description: string
  label: string
  links: {
    actions: ActionLink[]
  }
}

export interface ActionPostResponse {
  transaction: string
  message: string
}
