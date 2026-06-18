import Groq from 'groq-sdk'
import type { Mood } from '@/types'
import { maxTextLengthFor } from '@/lib/moderation'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? '',
})

if (!process.env.GROQ_API_KEY) {
  console.warn('[TextOptimizer] GROQ_API_KEY is not set — optimizer will fall back to raw text')
}

// Mood → prosody direction (both languages express mood through punctuation/rhythm).
const MOOD_STYLE_HINTS: Record<Mood, string> = {
  happy: 'cheerful and upbeat — light exclamation marks where natural',
  excited: 'highly energetic — exclamation marks and short emphatic phrasing',
  calm: 'soft and gentle — commas and ellipses for relaxed pacing',
  sad: 'melancholic and slow — ellipses (...) and soft commas for pauses',
  angry: 'firm and intense — exclamation marks and punchy sentence breaks',
  romantic: 'warm and tender — soft commas and gentle, breathing rhythm',
}

// Chatterbox Turbo (en) supports a small set of paralinguistic tags. We expose a
// safe subset and map each mood to an optional fitting tag. Multilingual (tr) does
// NOT reliably support tags, so the tr path stays tag-free (prosody only).
const MOOD_EN_TAG: Record<Mood, string | null> = {
  happy: '[chuckle]',
  excited: '[laugh]',
  calm: null,
  sad: '[sigh]',
  angry: null,
  romantic: '[sigh]',
}

function buildTurboPrompt(mood: Mood, maxLen: number): string {
  const hint = MOOD_STYLE_HINTS[mood]
  const tag = MOOD_EN_TAG[mood]
  const tagRule = tag
    ? `- You MAY insert the tag ${tag} at ONE natural spot (start, or right after a sentence boundary) to convey the "${mood}" mood. Allowed tags ONLY: [laugh] [sigh] [gasp] [chuckle] [cough]. Use at most one tag total.`
    : `- Do NOT use any bracketed tags — convey the "${mood}" mood purely through punctuation and rhythm.`
  return `You are a TTS text optimizer for the Chatterbox Turbo English voice model. Rewrite the SAME English text with better punctuation and pacing so it is read with a "${mood}" mood — ${hint}.

STRICT RULES:
${tagRule}
- Do NOT change words, meaning, or language. Do NOT translate. Do NOT add new content.
- ONLY adjust punctuation (commas, periods, !?, ellipses "...") and optionally insert one allowed tag.
- Keep the result under ${maxLen} characters.
- Respond with ONLY the optimized text. No markdown, no quotes, no explanation.`
}

function buildMultilingualPrompt(mood: Mood, maxLen: number): string {
  const hint = MOOD_STYLE_HINTS[mood]
  return `Sen bir TTS metin optimize edicisin (Chatterbox Multilingual, Türkçe). Kullanıcının metnini AYNI dilde (Türkçe), daha iyi noktalama ve ritimle yeniden yaz; "${mood}" ruh haliyle okunsun — ${hint}.

KESİN KURALLAR:
- KÖŞELİ PARANTEZLİ ETİKET KULLANMA (no [happy], [pause], [laugh] etc.) — ruh halini yalnızca noktalama ve ritimle ver.
- Kelimeleri, anlamı veya dili DEĞİŞTİRME. ÇEVİRME. Yeni içerik EKLEME.
- SADECE noktalama işaretlerini ayarla (virgül, nokta, ?!, üç nokta "...").
- Sonucu ${maxLen} karakterin altında tut.
- SADECE optimize edilmiş metni döndür. Markdown, tırnak veya açıklama yok.`
}

/**
 * Rewrites fan text for Chatterbox TTS prosody. Language-aware:
 *   tr → Multilingual prompt, tag-free
 *   en (default) → Turbo prompt, optional paralinguistic tag
 * Falls back to raw text on any failure or over-length output.
 */
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

  const maxLen = maxTextLengthFor(language)
  const systemPrompt =
    language === 'tr' ? buildMultilingualPrompt(mood, maxLen) : buildTurboPrompt(mood, maxLen)

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

    if (optimized.length === 0 || optimized.length > maxLen) {
      // Over-length or empty → safer to ship the (already length-validated) raw text.
      console.warn('[TextOptimizer] Falling back to raw text', {
        language,
        rawLen: trimmed.length,
        optimizedLen: optimized.length,
        maxLen,
      })
      return rawText
    }

    return optimized
  } catch (error) {
    console.error('[TextOptimizer] Failed, falling back to raw text:', error)
    return rawText
  }
}
