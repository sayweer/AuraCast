import Groq from 'groq-sdk'
import type { Mood, VoiceSettings } from '@/types'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? '',
})

if (!process.env.GROQ_API_KEY) {
  console.warn('[TextOptimizer] GROQ_API_KEY is not set — optimizer will fall back to raw text')
}

// Tuned for eleven_v3 (expressive, audio-tag native). Stability is kept moderate
// (≥0.45) to preserve clone identity; similarity_boost capped at 0.78 to avoid
// the "over-mimicry" artefact ElevenLabs warns about above ~0.85.
export const MOOD_VOICE_PRESETS: Record<Mood, Required<VoiceSettings>> = {
  happy:    { stability: 0.50, similarity_boost: 0.75, style: 0.30 },
  excited:  { stability: 0.45, similarity_boost: 0.75, style: 0.45 },
  calm:     { stability: 0.65, similarity_boost: 0.78, style: 0.15 },
  sad:      { stability: 0.55, similarity_boost: 0.76, style: 0.25 },
  angry:    { stability: 0.45, similarity_boost: 0.74, style: 0.40 },
  romantic: { stability: 0.55, similarity_boost: 0.78, style: 0.30 },
}

const MOOD_STYLE_HINTS: Record<Mood, string> = {
  happy: 'cheerful and upbeat — add light exclamation marks where natural',
  excited: 'highly energetic — use exclamation marks and short emphatic phrasing',
  calm: 'soft and gentle — add commas and ellipses for relaxed pacing',
  sad: 'melancholic and slow — add ellipses (...) and soft commas for pauses',
  angry: 'firm and intense — add exclamation marks and punchy sentence breaks',
  romantic: 'warm and tender — add soft commas, gentle pauses, and natural breathing rhythm',
}

// eleven_v3 native audio tags — these are interpreted as performance cues, not spoken.
const MOOD_AUDIO_TAGS: Record<Mood, string> = {
  happy:    '[happy]',
  excited:  '[excited]',
  calm:     '[calm]',
  sad:      '[sad]',
  angry:    '[angry]',
  romantic: '[whispers]',
}

function buildSystemPromptV3(mood: Mood, language: string): string {
  const hint = MOOD_STYLE_HINTS[mood]
  const tag = MOOD_AUDIO_TAGS[mood]
  return `You are a text-to-speech (TTS) text optimizer for the ElevenLabs eleven_v3 model. The user will send you raw text. Your job: rewrite the SAME text in the SAME language (${language || 'auto-detect'}) with better punctuation, pauses, and a leading audio tag so the TTS engine reads it with a "${mood}" mood — ${hint}.

ELEVEN_V3 AUDIO TAGS:
The eleven_v3 model treats bracketed tags as performance instructions — they shape delivery and are NOT spoken aloud. Allowed tags only:
- Mood: ${tag}
- Pacing: [pause], [short pause], [long pause]
- Optional accents (use sparingly, only where natural): [sighs], [laughs softly]

STRICT RULES:
- Start the output with this exact audio tag followed by a single space: ${tag}
- You MAY add [pause], [short pause], or [long pause] between sentences for natural pacing (max one per 1-2 sentences).
- Place audio tags ONLY at the start of the text or directly adjacent to natural punctuation boundaries (after . , ! ?).
- Do NOT change words, meaning, or language of the user's text.
- Do NOT add new content, opinions, names, or facts.
- Do NOT translate.
- Do NOT add markdown, quotes, or explanations.
- ONLY adjust punctuation (commas, periods, exclamation marks, question marks, ellipses "...") and add the allowed audio tags.
- You may split run-on sentences into shorter ones for better pacing.
- Keep the text length within 1.5× of the original.

Respond with ONLY the optimized text starting with ${tag}. Nothing else.`
}

function buildSystemPromptTagless(mood: Mood, language: string): string {
  const hint = MOOD_STYLE_HINTS[mood]
  return `You are a text-to-speech (TTS) text optimizer. The user will send you raw text. Your job: rewrite the SAME text in the SAME language (${language || 'auto-detect'}) with better punctuation and pacing so the TTS engine reads it with a "${mood}" mood — ${hint}.

STRICT RULES:
- Do NOT use bracketed audio tags of any kind (no [happy], [pause], etc.) — express mood purely through punctuation and rhythm.
- Do NOT change words, meaning, or language of the user's text.
- Do NOT add new content, opinions, names, or facts.
- Do NOT translate.
- Do NOT add markdown, quotes, or explanations.
- ONLY adjust punctuation (commas, periods, exclamation marks, question marks, ellipses "...").
- You may split run-on sentences into shorter ones for better pacing.
- Keep the text length within 1.5× of the original.

Respond with ONLY the optimized text. Nothing else.`
}

function supportsAudioTags(targetModel: string): boolean {
  return targetModel === 'eleven_v3'
}

export async function optimizeTextForVoice(
  rawText: string,
  mood: Mood,
  language: string,
  targetModel: string = 'eleven_v3'
): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    return rawText
  }

  const trimmed = rawText.trim()
  if (trimmed.length === 0) return rawText

  const useTags = supportsAudioTags(targetModel)
  const systemPrompt = useTags
    ? buildSystemPromptV3(mood, language)
    : buildSystemPromptTagless(mood, language)

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 400,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
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

    console.log('[TextOptimizer]', {
      mood,
      targetModel,
      useTags,
      rawLen: rawText.length,
      optimizedLen: optimized.length,
    })
    return optimized
  } catch (error) {
    console.error('[TextOptimizer] Failed, falling back to raw text:', error)
    return rawText
  }
}
