import { useEffect, useState } from 'react'
import { Languages } from 'lucide-react'
import { LANGS, getLang, setLang, onLangChange } from '../i18n'
import { cls } from '../lib/utils'

// Language names are always shown in their own script (translate="no").
export default function LanguageSwitcher({ dark, className = '' }) {
  const [cur, setCur] = useState(getLang())
  useEffect(() => onLangChange(setCur), [])
  return (
    <div translate="no" role="group" aria-label="Language / भाषा" className={cls('inline-flex items-center gap-1 p-1 rounded-full', dark ? 'bg-white/10' : 'bg-ink-100', className)}>
      <Languages size={16} className={cls('mx-1.5', dark ? 'text-brand-200' : 'text-ink-500')} aria-hidden="true" />
      {LANGS.map((l) => (
        <button key={l.code} onClick={() => setLang(l.code)} aria-pressed={cur === l.code} className={cls('h-8 px-3 rounded-full text-[13px] font-semibold transition', cur === l.code ? (dark ? 'bg-white text-brand-800' : 'bg-brand-800 text-white') : dark ? 'text-white/80' : 'text-ink-700')}>
          {l.label}
        </button>
      ))}
    </div>
  )
}
