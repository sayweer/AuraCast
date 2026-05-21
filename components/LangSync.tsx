'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/components/LanguageProvider'

export function LangSync() {
  const { language } = useLanguage()
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])
  return null
}
