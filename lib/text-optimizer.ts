import Groq from 'groq-sdk'
import type { Mood, VoiceSettings } from '@/types'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? '',
})

if (!process.env.GROQ_API_KEY) {
  console.warn('[TextOptimizer] GROQ_API_KEY is not set — optimizer will fall back to raw text')
}

export const MOOD_VOICE_PRESETS: Record<Mood, Required<VoiceSettings>> = {
  happy:    { stability: 0.40, similarity_boost: 0.85, style: 0.50 },
  excited:  { stability: 0.30, similarity_boost: 0.85, style: 0.70 },
  calm:     { stability: 0.85, similarity_boost: 0.85, style: 0.15 },
  sad:      { stability: 0.70, similarity_boost: 0.85, style: 0.30 },
  angry:    { stability: 0.35, similarity_boost: 0.85, style: 0.60 },
  romantic: { stability: 0.65, similarity_boost: 0.90, style: 0.40 },
}

const MOOD_STYLE_HINTS: Record<Mood, string> = {
  happy: 'cheerful and upbeat — add light exclamation marks where natural',
  excited: 'highly energetic — use exclamation marks and short emphatic phrasing',
  calm: 'soft and gentle — add commas and ellipses for relaxed pacing',
  sad: 'melancholic and slow — add ellipses (...) and soft commas for pauses',
  angry: 'firm and intense — add exclamation marks and punchy sentence breaks',
  romantic: 'warm and tender — add soft commas, gentle pauses, and natural breathing rhythm',
}

function buildSystemPrompt(mood: Mood, language: string): string {
  const hint = MOOD_STYLE_HINTS[mood]
  return `You are a text-to-speech (TTS) text optimizer. The user will send you raw text. Your job: rewrite the SAME text in the SAME language (${language || 'auto-detect'}) with better punctuation, pauses, and emphasis so a TTS engine reads it with a "${mood}" mood — ${hint}.

STRICT RULES:
- Do NOT change words, meaning, or language.
- Do NOT add new content, opinions, names, or facts.
- Do NOT translate.
- Do NOT add markdown, quotes, or explanations.
- ONLY adjust punctuation (commas, periods, exclamation marks, question marks, ellipses "...").
- You may split run-on sentences into shorter ones for better pacing.
- Keep the text length within 1.5× of the original.

Respond with ONLY the optimized text. Nothing else.`
}

export async function optimizeTextForVoice(
  rawText: string,
  mood: Mood,
  language: string
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    return rawText
  }

  const trimmed = rawText.trim()
  if (trimmed.length === 0) return rawText

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 400,
      temperature: 0.3,
      messages: [
        { role: 'system', content: buildSystemPrompt(mood, language) },
        { role: 'user', content: trimmed },
      ],
    })

    const optimized = response.choices[0]?.message?.content?.trim() ?? ''

    if (optimized.length === 0) {
      return rawText
    }

    if (optimized.length > rawText.length * 2) {
      console.warn('[TextOptimizer] Output too long, falling back to raw text', {
        rawLen: rawText.length,
        optimizedLen: optimized.length,
      })
      return rawText
    }

    console.log('[TextOptimizer]', { mood, rawLen: rawText.length, optimizedLen: optimized.length })
    return optimized
  } catch (error) {
    console.error('[TextOptimizer] Failed, falling back to raw text:', error)
    return rawText
  }
}
