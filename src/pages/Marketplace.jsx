import { useState } from 'react'
import { Routes, Route, useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, Phone, MessageCircle, Tag, CalendarClock, Trash2, CheckCircle2, RefreshCw, Store } from 'lucide-react'
import { Page, Button, Card, Chips, Empty, Field, Input, Textarea, Select, MediaPicker, MediaGrid, Avatar, Badge, useAction, useConfirm } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/db'
import { can } from '../lib/rbac'
import { LISTING_TYPES, createListing, updateListing, userById, aptNo } from '../lib/actions'
import { inr, timeAgo, fmtDate, cls, isoDay } from '../lib/utils'

const TC = { sell: 'blue', rent: 'purple', service: 'sky', free: 'green', wanted: 'amber' }
const price = (l) => (l.type === 'free' ? 'FREE' : `${inr(l.price)}${l.priceUnit || ''}`)
const live = (l) => l.status === 'active' && new Date(l.expiresAt) > new Date()

export default function Marketplace() {
  return (
    <Routes>
      <Route index element={<List />} />
      <Route path="new" element={<NewListing />} />
      <Route path=":id" element={<Detail />} />
    </Routes>
  )
}

function List() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [t, setT] = useState('all')
  const [q, setQ] = useState('')
  const all = useData((d) => d.list('listings').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  const list = all.filter((l) => (t === 'mine' ? l.userId === user.id : live(l) && (t === 'all' || l.type === t)) && (!q || (l.title + l.description).toLowerCase().includes(q.toLowerCase())))
  return (
    <Page title="Marketplace" subtitle="Exclusively for Palm Grove residents" back actions={<Button size="sm" icon={Plus} onClick={() => nav('new')}>Sell</Button>}>
      <div className="relative mt-2"><Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search furniture, flats, tuitions…" className="w-full h-12 rounded-2xl bg-white shadow-card pl-10 pr-4 text-[15px] outline-none focus:ring-2 focus:ring-brand-200" /></div>
      <Chips className="mt-3" value={t} onChange={setT} options={[{ value: 'all', label: 'All' }, ...Object.entries(LISTING_TYPES).map(([k, l]) => ({ value: k, label: l })), { value: 'mine', label: 'My listings' }]} />
      <div className="grid grid-cols-2 gap-3 mt-4">
        {list.map((l) => (
          <Card key={l.id} className="overflow-hidden" onClick={() => nav(l.id)}>
            <div className="aspect-square bg-ink-100 relative">
              {l.media?.[0] ? <img src={l.media[0]} alt="" className={cls('h-full w-full object-cover', !live(l) && 'grayscale opacity-60')} /> : <div className="h-full grid place-items-center text-ink-300"><Tag size={36} /></div>}
              <Badge color={TC[l.type]} className="absolute top-2 left-2 !bg-white/95">{LISTING_TYPES[l.type]}</Badge>
              {l.status === 'sold' && <span className="absolute inset-0 grid place-items-center"><span className="bg-ink-900/80 text-white font-extrabold text-sm px-3 py-1 rounded-full -rotate-12">SOLD</span></span>}
            </div>
            <div className="p-3">
              <div className={cls('font-extrabold', l.type === 'free' ? 'text-accent-600' : 'text-ink-900')}>{price(l)}</div>
              <div className="text-[13px] font-semibold text-ink-700 line-clamp-2 leading-snug mt-0.5">{l.title}</div>
              <div className="text-[11px] text-ink-400 mt-1">{aptNo(userById(l.userId)?.apartmentId)} · {timeAgo(l.createdAt)}</div>
            </div>
          </Card>
        ))}
      </div>
      {!list.length && <Empty icon={Store} title="No listings" text="Declutter your home – list something for your neighbours." action={<Button onClick={() => nav('new')}>Create listing</Button>} />}
    </Page>
  )
}

function Detail() {
  const { id } = useParams()
  const { user } = useAuth()
  const nav = useNavigate()
  const act = useAction()
  const ask = useConfirm()
  const l = useData((d) => d.get('listings', id))
  if (!l) return <Page title="Listing" back><Empty title="Listing not found" /></Page>
  const seller = userById(l.userId)
  const mine = l.userId === user.id
  const phone = seller?.phone?.replace(/\D/g, '')
  const msg = encodeURIComponent(`Hi ${seller?.name.split(' ')[0]}, I saw your listing "${l.title}" on the Palm Grove marketplace. Is it still available?`)
  return (
    <Page title={LISTING_TYPES[l.type]} back="/marketplace">
      {l.media?.length > 0 && <MediaGrid media={l.media.map((url) => ({ type: 'image', url }))} className="mt-2" />}
      <div className="mt-4 flex items-center gap-2">{l.status === 'sold' ? <Badge color="gray">Sold</Badge> : !live(l) ? <Badge color="gray">Expired</Badge> : <Badge color={TC[l.type]}>{LISTING_TYPES[l.type]}</Badge>}</div>
      <h1 className="text-xl font-extrabold mt-2 leading-snug">{l.title}</h1>
      <div className={cls('text-2xl font-extrabold mt-1', l.type === 'free' ? 'text-accent-600' : 'text-brand-800')}>{price(l)}</div>
      <p className="text-[15px] text-ink-700 mt-3 whitespace-pre-line leading-relaxed">{l.description}</p>
      <div className="text-xs text-ink-500 mt-3 flex items-center gap-1.5"><CalendarClock size={14} /> Listed {fmtDate(l.createdAt)} · expires {fmtDate(l.expiresAt)}</div>
      <Card className="p-4 mt-5 flex items-center gap-3">
        <Avatar user={seller} size={46} />
        <div className="flex-1"><div className="font-bold">{seller?.name}{mine && ' (you)'}</div><div className="text-xs text-ink-500">{aptNo(seller?.apartmentId)} · Member since {new Date(seller?.joinedAt).getFullYear()}</div></div>
      </Card>
      {!mine && live(l) && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <a href={`tel:+${phone}`} className="h-12 rounded-xl bg-brand-50 text-brand-800 font-semibold flex items-center justify-center gap-2"><Phone size={18} /> Call</a>
          <a href={`https://wa.me/${phone}?text=${msg}`} target="_blank" rel="noreferrer" className="h-12 rounded-xl bg-accent-500 text-white font-semibold flex items-center justify-center gap-2"><MessageCircle size={18} /> WhatsApp</a>
        </div>
      )}
      {(mine || can(user, 'moderation')) && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {mine && l.status === 'active' && <Button variant="success" icon={CheckCircle2} onClick={() => act(() => updateListing(user, l.id, { status: 'sold' }), l.type === 'rent' ? 'Marked as rented' : 'Marked as sold')}>Mark {l.type === 'rent' ? 'rented' : 'sold'}</Button>}
          {mine && <Button variant="secondary" icon={RefreshCw} onClick={() => act(() => updateListing(user, l.id, { status: 'active', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString() }), 'Listing renewed for 30 days')}>Renew 30 days</Button>}
          <Button variant="danger" icon={Trash2} onClick={async () => { if (await ask({ title: 'Remove listing?', danger: true, ok: 'Remove' })) { act(() => updateListing(user, l.id, { status: 'removed' }), 'Listing removed'); nav('/marketplace') } }}>Remove</Button>
        </div>
      )}
    </Page>
  )
}

function NewListing() {
  const { user } = useAuth()
  const nav = useNavigate()
  const act = useAction()
  const [f, setF] = useState({ type: 'sell', title: '', description: '', price: '', priceUnit: '', expiresAt: isoDay(Date.now() + 30 * 86400000) })
  const [media, setMedia] = useState([])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = () => {
    const l = act(() => createListing(user, { ...f, media: media.map((m) => m.url), expiresAt: new Date(f.expiresAt + 'T23:59').toISOString() }), 'Listing published')
    if (l) nav(`/marketplace/${l.id}`, { replace: true })
  }
  return (
    <Page title="New listing" back>
      <Field label="Listing type">
        <div className="flex flex-wrap gap-2">{Object.entries(LISTING_TYPES).map(([k, l]) => <button key={k} type="button" onClick={() => setF({ ...f, type: k, priceUnit: k === 'rent' ? '/month' : k === 'service' ? '/month' : '' })} className={cls('h-9 px-3.5 rounded-full text-[13px] font-semibold border', f.type === k ? 'bg-brand-800 text-white border-brand-800' : 'bg-white border-ink-200')}>{l}</button>)}</div>
      </Field>
      <Field label="Photos"><MediaPicker value={media} onChange={setMedia} allowVideo={false} max={5} /></Field>
      <Field label="Title"><Input value={f.title} onChange={set('title')} placeholder={f.type === 'rent' ? '2 BHK for rent – B-504' : 'What are you offering?'} maxLength={80} /></Field>
      <Field label="Description"><Textarea value={f.description} onChange={set('description')} placeholder="Condition, age, size, availability…" /></Field>
      {f.type !== 'free' && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={f.type === 'wanted' ? 'Budget (₹)' : 'Price (₹)'}><Input type="number" inputMode="numeric" min={0} value={f.price} onChange={set('price')} /></Field>
          <Field label="Per"><Select value={f.priceUnit} onChange={set('priceUnit')}><option value="">One-time</option><option value="/month">Month</option><option value="/hour">Hour</option><option value="/meal">Meal</option><option value="/day">Day</option></Select></Field>
        </div>
      )}
      <Field label="Listing expires on"><Input type="date" min={isoDay(new Date())} value={f.expiresAt} onChange={set('expiresAt')} /></Field>
      <p className="text-xs text-ink-500 mb-4">Your name and flat number ({aptNo(user.apartmentId) || '—'}) will be shown. Buyers can call or WhatsApp you.</p>
      <Button block size="lg" onClick={submit} disabled={!f.title.trim() || !f.description.trim()}>Publish listing</Button>
    </Page>
  )
}
