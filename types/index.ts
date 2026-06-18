// ─── Database Models ───────────────────────────────────

// How the voice was cloned. IVC = Instant Voice Cloning (synchronous, ~90s sample).
// PVC = Professional Voice Cloning (asynchronous, 30min+ samples, captcha + training).
export type CloneType = 'ivc' | 'pvc'

// Lifecycle of a creator's voice. IVC voices are 'ready' immediately. PVC voices
// progress: pending_verification (captcha needed) → training (2-6h) → ready / failed.
export type VoiceStatus = 'ready' | 'pending_verification' | 'training' | 'failed'

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
  clone_type: CloneType
  voice_status: VoiceStatus
  // Chatterbox/Fal migration: R2 private object key for the zero-shot reference WAV.
  voice_profile_object_key: string | null
  // Consent / rıza kaydı (KVKK/GDPR).
  consent_at: string | null
  consent_ip: string | null
  consent_text_version: string | null
  verification_audio_object_key: string | null
  allowed_usage: string | null
  revoked_at: string | null
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
  // Chatterbox/Fal migration: generation tracking.
  generation_engine: string | null
  provider_request_id: string | null
  provider_error_type: string | null
  input_char_count: number | null
  error_message: string | null
  generation_attempt_count: number
  retry_count: number
  generation_started_at: string | null
  generation_completed_at: string | null
  audio_deleted_at: string | null
  takedown_reason: string | null
}

export type PurchaseStatus =
  | 'pending'
  | 'completed'
  | 'failed'
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

export type Mood =
  | 'happy'
  | 'excited'
  | 'calm'
  | 'sad'
  | 'angry'
  | 'romantic'

// ─── API Requests / Responses ──────────────────────────

export interface RegisterCreatorRequest {
  walletAddress: string
  creatorName: string
  priceInLamports: number
  language?: string
  // Chatterbox/Fal onboarding: reference + consent WAVs are uploaded to R2 first;
  // register consumes the one-time upload sessions instead of receiving base64 audio.
  uploadSessionId: string
  verificationUploadSessionId: string
  consentTextVersion: string
}

export interface RegisterCreatorResponse {
  success: boolean
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


