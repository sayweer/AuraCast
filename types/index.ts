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
  nft_mint: string | null
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
  platform_fee_lamports: number
  play_count: number
  rejection_reason: string | null
  created_at: string
}

export type PurchaseStatus =
  | 'pending'
  | 'completed'
  | 'refunded'
  | 'rejected'

// ─── Analytics ─────────────────────────────────────────

export type AnalyticsRangeDays = 7 | 30 | 90

export interface AnalyticsTimeseriesPoint {
  date: string
  gross_lamports: number
  net_lamports: number
  messages: number
  rejections: number
}

export interface AnalyticsSummary {
  range_days: AnalyticsRangeDays
  total_gross_lamports: number
  total_net_lamports: number
  total_platform_fee_lamports: number
  total_messages: number
  total_completed: number
  total_rejected: number
  total_refunded: number
  total_plays: number
  unique_fans: number
  avg_price_lamports: number
  success_rate: number
}

export interface RecentPurchaseRow {
  id: string
  buyer_wallet: string
  amount_lamports: number
  platform_fee_lamports: number
  play_count: number
  status: PurchaseStatus
  rejection_reason: string | null
  created_at: string
  fan_text?: string
  audio_url?: string | null
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary
  timeseries: AnalyticsTimeseriesPoint[]
  recent: RecentPurchaseRow[]
}

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
  style?: number
}

export type Mood =
  | 'happy'
  | 'excited'
  | 'calm'
  | 'sad'
  | 'angry'
  | 'romantic'

export interface GenerateSpeechOptions {
  voiceId: string
  text: string
  language?: string
  voiceSettings?: Partial<VoiceSettings>
}

export interface GenerateSpeechResult {
  audioBase64: string
  durationMs: number
  modelUsed: string
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
  mood?: Mood
}

export interface GenerateVoiceResponse {
  success: boolean
  audioBase64?: string
  error?: string
  refundNeeded?: boolean
  purchaseId?: string
}


