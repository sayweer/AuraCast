export class VocliraError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message)
    this.name = 'VocliraError'
  }
}

export class ModerationError extends VocliraError {
  constructor(
    message: string,
    public readonly category?: string
  ) {
    super(message, 'MODERATION_ERROR', 400)
    this.name = 'ModerationError'
  }
}

export class UnsafeContentError extends VocliraError {
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

export class TtsError extends VocliraError {
  constructor(
    message: string,
    public readonly providerErrorType?: string
  ) {
    super(message, 'TTS_ERROR', 502)
    this.name = 'TtsError'
  }
}

export class StorageError extends VocliraError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR', 502)
    this.name = 'StorageError'
  }
}

export class TransactionVerificationError extends VocliraError {
  constructor(txSignature: string) {
    super(
      `Transaction could not be verified: ${txSignature}`,
      'TX_VERIFICATION_FAILED',
      400
    )
    this.name = 'TransactionVerificationError'
  }
}

export class CreatorNotFoundError extends VocliraError {
  constructor(wallet: string) {
    super(
      `Creator not found: ${wallet}`,
      'CREATOR_NOT_FOUND',
      404
    )
    this.name = 'CreatorNotFoundError'
  }
}

// Helper — used in API routes to convert errors to safe client responses
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
  if (error instanceof VocliraError) {
    // For 500-level errors, sanitize the message to avoid leaking internals
    const safeMessage = error.statusCode >= 500
      ? 'An internal error occurred'
      : error.message
    return {
      error: safeMessage,
      code: error.code,
      refundNeeded: false,
      statusCode: error.statusCode
    }
  }
  // Log unexpected errors server-side for debugging
  console.error('[Voclira] Unexpected error:', error)
  return {
    error: 'Unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    refundNeeded: false,
    statusCode: 500
  }
}
