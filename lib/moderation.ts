import Groq from 'groq-sdk'
import { createHash } from 'crypto'
import type { ModerationResult, ModerationCategory } from '@/types'
import { VocliraError, ModerationError, UnsafeContentError } from '@/lib/errors'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? '',
})

if (!process.env.GROQ_API_KEY) {
  console.warn('[Moderation] GROQ_API_KEY is not set — moderation will fail at runtime')
}

type ModerationFilters = {
  blockAdult?: boolean
  blockProfanity?: boolean
  blockPolitical?: boolean
}

function buildSystemPrompt(filters?: ModerationFilters): string {
  const rules: string[] = []
  if (filters?.blockProfanity !== false)
    rules.push('- Profanity or offensive language (category: profanity)')
  if (filters?.blockAdult !== false)
    rules.push('- Sexual or adult content (category: sexual)')
  if (filters?.blockPolitical !== false)
    rules.push('- Political propaganda or divisive content (category: political)')
  rules.push('- Violence or threats (category: violence)')
  rules.push('- Spam or gibberish (category: spam)')
  rules.push('- Impersonation or fraud attempts (category: fraud)')

  return `You are a multilingual brand safety content moderator. You must correctly evaluate text in ANY language including Turkish, English, Spanish, Arabic, and others.

A message like "seni seviyorum iyi ki varsın" (Turkish for "I love you, glad you exist") is COMPLETELY SAFE.
A message like "doğum günün kutlu olsun" (Turkish for "happy birthday") is COMPLETELY SAFE.
Compliments, greetings, birthday wishes, motivational messages in ANY language are SAFE.

Only flag as UNSAFE if the text CLEARLY contains:
${rules.join('\n')}

When in doubt, return {"safe": true}.
Do not over-moderate. Err on the side of allowing content.

Respond ONLY with valid JSON. No explanation. No markdown.
If safe: {"safe": true}
If unsafe: {"safe": false, "category": "<category>", "reason": "<one sentence in English>"}`
}

export function validateTextLength(text: string): void {
  if (text.trim().length < 5) {
    throw new VocliraError(
      'Text too short (minimum 5 characters)',
      'INVALID_TEXT_LENGTH',
      400
    )
  }
  if (text.trim().length > 300) {
    throw new VocliraError(
      'Text too long (maximum 300 characters)',
      'INVALID_TEXT_LENGTH',
      400
    )
  }
}

// Per-language character ceilings (Chatterbox engine limits, MVP):
//   Multilingual (tr) max 300 → 280 buffer for tags/punctuation
//   Turbo (en) max 5000 → 500 MVP cap (cost + "mini message" format)
const MIN_TEXT_LENGTH = 5
export const MAX_TEXT_LENGTH_BY_LANGUAGE: Record<'tr' | 'en', number> = { tr: 280, en: 500 }

export function maxTextLengthFor(language: string): number {
  return MAX_TEXT_LENGTH_BY_LANGUAGE[language === 'tr' ? 'tr' : 'en']
}

/** Length guard keyed to the creator's language. Used pre-payment AND post-optimizer. */
export function validateTextLengthForLanguage(text: string, language: string): void {
  const trimmed = text.trim().length
  const max = maxTextLengthFor(language)
  if (trimmed < MIN_TEXT_LENGTH) {
    throw new VocliraError(`Text too short (minimum ${MIN_TEXT_LENGTH} characters)`, 'INVALID_TEXT_LENGTH', 400)
  }
  if (trimmed > max) {
    throw new VocliraError(`Text too long (maximum ${max} characters for ${language})`, 'INVALID_TEXT_LENGTH', 400)
  }
}

/** Normalized hash of the fan's RAW text — locks pre-payment moderation to the generate call. */
export function hashUserText(rawText: string): string {
  const normalized = rawText.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()
  return createHash('sha256').update(normalized).digest('hex')
}

export async function moderateText(
  text: string,
  filters?: ModerationFilters
): Promise<ModerationResult> {
  const start = Date.now()

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 150,
      temperature: 0,
      messages: [
        { role: 'system', content: buildSystemPrompt(filters) },
        { role: 'user', content: text },
      ],
    })

    const raw = response.choices[0]?.message?.content ?? ''

    let parsed: { safe: boolean; category?: string; reason?: string }

    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new ModerationError('Failed to parse moderation response')
    }

    return {
      isSafe: parsed.safe,
      category: parsed.category as ModerationCategory | undefined,
      reason: parsed.reason,
      processingMs: Date.now() - start,
    }
  } catch (error) {
    if (error instanceof ModerationError) throw error
    // Log full error server-side, return sanitized message to client
    console.error('[Moderation] Unexpected error:', error)
    throw new ModerationError('Moderation service unavailable')
  }
}

export async function isSafeToGenerate(
  text: string,
  filters?: ModerationFilters
): Promise<boolean> {
  try {
    const result = await moderateText(text, filters)
    if (!result.isSafe) {
      throw new UnsafeContentError(
        result.category ?? 'unknown',
        result.reason ?? 'Content policy violation'
      )
    }
    return true
  } catch (error) {
    if (error instanceof UnsafeContentError) throw error
    if (error instanceof VocliraError) throw error
    throw new ModerationError('Moderation failed unexpectedly')
  }
}
