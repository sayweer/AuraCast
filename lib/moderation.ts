import Anthropic from '@anthropic-ai/sdk'
import type { ModerationResult, ModerationCategory } from '@/types'
import { AuraCastError, ModerationError, UnsafeContentError } from '@/lib/errors'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a brand safety content moderator for a voice licensing platform. Creators have licensed their voices for fan messages only.

Flag as UNSAFE if the text contains:
- Profanity or offensive language (category: profanity)
- Sexual or adult content (category: sexual)
- Political propaganda or divisive content (category: political)
- Violence or threats (category: violence)
- Spam or gibberish (category: spam)
- Impersonation or fraud attempts (category: fraud)

Respond ONLY with valid JSON. No explanation. No markdown.
If safe: {"safe": true}
If unsafe: {"safe": false, "category": "<category>", "reason": "<one sentence explanation>"}`

interface ClaudeModResponse {
  safe: boolean
  category?: ModerationCategory
  reason?: string
}

export function validateTextLength(text: string): void {
  const trimmed = text.trim()
  if (trimmed.length < 5) {
    throw new AuraCastError('Text too short — minimum 5 characters', 'INVALID_TEXT_LENGTH', 400)
  }
  if (trimmed.length > 300) {
    throw new AuraCastError('Text too long — maximum 300 characters', 'INVALID_TEXT_LENGTH', 400)
  }
}

export async function moderateText(text: string): Promise<ModerationResult> {
  const start = Date.now()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 150,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })

  const block = response.content[0]
  if (block.type !== 'text') {
    throw new ModerationError('Unexpected response format from moderation model')
  }

  let parsed: ClaudeModResponse
  try {
    parsed = JSON.parse(block.text) as ClaudeModResponse
  } catch {
    throw new ModerationError('Failed to parse moderation response')
  }

  return {
    isSafe: parsed.safe,
    category: parsed.category,
    reason: parsed.reason,
    processingMs: Date.now() - start,
  }
}

export async function isSafeToGenerate(text: string): Promise<boolean> {
  try {
    const result = await moderateText(text)

    if (!result.isSafe) {
      throw new UnsafeContentError(
        result.category ?? 'unknown',
        result.reason ?? 'Content was flagged as unsafe'
      )
    }

    return true
  } catch (error) {
    if (error instanceof AuraCastError) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'Moderation check failed'
    throw new ModerationError(message)
  }
}
