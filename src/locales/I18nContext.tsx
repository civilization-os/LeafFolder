import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Lang, T } from './index'
import { createI18n } from './index'

interface I18nContextType {
  lang: Lang
  setLang: (l: Lang) => void
  t: T
}

const I18nContext = createContext<I18nContextType>({
  lang: 'zh',
  setLang: () => {},
  t: (key: string) => key,
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh')

  useEffect(() => {
    window.api.getSetting('lang').then(saved => {
      if (saved === 'en' || saved === 'zh') setLangState(saved)
    })
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    window.api.setSetting('lang', l)
    window.api.setMenuLanguage(l)
  }, [])

  const tFn = useCallback((key: string, params?: Record<string, string | number>) => {
    return createI18n(lang)(key, params)
  }, [lang])

  return (
    <I18nContext.Provider value={{ lang, setLang, t: tFn }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  return useContext(I18nContext)
}
