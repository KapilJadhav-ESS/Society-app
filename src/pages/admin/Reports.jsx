import { useState } from 'react'
import { Download, Star } from 'lucide-react'
import { Page, Card, Chips, Button, Empty, Stat } from '../../components/ui'
import { ColumnChart, BarList } from '../../components/Charts'
import { useAuth } from '../../lib/auth'
import { useData } from '../../lib/db'
import { can } from '../../lib/rbac'
import { billTotal, aptNo, residentsOfApt, VISITOR_TYPES, COMPLAINT_CATEGORIES } from '../../lib/actions'
import { inr, ymOf, addMonths, monthLabel, downloadCSV, isoDay } from '../../lib/utils'

const kfmt = (v) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)
const short = (ym) => monthLabel(ym).slice(0, 3)

export default function Reports() {
  const { user } = useAuth()
  const [r, setR] = useState('collection')
  const data = useData((d) => ({ bills: d.list('bills'), complaints: d.list('complaints'), visitors: d.list('visitors', (v) => v.entryAt), bookings: d.list('bookings'), facilities: d.list('facilities'), posts: d.list('posts'), events: d.list('events'), polls: d.list('polls'), users: d.list('users', (u) => u.apartmentId && u.status === 'active') }))
  if (!can(user, 'reports.view')) return <Page title="Reports" back="/admin"><Empty title="Not allowed" /></Page>
  const months = Array.from({ length: 6 }, (_, i) => addMonths(ymOf(), i - 5))
  return (
    <Page title="Reports & analytics" back="/admin">
      <Chips className="my-3" value={r} onChange={setR} options={[{ value: 'collection', label: 'Collection' }, { value: 'outstanding', label: 'Outstanding' }, { value: 'complaints', label: 'Complaints' }, { value: 'visitors', label: 'Visitors' }, { value: 'facilities', label: 'Facility usage' }, { value: 'engagement', label: 'Engagement' }]} />
      {r === 'collection' && <Collection bills={data.bills} months={months} />}
      {r === 'outstanding' && <Outstanding bills={data.bills} />}
      {r === 'complaints' && <Complaints list={data.complaints} />}
      {r === 'visitors' && <Visitors list={data.visitors} />}
      {r === 'facilities' && <Facilities bookings={data.bookings} facilities={data.facilities} />}
      {r === 'engagement' && <Engagement {...data} months={months} />}
    </Page>
  )
}

const Panel = ({ title, sub, children, onExport }) => (
  <Card className="p-4 mb-3">
    <div className="flex items-start justify-between mb-4"><div><div className="font-bold">{title}</div>{sub && <div className="text-xs text-ink-500">{sub}</div>}</div>{onExport && <Button size="sm" variant="ghost" icon={Download} onClick={onExport}>CSV</Button>}</div>
    {children}
  </Card>
)

function Collection({ bills, months }) {
  const rows = months.map((m) => {
    const b = bills.filter((x) => x.month === m)
    const billed = b.reduce((a, x) => a + billTotal(x), 0)
    const coll = b.filter((x) => x.status === 'paid').reduce((a, x) => a + billTotal(x), 0)
    return { m, billed, coll, rate: billed ? coll / billed : 0, flats: b.length, paid: b.filter((x) => x.status === 'paid').length }
  })
  return (
    <>
      <Panel title="Monthly maintenance collection" sub="Amount collected per month" onExport={() => downloadCSV('collection-report.csv', [['Month', 'Billed', 'Collected', 'Collection %', 'Flats billed', 'Flats paid'], ...rows.map((x) => [monthLabel(x.m), x.billed, x.coll, Math.round(x.rate * 100), x.flats, x.paid])])}>
        <ColumnChart data={rows.map((x) => ({ label: short(x.m), value: x.coll }))} format={kfmt} ariaLabel="Monthly collection" />
      </Panel>
      <Panel title="Collection rate by month">
        <BarList data={rows.map((x) => ({ label: monthLabel(x.m), value: Math.round(x.rate * 100), sub: `· ${x.paid}/${x.flats}` }))} format={(v) => `${v}%`} max={100} color="#16A34A" />
      </Panel>
    </>
  )
}

function Outstanding({ bills }) {
  const by = {}
  bills.filter((b) => b.status !== 'paid').forEach((b) => { by[b.apartmentId] = by[b.apartmentId] || { amt: 0, n: 0 }; by[b.apartmentId].amt += billTotal(b); by[b.apartmentId].n++ })
  const rows = Object.entries(by).map(([id, v]) => ({ id, apt: aptNo(id), name: residentsOfApt(id)[0]?.name || '—', ...v })).sort((a, b) => b.amt - a.amt)
  const total = rows.reduce((a, x) => a + x.amt, 0)
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3"><Stat label="Total outstanding" value={inr(total)} tone="red" /><Stat label="Defaulting flats" value={rows.length} sub={`${rows.filter((x) => x.n > 1).length} with 2+ months`} /></div>
      <Panel title="Outstanding by flat" sub="Highest dues first" onExport={() => downloadCSV('outstanding-report.csv', [['Flat', 'Resident', 'Unpaid bills', 'Amount'], ...rows.map((x) => [x.apt, x.name, x.n, x.amt])])}>
        <BarList data={rows.slice(0, 15).map((x) => ({ label: `${x.apt} · ${x.name}`, value: x.amt, sub: x.n > 1 ? `(${x.n} mo)` : '' }))} format={inr} color="#DC2626" />
        {rows.length > 15 && <p className="text-xs text-ink-400 mt-3">+{rows.length - 15} more in CSV export</p>}
      </Panel>
    </>
  )
}

function Complaints({ list }) {
  const resH = list.map((c) => { const h = [...c.history].reverse().find((x) => x.status === 'resolved'); return h ? { c, h: (new Date(h.at) - new Date(c.createdAt)) / 3600000 } : null }).filter(Boolean)
  const rated = list.filter((c) => c.rating)
  const byCat = COMPLAINT_CATEGORIES.map((cat) => ({ label: cat, value: list.filter((c) => c.category === cat).length })).filter((x) => x.value).sort((a, b) => b.value - a.value)
  const avgBy = COMPLAINT_CATEGORIES.map((cat) => { const r = resH.filter((x) => x.c.category === cat); return { label: cat, value: r.length ? Math.round(r.reduce((a, x) => a + x.h, 0) / r.length) : 0 } }).filter((x) => x.value)
  const resolved = list.filter((c) => ['resolved', 'closed'].includes(c.status)).length
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Stat label="Total tickets" value={list.length} />
        <Stat label="Resolved" value={`${list.length ? Math.round((resolved / list.length) * 100) : 0}%`} tone="green" />
        <Stat label="Avg rating" value={rated.length ? (rated.reduce((a, c) => a + c.rating, 0) / rated.length).toFixed(1) : '—'} sub={<span className="flex items-center gap-0.5"><Star size={10} /> {rated.length} rated</span>} tone="amber" />
      </div>
      <Panel title="Tickets by category" onExport={() => downloadCSV('complaints-report.csv', [['Ticket', 'Title', 'Category', 'Priority', 'Status', 'Flat', 'Created', 'Rating'], ...list.map((c) => [c.ticket, c.title, c.category, c.priority, c.status, aptNo(c.apartmentId), isoDay(c.createdAt), c.rating || ''])])}>
        <BarList data={byCat} />
      </Panel>
      <Panel title="Average resolution time" sub="Hours from submission to resolved">
        {avgBy.length ? <BarList data={avgBy} format={(v) => `${v} h`} color="#5470B0" /> : <p className="text-sm text-ink-400">No resolved tickets yet.</p>}
      </Panel>
    </>
  )
}

function Visitors({ list }) {
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 86400000))
  const series = days.map((d) => ({ label: d.toLocaleDateString('en-IN', { weekday: 'short' }), value: list.filter((v) => isoDay(v.entryAt) === isoDay(d)).length }))
  const byType = Object.entries(VISITOR_TYPES).map(([k, l]) => ({ label: l, value: list.filter((v) => v.type === k).length })).sort((a, b) => b.value - a.value)
  const hours = Array.from({ length: 8 }, (_, i) => i * 3)
  const byHour = hours.map((h) => ({ label: `${h}–${h + 3}`, value: list.filter((v) => { const x = new Date(v.entryAt).getHours(); return x >= h && x < h + 3 }).length }))
  return (
    <>
      <Panel title="Visitors – last 7 days" sub={`${series.reduce((a, x) => a + x.value, 0)} entries`}><ColumnChart data={series} ariaLabel="Visitors per day" /></Panel>
      <Panel title="By visitor type"><BarList data={byType} color="#7C3AED" /></Panel>
      <Panel title="Peak hours" sub="Entries by time of day"><ColumnChart data={byHour} height={110} ariaLabel="Entries by hour" /></Panel>
    </>
  )
}

function Facilities({ bookings, facilities }) {
  const used = bookings.filter((b) => b.status === 'confirmed')
  const rows = facilities.map((f) => ({ label: `${f.emoji} ${f.name}`, value: used.filter((b) => b.facilityId === f.id).length, hrs: used.filter((b) => b.facilityId === f.id).reduce((a, b) => a + (new Date(b.end) - new Date(b.start)) / 3600000, 0), rev: used.filter((b) => b.facilityId === f.id).reduce((a, b) => a + (b.amount || 0), 0) })).sort((a, b) => b.value - a.value)
  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-3"><Stat label="Confirmed" value={used.length} /><Stat label="Pending" value={bookings.filter((b) => b.status === 'pending').length} tone="amber" /><Stat label="Revenue" value={inr(rows.reduce((a, x) => a + x.rev, 0))} tone="green" /></div>
      <Panel title="Bookings by facility" onExport={() => downloadCSV('facility-usage.csv', [['Facility', 'Bookings', 'Hours', 'Revenue'], ...rows.map((x) => [x.label, x.value, x.hrs, x.rev])])}><BarList data={rows.map((x) => ({ ...x, sub: `· ${Math.round(x.hrs)}h` }))} color="#0284C7" /></Panel>
    </>
  )
}

function Engagement({ posts, events, polls, users, months }) {
  const comments = posts.reduce((a, p) => a + p.comments.length, 0)
  const likes = posts.reduce((a, p) => a + p.likes.length, 0)
  const active = new Set([...posts.map((p) => p.userId), ...posts.flatMap((p) => p.comments.map((c) => c.userId)), ...posts.flatMap((p) => p.likes), ...events.flatMap((e) => e.rsvps.map((r) => r.userId)), ...polls.flatMap((p) => p.votes.map((v) => v.userId))])
  const perMonth = months.map((m) => ({ label: short(m), value: posts.filter((p) => ymOf(new Date(p.createdAt)) === m).length + posts.flatMap((p) => p.comments).filter((c) => ymOf(new Date(c.createdAt)) === m).length }))
  const flats = new Set(users.map((u) => u.apartmentId)).size
  return (
    <>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <Stat label="Active residents" value={`${users.length ? Math.round((active.size / users.length) * 100) : 0}%`} sub={`${active.size} of ${users.length}`} tone="green" />
        <Stat label="Posts · comments · likes" value={`${posts.length} · ${comments} · ${likes}`} />
      </div>
      <Panel title="Feed activity" sub="Posts + comments per month"><ColumnChart data={perMonth} ariaLabel="Feed activity per month" /></Panel>
      <Panel title="Event participation"><BarList data={events.slice().sort((a, b) => new Date(b.start) - new Date(a.start)).slice(0, 6).map((e) => ({ label: e.title, value: e.rsvps.filter((r) => r.status === 'going').length }))} color="#DB2777" /></Panel>
      <Panel title="Poll turnout" sub="Votes vs eligible voters"><BarList data={polls.map((p) => { const elig = p.eligibility === 'resident' ? users.length : flats; return { label: p.question, value: elig ? Math.round((p.votes.length / elig) * 100) : 0, sub: `· ${p.votes.length}` } })} format={(v) => `${v}%`} max={100} color="#D97706" /></Panel>
    </>
  )
}
