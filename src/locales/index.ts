import zh from './zh.json'
import en from './en.json'

export type Lang = 'zh' | 'en'
const locales = { zh, en }

export function t(key: string, lang: Lang, params?: Record<string, string | number>): string {
  const dict = locales[lang] as Record<string, string>
  const value = dict[key]
  if (value === undefined) return key
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, p) => String(params[p] ?? `{${p}}`))
  }
  return value
}

export function createI18n(lang: Lang) {
  return (key: string, params?: Record<string, string | number>) => t(key, lang, params)
}

export type T = ReturnType<typeof createI18n>
