import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, X, ImagePlus, Play, CheckCircle2, AlertCircle, Info, Inbox } from 'lucide-react'
import { cls, initials, fileToDataUrl } from '../lib/utils'

/* ---------- Layout ---------- */
export function Page({ title, subtitle, back, actions, children, className = '', noPad, hero }) {
  const nav = useNavigate()
  return (
    <div className="min-h-full pb-28">
      {title !== undefined && (
        <header className="sticky top-0 z-30 bg-canvas/90 backdrop-blur-md safe-top">
          <div className="flex items-center gap-2 px-4 h-14">
            {back && (
              <button aria-label="Back" onClick={() => (typeof back === 'string' ? nav(back) : window.history.length > 1 ? nav(-1) : nav('/'))} className="-ml-2 h-10 w-10 grid place-items-center rounded-full hover:bg-ink-100 active:scale-95 transition">
                <ArrowLeft size={22} />
              </button>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-[17px] font-bold text-ink-900 truncate">{title}</h1>
              {subtitle && <p className="text-xs text-ink-500 -mt-0.5 truncate">{subtitle}</p>}
            </div>
            {actions}
          </div>
        </header>
      )}
      {hero}
      <div className={cls(!noPad && 'px-4', className)}>{children}</div>
    </div>
  )
}

export const Card = ({ className = '', children, onClick, ...p }) => (
  <div onClick={onClick} className={cls('bg-white rounded-2xl shadow-card', onClick && 'cursor-pointer active:scale-[.99] transition', className)} {...p}>{children}</div>
)

export function SectionTitle({ children, action, onAction, className = '' }) {
  return (
    <div className={cls('flex items-center justify-between mt-6 mb-3', className)}>
      <h2 className="text-[15px] font-bold text-ink-900">{children}</h2>
      {action && <button onClick={onAction} className="text-sm font-semibold text-brand-600">{action}</button>}
    </div>
  )
}

/* ---------- Controls ---------- */
const BTN = {
  primary: 'bg-brand-800 text-white hover:bg-brand-700 shadow-sm',
  success: 'bg-accent-500 text-white hover:bg-accent-600 shadow-sm',
  secondary: 'bg-brand-50 text-brand-800 hover:bg-brand-100',
  outline: 'border border-ink-200 bg-white text-ink-900 hover:bg-ink-100',
  ghost: 'text-ink-700 hover:bg-ink-100',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
  dangerSolid: 'bg-red-600 text-white hover:bg-red-700'
}
export function Button({ variant = 'primary', size = 'md', className = '', icon: Icon, children, loading, block, ...p }) {
  const sz = size === 'sm' ? 'h-9 px-3 text-[13px] rounded-xl' : size === 'lg' ? 'h-[52px] px-6 text-[15px] rounded-2xl' : 'h-11 px-4 text-sm rounded-xl'
  return (
    <button {...p} disabled={p.disabled || loading} className={cls('inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none', BTN[variant], sz, block && 'w-full', className)}>
      {loading ? <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" /> : Icon && <Icon size={size === 'sm' ? 16 : 18} />}
      {children}
    </button>
  )
}

export const IconButton = ({ icon: Icon, label, className = '', badge, ...p }) => (
  <button aria-label={label} {...p} className={cls('relative h-10 w-10 grid place-items-center rounded-full bg-white shadow-card text-ink-700 active:scale-95 transition', className)}>
    <Icon size={20} />
    {badge > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center ring-2 ring-white">{badge > 9 ? '9+' : badge}</span>}
  </button>
)

export function Field({ label, hint, error, children, className = '' }) {
  return (
    <label className={cls('block mb-4', className)}>
      {label && <span className="block text-[13px] font-semibold text-ink-700 mb-1.5">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-ink-500 mt-1">{hint}</span>}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  )
}
const inputCls = 'w-full rounded-xl border border-ink-200 bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100 transition'
export const Input = ({ className = '', ...p }) => <input {...p} className={cls(inputCls, 'h-12', className)} />
export const Textarea = ({ className = '', rows = 4, ...p }) => <textarea rows={rows} {...p} className={cls(inputCls, 'py-3 resize-none', className)} />
export const Select = ({ className = '', children, ...p }) => (
  <select {...p} className={cls(inputCls, 'h-12 appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%2364748B%27 stroke-width=%272%27><path d=%27M4 6l4 4 4-4%27/></svg>")] bg-no-repeat bg-[right_12px_center] pr-10', className)}>{children}</select>
)

export function Toggle({ checked, onChange, label, desc }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-center gap-3 py-3 text-left">
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-ink-900">{label}</div>
        {desc && <div className="text-xs text-ink-500">{desc}</div>}
      </div>
      <span className={cls('relative h-7 w-12 rounded-full transition shrink-0', checked ? 'bg-accent-500' : 'bg-ink-300')}>
        <span className={cls('absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

export function Chips({ options, value, onChange, className = '' }) {
  return (
    <div className={cls('flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1', className)}>
      {options.map((o) => {
        const v = typeof o === 'string' ? o : o.value
        const l = typeof o === 'string' ? o : o.label
        const active = Array.isArray(value) ? value.includes(v) : value === v
        return (
          <button type="button" key={v} onClick={() => onChange(v)} className={cls('shrink-0 h-9 px-3.5 rounded-full text-[13px] font-semibold border transition', active ? 'bg-brand-800 text-white border-brand-800' : 'bg-white text-ink-700 border-ink-200 hover:border-ink-300')}>
            {l}{o.count != null && <span className={cls('ml-1.5 text-[11px]', active ? 'text-brand-200' : 'text-ink-400')}>{o.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function Tabs({ tabs, value, onChange, className = '' }) {
  return (
    <div className={cls('flex p-1 bg-ink-100 rounded-xl', className)}>
      {tabs.map((t) => {
        const v = typeof t === 'string' ? t : t.value
        return (
          <button key={v} onClick={() => onChange(v)} className={cls('flex-1 h-9 rounded-lg text-[13px] font-semibold transition', value === v ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500')}>
            {typeof t === 'string' ? t : t.label}
            {t.count > 0 && <span className="ml-1 text-[11px] text-red-500">●</span>}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- Display ---------- */
const BADGE = {
  gray: 'bg-ink-100 text-ink-700', blue: 'bg-brand-50 text-brand-700', green: 'bg-accent-50 text-accent-700',
  red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-700', purple: 'bg-violet-50 text-violet-700', sky: 'bg-sky-50 text-sky-700'
}
export const Badge = ({ color = 'gray', children, className = '', dot }) => (
  <span className={cls('inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-bold uppercase tracking-wide whitespace-nowrap', BADGE[color], className)}>
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}
  </span>
)

export function Avatar({ user, name, size = 40, className = '' }) {
  const n = user?.name || name || '?'
  const style = { width: size, height: size, fontSize: size * 0.38 }
  if (user?.avatar) return <img src={user.avatar} alt={n} style={style} className={cls('rounded-full object-cover shrink-0', className)} />
  return <div style={{ ...style, background: user?.color || '#5470B0' }} className={cls('rounded-full grid place-items-center text-white font-bold shrink-0', className)}>{initials(n)}</div>
}

export function Empty({ icon: Icon = Inbox, title, text, action }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="mx-auto h-16 w-16 rounded-3xl bg-brand-50 text-brand-500 grid place-items-center mb-4"><Icon size={28} /></div>
      <div className="font-bold text-ink-900">{title}</div>
      {text && <p className="text-sm text-ink-500 mt-1">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export const Stat = ({ label, value, sub, icon: Icon, tone = 'brand', onClick }) => {
  const tones = { brand: 'bg-brand-50 text-brand-700', green: 'bg-accent-50 text-accent-700', red: 'bg-red-50 text-red-600', amber: 'bg-amber-50 text-amber-700', purple: 'bg-violet-50 text-violet-700', sky: 'bg-sky-50 text-sky-700' }
  return (
    <Card onClick={onClick} className="p-4">
      {Icon && <div className={cls('h-9 w-9 rounded-xl grid place-items-center mb-3', tones[tone])}><Icon size={18} /></div>}
      <div className="text-[22px] leading-tight font-extrabold text-ink-900">{value}</div>
      <div className="text-xs font-medium text-ink-500 mt-0.5">{label}</div>
      {sub && <div className="text-[11px] text-ink-400 mt-1">{sub}</div>}
    </Card>
  )
}

export const ListRow = ({ icon, title, sub, right, onClick, className = '' }) => (
  <button onClick={onClick} className={cls('w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-ink-100 transition', className)}>
    {icon}
    <div className="flex-1 min-w-0">
      <div className="text-[15px] font-semibold text-ink-900 truncate">{title}</div>
      {sub && <div className="text-xs text-ink-500 truncate">{sub}</div>}
    </div>
    {right}
  </button>
)

/* ---------- Overlays ---------- */
export function Sheet({ open, onClose, title, children, footer, full }) {
  useEffect(() => {
    if (!open) return
    const k = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [open])
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-ink-900/50 animate-fade-in" onClick={onClose} />
      <div role="dialog" aria-modal="true" className={cls('relative w-full max-w-[520px] bg-white rounded-t-3xl shadow-2xl animate-slide-up flex flex-col', full ? 'h-[92vh]' : 'max-h-[90vh]')}>
        <div className="pt-2.5 pb-1 grid place-items-center"><span className="h-1.5 w-10 rounded-full bg-ink-200" /></div>
        {title && (
          <div className="flex items-center justify-between px-5 pb-3 pt-1">
            <h3 className="text-[17px] font-bold text-ink-900">{title}</h3>
            <button aria-label="Close" onClick={onClose} className="h-9 w-9 -mr-2 grid place-items-center rounded-full hover:bg-ink-100"><X size={20} /></button>
          </div>
        )}
        <div className="overflow-y-auto px-5 pb-5 flex-1">{children}</div>
        {footer && <div className="px-5 pt-3 pb-5 border-t border-ink-100 safe-bottom">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

const ConfirmCtx = createContext(null)
const ToastCtx = createContext(null)
export function OverlayProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirm, setConfirm] = useState(null)
  const toast = useCallback((msg, type = 'success') => {
    const id = Math.random()
    setToasts((t) => [...t, { id, msg, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])
  const ask = useCallback((opts) => new Promise((resolve) => setConfirm({ ...opts, resolve })), [])
  const close = (v) => { confirm?.resolve(v); setConfirm(null) }
  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={ask}>
        {children}
        {createPortal(
          <div className="fixed top-3 inset-x-0 z-[80] flex flex-col items-center gap-2 px-4 pointer-events-none safe-top">
            {toasts.map((t) => (
              <div key={t.id} className="pointer-events-auto max-w-[480px] w-full flex items-start gap-2.5 rounded-2xl bg-ink-900 text-white px-4 py-3 shadow-xl animate-pop text-sm">
                {t.type === 'error' ? <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" /> : t.type === 'info' ? <Info size={18} className="text-sky-300 shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="text-accent-400 shrink-0 mt-0.5" />}
                <span className="flex-1">{t.msg}</span>
              </div>
            ))}
          </div>,
          document.body
        )}
        {confirm && createPortal(
          <div className="fixed inset-0 z-[70] grid place-items-center p-6">
            <div className="absolute inset-0 bg-ink-900/50 animate-fade-in" onClick={() => close(false)} />
            <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-pop">
              <h3 className="text-lg font-bold text-ink-900">{confirm.title}</h3>
              {confirm.text && <p className="text-sm text-ink-500 mt-2">{confirm.text}</p>}
              <div className="flex gap-3 mt-6">
                <Button variant="outline" block onClick={() => close(false)}>{confirm.cancel || 'Cancel'}</Button>
                <Button variant={confirm.danger ? 'dangerSolid' : 'primary'} block onClick={() => close(true)}>{confirm.ok || 'Confirm'}</Button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  )
}
export const useToast = () => useContext(ToastCtx)
export const useConfirm = () => useContext(ConfirmCtx)

// Wrap an action: shows a toast on validation/permission error.
export function useAction() {
  const toast = useToast()
  return (fn, success) => {
    try {
      const r = fn()
      if (success) toast(typeof success === 'function' ? success(r) : success)
      return r ?? true
    } catch (e) {
      toast(e.message || 'Something went wrong', 'error')
      return false
    }
  }
}

/* ---------- Media ---------- */
export function MediaPicker({ value = [], onChange, max = 6, allowVideo = true, label = 'Add photos' }) {
  const ref = useRef()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const pick = async (e) => {
    const files = [...e.target.files].slice(0, max - value.length)
    e.target.value = ''
    setBusy(true)
    const out = []
    for (const f of files) {
      if (f.type.startsWith('video/')) {
        if (!allowVideo) continue
        if (f.size > 15 * 1024 * 1024) { toast('Videos must be under 15 MB', 'error'); continue }
        out.push({ type: 'video', url: await fileToDataUrl(f), name: f.name })
      } else if (f.type.startsWith('image/')) out.push({ type: 'image', url: await fileToDataUrl(f), name: f.name })
      else if (f.type === 'application/pdf') {
        if (f.size > 5 * 1024 * 1024) { toast('PDFs must be under 5 MB', 'error'); continue }
        out.push({ type: 'pdf', url: await fileToDataUrl(f), name: f.name, size: Math.round(f.size / 1024) + ' KB' })
      }
    }
    setBusy(false)
    onChange([...value, ...out])
  }
  return (
    <div className="flex gap-2 flex-wrap">
      {value.map((m, i) => (
        <div key={i} className="relative h-20 w-20 rounded-xl overflow-hidden bg-ink-100">
          {m.type === 'image' ? <img src={m.url} className="h-full w-full object-cover" alt="" /> : m.type === 'video' ? <div className="h-full w-full grid place-items-center bg-ink-900 text-white"><Play size={22} /></div> : <div className="h-full w-full grid place-items-center text-[10px] font-bold text-red-600 p-1 text-center">PDF<br />{m.name?.slice(0, 14)}</div>}
          <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white grid place-items-center"><X size={14} /></button>
        </div>
      ))}
      {value.length < max && (
        <button type="button" onClick={() => ref.current.click()} className="h-20 w-20 rounded-xl border-2 border-dashed border-ink-300 text-ink-500 grid place-items-center text-[11px] font-semibold hover:border-brand-400 hover:text-brand-600">
          {busy ? <span className="h-5 w-5 rounded-full border-2 border-current border-r-transparent animate-spin" /> : <span className="flex flex-col items-center gap-1"><ImagePlus size={20} />{label}</span>}
        </button>
      )}
      <input ref={ref} type="file" hidden multiple accept={allowVideo === 'pdf' ? 'image/*,application/pdf' : allowVideo ? 'image/*,video/*' : 'image/*'} onChange={pick} />
    </div>
  )
}

export function MediaGrid({ media = [], className = '' }) {
  const [view, setView] = useState(null)
  if (!media.length) return null
  const n = media.length
  return (
    <>
      <div className={cls('grid gap-1 rounded-2xl overflow-hidden', n === 1 ? 'grid-cols-1' : 'grid-cols-2', className)}>
        {media.slice(0, 4).map((m, i) => (
          <button key={i} onClick={() => setView(m)} className={cls('relative bg-ink-100', n === 1 ? 'aspect-[16/10]' : n === 3 && i === 0 ? 'row-span-2 aspect-auto' : 'aspect-square')}>
            {m.type === 'video' ? (
              <><video src={m.url} className="h-full w-full object-cover" muted playsInline preload="metadata" /><span className="absolute inset-0 grid place-items-center"><span className="h-12 w-12 rounded-full bg-black/50 text-white grid place-items-center"><Play size={22} fill="white" /></span></span></>
            ) : <img src={m.url} className="h-full w-full object-cover" alt="" loading="lazy" />}
            {i === 3 && n > 4 && <span className="absolute inset-0 bg-black/50 text-white text-xl font-bold grid place-items-center">+{n - 4}</span>}
          </button>
        ))}
      </div>
      {view && createPortal(
        <div className="fixed inset-0 z-[90] bg-black grid place-items-center animate-fade-in" onClick={() => setView(null)}>
          <button aria-label="Close" className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white grid place-items-center safe-top"><X /></button>
          {view.type === 'video' ? <video src={view.url} controls autoPlay playsInline className="max-h-full max-w-full" onClick={(e) => e.stopPropagation()} /> : <img src={view.url} className="max-h-full max-w-full object-contain" alt="" />}
        </div>,
        document.body
      )}
    </>
  )
}

export function Stars({ value = 0, onChange, size = 28 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button type="button" key={i} onClick={() => onChange?.(i)} disabled={!onChange} className="active:scale-90 transition" aria-label={`${i} stars`}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill={i <= value ? '#F59E0B' : 'none'} stroke={i <= value ? '#F59E0B' : '#CBD5E1'} strokeWidth="1.8" strokeLinejoin="round"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" /></svg>
        </button>
      ))}
    </div>
  )
}

export const Bar = ({ value, max, color = 'bg-brand-600', className = '' }) => (
  <div className={cls('h-2 rounded-full bg-ink-100 overflow-hidden', className)}>
    <div className={cls('h-full rounded-full transition-all duration-500', color)} style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%` }} />
  </div>
)
