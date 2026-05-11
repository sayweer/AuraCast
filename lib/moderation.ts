import Groq from 'groq-sdk'
import type { ModerationResult, ModerationCategory } from '@/types'
import { AuraCastError, ModerationError, UnsafeContentError } from '@/lib/errors'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? '',
})

const SYSTEM_PROMPT = `You are a brand safety content moderator for a voice licensing platform. Creators have licensed their voices for user-generated content only.

Flag as UNSAFE if the text contains:
- Profanity or offensive language (category: profanity)
- Sexual or adult content (category: sexual)
- Political propaganda or divisive content (category: political)
- Violence or threats (category: violence)
- Spam or gibberish (category: spam)
- Impersonation or fraud attempts (category: fraud)

Respond ONLY with valid JSON. No explanation. No markdown.
If safe: {"safe": true}
If unsafe: {"safe": false, "category": "<category>", "reason": "<one sentence>"}`

export function validateTextLength(text: string): void {
  if (text.trim().length < 5) {
    throw new AuraCastError(
      'Text too short (minimum 5 characters)',
      'INVALID_TEXT_LENGTH',
      400
    )
  }
  if (text.trim().length > 300) {
    throw new AuraCastError(
      'Text too long (maximum 300 characters)',
      'INVALID_TEXT_LENGTH',
      400
    )
  }
}

export async function moderateText(text: string): Promise<ModerationResult> {
  const start = Date.now()

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 150,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
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
    throw new ModerationError('Moderation service unavailable')
  }
}

export async function isSafeToGenerate(text: string): Promise<boolean> {
  try {
    const result = await moderateText(text)
    if (!result.isSafe) {
      throw new UnsafeContentError(
        result.category ?? 'unknown',
        result.reason ?? 'Content policy violation'
      )
    }
    return true
  } catch (error) {
    if (error instanceof UnsafeContentError) throw error
    if (error instanceof AuraCastError) throw error
    throw new ModerationError('Moderation failed unexpectedly')
  }
}
