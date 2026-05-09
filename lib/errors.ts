export class AuraCastError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'AuraCastError'
  }
}

export class ModerationError extends AuraCastError {
  constructor(
    message: string,
    public readonly category?: string
  ) {
    super(message, 'MODERATION_ERROR', 400)
    this.name = 'ModerationError'
  }
}

export class UnsafeContentError extends AuraCastError {
  constructor(
    public readonly category: string,
    public readonly reason: string
  ) {
    super(
      `Content flagged: ${reason}`,
      'UNSAFE_CONTENT',
      422
    )
    this.name = 'UnsafeContentError'
  }
}

export class ElevenLabsError extends AuraCastError {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message, 'ELEVENLABS_ERROR', 502)
    this.name = 'ElevenLabsError'
  }
}

export class VoiceNotFoundError extends AuraCastError {
  constructor(voiceId: string) {
    super(
      `Voice not found: ${voiceId}`,
      'VOICE_NOT_FOUND',
      404
    )
    this.name = 'VoiceNotFoundError'
  }
}

export class TransactionVerificationError extends AuraCastError {
  constructor(txSignature: string) {
    super(
      `Transaction could not be verified: ${txSignature}`,
      'TX_VERIFICATION_FAILED',
      400
    )
    this.name = 'TransactionVerificationError'
  }
}

export class CreatorNotFoundError extends AuraCastError {
  constructor(wallet: string) {
    super(
      `Creator not found: ${wallet}`,
      'CREATOR_NOT_FOUND',
      404
    )
    this.name = 'CreatorNotFoundError'
  }
}

// Helper — API routes'ta kullanılacak
export function getErrorResponse(error: unknown): {
  error: string
  code: string
  refundNeeded: boolean
  statusCode: number
} {
  if (error instanceof UnsafeContentError) {
    return {
      error: error.message,
      code: error.code,
      refundNeeded: true,
      statusCode: error.statusCode
    }
  }
  if (error instanceof AuraCastError) {
    return {
      error: error.message,
      code: error.code,
      refundNeeded: false,
      statusCode: error.statusCode
    }
  }
  return {
    error: 'Unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    refundNeeded: false,
    statusCode: 500
  }
}
