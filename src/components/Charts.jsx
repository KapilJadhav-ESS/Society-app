import { useState } from 'react'
import { cls } from '../lib/utils'

// Single-series column chart: one hue (magnitude), 4px rounded data-ends,
// recessive baseline, tap/hover to read a value, selective direct labels.
export function ColumnChart({ data, format = (v) => v, height = 140, color = '#243C74', ariaLabel }) {
  const [active, setActive] = useState(null)
  const max = Math.max(...data.map((d) => d.value), 1)
  const peak = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0)
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="relative flex items-end gap-1.5 border-b border-ink-200" style={{ height }}>
        {data.map((d, i) => {
          const h = Math.max(2, (d.value / max) * (height - 22))
          const show = active === i || (active === null && (i === peak || i === data.length - 1))
          return (
            <button key={i} className="flex-1 h-full flex flex-col justify-end items-center group" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onClick={() => setActive(active === i ? null : i)} title={`${d.label}: ${format(d.value)}`}>
              <span className={cls('text-[10px] font-bold text-ink-700 mb-1 whitespace-nowrap transition-opacity', show ? 'opacity-100' : 'opacity-0')}>{format(d.value)}</span>
              <span className="w-full max-w-[28px] rounded-t transition-all duration-500" style={{ height: h, background: color, opacity: active === null || active === i ? 1 : 0.45 }} />
            </button>
          )
        })}
      </div>
      <div className="flex gap-1.5 mt-1.5">{data.map((d, i) => <span key={i} className="flex-1 text-center text-[10px] font-semibold text-ink-500 truncate">{d.label}</span>)}</div>
    </div>
  )
}

// Ranked horizontal bars – each row labelled, value in ink text.
export function BarList({ data, format = (v) => v, color = '#243C74', max: mx }) {
  const max = mx || Math.max(...data.map((d) => d.value), 1)
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} title={`${d.label}: ${format(d.value)}`}>
          <div className="flex justify-between text-[13px] mb-1"><span className="font-semibold text-ink-700 truncate pr-2">{d.label}</span><span className="font-bold text-ink-900 whitespace-nowrap">{format(d.value)}{d.sub && <span className="text-ink-400 font-medium"> {d.sub}</span>}</span></div>
          <div className="h-2 rounded-full bg-ink-100"><div className="h-2 rounded-full transition-all duration-500" style={{ width: `${(d.value / max) * 100}%`, background: color }} /></div>
        </div>
      ))}
    </div>
  )
}

// Ring meter for a single proportion (e.g. collection %).
export function Ring({ value, size = 84, stroke = 9, color = '#22C55E', label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value))} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center"><div><div className="text-lg font-extrabold leading-none">{Math.round(value * 100)}%</div>{label && <div className="text-[9px] text-ink-500 font-semibold mt-0.5">{label}</div>}</div></div>
    </div>
  )
}
