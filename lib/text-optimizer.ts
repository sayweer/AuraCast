import Groq from 'groq-sdk'
import type { Mood, VoiceSettings } from '@/types'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? '',
})

if (!process.env.GROQ_API_KEY) {
  console.warn('[TextOptimizer] GROQ_API_KEY is not set — optimizer will fall back to raw text')
}

export const MOOD_VOICE_PRESETS: Record<Mood, Required<VoiceSettings>> = {
  happy:    { stability: 0.35, similarity_boost: 0.75, style: 0.55 },
  excited:  { stability: 0.25, similarity_boost: 0.70, style: 0.75 },
  calm:     { stability: 0.75, similarity_boost: 0.80, style: 0.20 },
  sad:      { stability: 0.60, similarity_boost: 0.78, style: 0.40 },
  angry:    { stability: 0.30, similarity_boost: 0.72, style: 0.70 },
  romantic: { stability: 0.55, similarity_boost: 0.82, style: 0.50 },
}

const MOOD_STYLE_HINTS: Record<Mood, string> = {
  happy: 'cheerful and upbeat — add light exclamation marks where natural',
  excited: 'highly energetic — use exclamation marks and short emphatic phrasing',
  calm: 'soft and gentle — add commas and ellipses for relaxed pacing',
  sad: 'melancholic and slow — add ellipses (...) and soft commas for pauses',
  angry: 'firm and intense — add exclamation marks and punchy sentence breaks',
  romantic: 'warm and tender — add soft commas, gentle pauses, and natural breathing rhythm',
}

const MOOD_AUDIO_TAGS: Record<Mood, string> = {
  happy:    '[cheerful]',
  excited:  '[excited]',
  calm:     '[calm]',
  sad:      '[sad]',
  angry:    '[firm]',
  romantic: '[warm]',
}

function buildSystemPrompt(mood: Mood, language: string): string {
  const hint = MOOD_STYLE_HINTS[mood]
  const tag = MOOD_AUDIO_TAGS[mood]
  return `You are a text-to-speech (TTS) text optimizer for the ElevenLabs eleven_v3 model. The user will send you raw text. Your job: rewrite the SAME text in the SAME language (${language || 'auto-detect'}) with better punctuation, pauses, and a leading audio tag so the TTS engine reads it with a "${mood}" mood — ${hint}.

ELEVEN_V3 AUDIO TAGS:
The eleven_v3 model interprets bracketed tags like ${tag}, [pause], [short pause], [sigh], [laughs softly] as performance instructions — they are NOT spoken aloud, they shape the delivery.

STRICT RULES:
- Start the output with this exact audio tag followed by a single space: ${tag}
- You MAY add [pause] or [short pause] tags between sentences for natural pacing (do not overuse — max one per 1-2 sentences).
- Do NOT change words, meaning, or language of the user's text.
- Do NOT add new content, opinions, names, or facts.
- Do NOT translate.
- Do NOT add markdown, quotes, or explanations.
- ONLY adjust punctuation (commas, periods, exclamation marks, question marks, ellipses "...") and add the allowed audio tags.
- You may split run-on sentences into shorter ones for better pacing.
- Keep the text length within 1.5× of the original.

Respond with ONLY the optimized text starting with ${tag}. Nothing else.`
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
      model: 'openai/gpt-oss-120b',
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
