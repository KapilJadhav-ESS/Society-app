import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, X, EyeOff, Trash2, RotateCcw, ShieldCheck, ClipboardList, Download } from 'lucide-react'
import { Page, Card, Tabs, Chips, Button, Empty, Toggle, Sheet, Field, Input, Textarea, Stat, Badge, useAction } from '../../components/ui'
import { ComplaintRow } from '../Complaints'
import { BookingBadge } from '../Facilities'
import { VisitorRow } from '../Visitors'
import PostCard from '../../components/PostCard'
import { useAuth } from '../../lib/auth'
import { useData } from '../../lib/db'
import { can } from '../../lib/rbac'
import { isOverdue, decideBooking, saveFacility, moderatePost, aptNo, userById, VISITOR_TYPES, updateListing } from '../../lib/actions'
import { fmtDateTime, fmtTime, inr, sameDay, downloadCSV, timeAgo } from '../../lib/utils'

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)
const hrs = (h) => (h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} d`)

export function AdminComplaints() {
  const { user } = useAuth()
  const [f, setF] = useState('open')
  const all = useData((d) => d.list('complaints').sort((a, b) => (isOverdue(b) - isOverdue(a)) || new Date(b.createdAt) - new Date(a.createdAt)))
  if (!can(user, 'complaints.manage')) return <Page title="Complaints" back="/admin"><Empty title="Not allowed" /></Page>
  const open = all.filter((c) => !['resolved', 'closed'].includes(c.status))
  const resp = all.map((c) => { const h = c.history.find((x) => x.status === 'acknowledged'); return h && (new Date(h.at) - new Date(c.createdAt)) / 3600000 }).filter(Boolean)
  const res = all.map((c) => { const h = [...c.history].reverse().find((x) => x.status === 'resolved'); return h && (new Date(h.at) - new Date(c.createdAt)) / 3600000 }).filter(Boolean)
  const list = all.filter((c) => f === 'all' ? true : f === 'open' ? open.includes(c) : f === 'overdue' ? isOverdue(c) : f === 'unassigned' ? !c.assigneeId && open.includes(c) : c.status === f)
  return (
    <Page title="Complaint management" back="/admin">
      <div className="grid grid-cols-3 gap-2 mt-2">
        <Stat label="Open" value={open.length} />
        <Stat label="Avg response" value={hrs(avg(resp))} />
        <Stat label="Avg resolution" value={hrs(avg(res))} />
      </div>
      <Chips className="my-3" value={f} onChange={setF} options={[{ value: 'open', label: 'Open', count: open.length }, { value: 'overdue', label: 'Overdue', count: all.filter(isOverdue).length }, { value: 'unassigned', label: 'Unassigned', count: open.filter((c) => !c.assigneeId).length }, { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' }, { value: 'all', label: 'All' }]} />
      <div className="space-y-3">{list.map((c) => <ComplaintRow key={c.id} c={c} showApt />)}</div>
      {!list.length && <Empty title="Nothing here" />}
    </Page>
  )
}

export function AdminBookings() {
  const { user } = useAuth()
  const act = useAction()
  const [tab, setTab] = useState('pending')
  const [reject, setReject] = useState(null)
  const [reason, setReason] = useState('')
  const [edit, setEdit] = useState(null)
  const bookings = useData((d) => d.list('bookings').sort((a, b) => new Date(a.start) - new Date(b.start)))
  const facilities = useData((d) => d.list('facilities'))
  if (!can(user, 'facilities.manage')) return <Page title="Bookings" back="/admin"><Empty title="Not allowed" /></Page>
  const fac = (id) => facilities.find((f) => f.id === id) || {}
  const pending = bookings.filter((b) => b.status === 'pending')
  const upcoming = bookings.filter((b) => b.status === 'confirmed' && new Date(b.end) > new Date())
  const Row = ({ b, children }) => (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{fac(b.facilityId).emoji}</span>
        <div className="flex-1 min-w-0"><div className="font-bold">{fac(b.facilityId).name}</div><div className="text-xs text-ink-500">{fmtDateTime(b.start)} – {fmtTime(b.end)}</div><div className="text-xs text-ink-500">{aptNo(b.apartmentId)} · {userById(b.userId)?.name}{b.amount ? ` · ${inr(b.amount)}` : ''}</div>{b.note && <div className="text-xs text-ink-400 mt-0.5">“{b.note}”</div>}</div>
        <BookingBadge s={b.status} />
      </div>
      {children}
    </Card>
  )
  const f = edit && facilities.find((x) => x.id === edit)
  return (
    <Page title="Facilities & bookings" back="/admin">
      <Tabs className="mt-1" value={tab} onChange={setTab} tabs={[{ value: 'pending', label: `Approvals (${pending.length})`, count: pending.length }, { value: 'upcoming', label: 'Upcoming' }, { value: 'facilities', label: 'Facilities' }]} />
      <div className="space-y-3 mt-4">
        {tab === 'pending' && pending.map((b) => (
          <Row key={b.id} b={b}>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="danger" block icon={X} onClick={() => { setReason(''); setReject(b.id) }}>Decline</Button>
              <Button size="sm" variant="success" block icon={Check} onClick={() => act(() => decideBooking(user, b.id, true), 'Booking approved')}>Approve</Button>
            </div>
          </Row>
        ))}
        {tab === 'pending' && !pending.length && <Empty icon={Check} title="No pending approvals" />}
        {tab === 'upcoming' && upcoming.map((b) => <Row key={b.id} b={b} />)}
        {tab === 'facilities' && facilities.map((x) => (
          <Card key={x.id} className="p-4 flex items-center gap-3" onClick={() => setEdit(x.id)}>
            <span className="text-2xl">{x.emoji}</span>
            <div className="flex-1"><div className="font-bold">{x.name}</div><div className="text-xs text-ink-500">{x.charge ? inr(x.charge) : 'Free'} · {x.requiresApproval ? 'Approval required' : 'Instant booking'} · {bookings.filter((b) => b.facilityId === x.id && b.status === 'confirmed').length} bookings</div></div>
            {x.active ? <Badge color="green">Open</Badge> : <Badge color="red">Closed</Badge>}
          </Card>
        ))}
      </div>
      <Sheet open={!!reject} onClose={() => setReject(null)} title="Decline booking">
        <Field label="Reason (shared with resident)"><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Hall reserved for society AGM" /></Field>
        <Button variant="dangerSolid" block onClick={() => { act(() => decideBooking(user, reject, false, reason), 'Booking declined'); setReject(null) }}>Decline booking</Button>
      </Sheet>
      <Sheet open={!!f} onClose={() => setEdit(null)} title={f ? `${f.emoji} ${f.name}` : ''}>
        {f && (
          <>
            <div className="divide-y divide-ink-100">
              <Toggle checked={f.active} onChange={(v) => act(() => saveFacility(user, f.id, { active: v }), v ? 'Facility opened' : 'Facility closed for booking')} label="Open for booking" desc="Close temporarily for maintenance" />
              <Toggle checked={f.requiresApproval} onChange={(v) => act(() => saveFacility(user, f.id, { requiresApproval: v }), 'Updated')} label="Require committee approval" />
            </div>
            <Field label="Charge per slot (₹)" className="mt-3"><Input type="number" min={0} defaultValue={f.charge} onBlur={(e) => act(() => saveFacility(user, f.id, { charge: Number(e.target.value) || 0 }), 'Charge updated')} /></Field>
            <Field label="Rules (one per line)"><Textarea rows={4} defaultValue={f.rules.join('\n')} onBlur={(e) => act(() => saveFacility(user, f.id, { rules: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) }), 'Rules updated')} /></Field>
          </>
        )}
      </Sheet>
    </Page>
  )
}

export function Moderation() {
  const { user } = useAuth()
  const act = useAction()
  const [tab, setTab] = useState('reported')
  const posts = useData((d) => d.list('posts', (p) => (tab === 'reported' ? p.reports.length > 0 && !p.hidden : p.hidden)))
  const listings = useData((d) => d.list('listings', (l) => l.status === 'active'))
  if (!can(user, 'moderation')) return <Page title="Moderation" back="/admin"><Empty title="Not allowed" /></Page>
  return (
    <Page title="Community moderation" back="/admin">
      <Tabs className="mt-1" value={tab} onChange={setTab} tabs={[{ value: 'reported', label: 'Reported' }, { value: 'hidden', label: 'Hidden' }, { value: 'market', label: 'Marketplace' }]} />
      <div className="space-y-4 mt-4">
        {tab !== 'market' && posts.map((p) => (
          <div key={p.id}>
            {p.reports.length > 0 && <div className="text-xs font-semibold text-red-600 mb-1.5">{p.reports.length} report(s): {[...new Set(p.reports.map((r) => r.reason))].join(', ')}</div>}
            <PostCard post={p} />
            <div className="flex gap-2 mt-2">
              {!p.hidden ? <Button size="sm" variant="secondary" icon={EyeOff} onClick={() => act(() => moderatePost(user, p.id, 'hide'), 'Post hidden')}>Hide</Button> : null}
              <Button size="sm" variant="outline" icon={RotateCcw} onClick={() => act(() => moderatePost(user, p.id, 'restore'), 'Restored & reports cleared')}>{p.hidden ? 'Restore' : 'Dismiss reports'}</Button>
              <Button size="sm" variant="danger" icon={Trash2} onClick={() => act(() => moderatePost(user, p.id, 'delete'), 'Post deleted')}>Delete</Button>
            </div>
          </div>
        ))}
        {tab !== 'market' && !posts.length && <Empty icon={ShieldCheck} title="All clean" text="No posts need attention." />}
        {tab === 'market' && listings.map((l) => (
          <Card key={l.id} className="p-3 flex items-center gap-3">
            {l.media?.[0] && <img src={l.media[0]} alt="" className="h-12 w-12 rounded-xl object-cover" />}
            <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{l.title}</div><div className="text-xs text-ink-500">{userById(l.userId)?.name} · {timeAgo(l.createdAt)}</div></div>
            <Button size="sm" variant="danger" onClick={() => act(() => updateListing(user, l.id, { status: 'removed' }), 'Listing removed')}>Remove</Button>
          </Card>
        ))}
      </div>
    </Page>
  )
}

export function AdminVisitors() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [t, setT] = useState('all')
  const all = useData((d) => d.list('visitors', (v) => v.entryAt).sort((a, b) => new Date(b.entryAt) - new Date(a.entryAt)))
  if (!can(user, 'visitors.logs')) return <Page title="Visitors" back="/admin"><Empty title="Not allowed" /></Page>
  const list = all.filter((v) => t === 'all' || v.type === t).slice(0, 60)
  const today = all.filter((v) => sameDay(v.entryAt, new Date())).length
  return (
    <Page title="Visitor logs" back="/admin" actions={<Button size="sm" variant="secondary" icon={Download} onClick={() => downloadCSV('visitor-logs.csv', [['Name', 'Type', 'Flat', 'Entry', 'Exit', 'Vehicle'], ...all.map((v) => [v.name, VISITOR_TYPES[v.type], aptNo(v.apartmentId), fmtDateTime(v.entryAt), v.exitAt ? fmtDateTime(v.exitAt) : 'Inside', v.vehicle])])}>CSV</Button>}>
      <div className="grid grid-cols-3 gap-2 mt-2">
        <Stat label="Today" value={today} />
        <Stat label="Inside now" value={all.filter((v) => v.status === 'inside').length} />
        <Stat label="Last 7 days" value={all.filter((v) => Date.now() - new Date(v.entryAt) < 7 * 86400000).length} />
      </div>
      {can(user, 'visitors.gate') && <Button variant="outline" block className="mt-3" icon={ClipboardList} onClick={() => nav('/guard')}>Open gate console</Button>}
      <Chips className="my-3" value={t} onChange={setT} options={[{ value: 'all', label: 'All' }, ...Object.entries(VISITOR_TYPES).map(([k, l]) => ({ value: k, label: l }))]} />
      <div className="space-y-3">{list.map((v) => <VisitorRow key={v.id} v={v} showApt />)}</div>
    </Page>
  )
}
