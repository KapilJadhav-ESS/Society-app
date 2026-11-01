import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { Plus, Vote, Lock, EyeOff, Users, Home as HomeIcon, X, CheckCircle2, Clock } from 'lucide-react'
import { Page, Button, Card, Tabs, Empty, Field, Input, Textarea, Toggle, Select, Badge, Bar, useAction, useConfirm } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/db'
import { can } from '../lib/rbac'
import { createPoll, castVote, canVote, pollOpen, closePoll, userById } from '../lib/actions'
import { fmtDate, timeAgo, cls, isoDay } from '../lib/utils'

export default function Polls() {
  return (
    <Routes>
      <Route index element={<List />} />
      <Route path="new" element={<NewPoll />} />
    </Routes>
  )
}

const ELIG = { apartment: ['One vote per flat', HomeIcon], resident: ['One vote per resident', Users], owners: ['Owners only · one per flat', Lock] }

function PollCard({ p }) {
  const { user } = useAuth()
  const act = useAction()
  const ask = useConfirm()
  const [sel, setSel] = useState([])
  const chk = canVote(p, user)
  const open = pollOpen(p)
  const showResults = !chk.ok || !open
  const total = p.votes.length
  const tally = p.options.map((o) => ({ ...o, n: p.votes.filter((v) => v.optionIds.includes(o.id)).length }))
  const max = Math.max(...tally.map((t) => t.n), 1)
  const myVote = p.votes.find((v) => v.userId === user.id) || chk.voted
  const [EL, EIcon] = ELIG[p.eligibility] || ELIG.resident
  const toggle = (id) => setSel(p.multi ? (sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]) : [id])
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {open ? <Badge color="green" dot>Live</Badge> : <Badge color="gray">Closed</Badge>}
        {p.multi && <Badge color="purple">Multiple choice</Badge>}
        {p.anonymous && <Badge color="gray"><EyeOff size={10} /> Anonymous</Badge>}
      </div>
      <div className="font-bold text-[16px] leading-snug">{p.question}</div>
      {p.description && <p className="text-sm text-ink-500 mt-1">{p.description}</p>}
      <div className="space-y-2 mt-4">
        {tally.map((o) => {
          const pct = total ? Math.round((o.n / total) * 100) : 0
          const mine = myVote?.optionIds.includes(o.id)
          if (showResults) return (
            <div key={o.id}>
              <div className="flex justify-between text-sm mb-1"><span className={cls('font-semibold', mine && 'text-brand-800')}>{o.text} {mine && <CheckCircle2 size={14} className="inline text-accent-600 -mt-0.5" />}</span><span className="font-bold">{pct}%</span></div>
              <Bar value={o.n} max={p.multi ? total : max === 0 ? 1 : total} color={o.n === Math.max(...tally.map((t) => t.n)) && o.n > 0 ? 'bg-accent-500' : 'bg-brand-300'} />
              {!p.anonymous && can(user, 'polls.create') && o.n > 0 && <div className="text-[11px] text-ink-400 mt-1 truncate">{p.votes.filter((v) => v.optionIds.includes(o.id)).map((v) => userById(v.userId)?.name.split(' ')[0]).join(', ')}</div>}
            </div>
          )
          return (
            <button key={o.id} onClick={() => toggle(o.id)} className={cls('w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left text-sm font-semibold transition', sel.includes(o.id) ? 'border-brand-600 bg-brand-50' : 'border-ink-200')}>
              <span className={cls('h-5 w-5 grid place-items-center border-2 shrink-0', p.multi ? 'rounded-md' : 'rounded-full', sel.includes(o.id) ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300')}>{sel.includes(o.id) && '✓'}</span>{o.text}
            </button>
          )
        })}
      </div>
      {!showResults && <Button block className="mt-4" icon={Vote} disabled={!sel.length} onClick={() => act(() => castVote(user, p.id, sel), 'Your vote has been recorded')}>Submit vote</Button>}
      {showResults && chk.reason && open && <p className="text-xs text-ink-500 mt-3">{chk.reason}</p>}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-ink-100 text-[11px] text-ink-500 flex-wrap">
        <span className="flex items-center gap-1"><EIcon size={12} /> {EL}</span>
        <span>{`${total} vote${total !== 1 ? 's' : ''}`}</span>
        <span className="flex items-center gap-1"><Clock size={12} /> {open ? `Closes ${timeAgo(p.closesAt)}` : `Closed ${fmtDate(p.closesAt)}`}</span>
        {can(user, 'polls.create') && open && <button className="ml-auto text-red-600 font-semibold" onClick={async () => { if (await ask({ title: 'Close this poll now?', ok: 'Close poll' })) act(() => closePoll(user, p.id), 'Poll closed') }}>Close now</button>}
      </div>
    </Card>
  )
}

function List() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [tab, setTab] = useState('open')
  const polls = useData((d) => d.list('polls').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  const list = polls.filter((p) => (tab === 'open' ? pollOpen(p) : !pollOpen(p)))
  return (
    <Page title="Polls & surveys" subtitle="Your voice in society decisions" back actions={can(user, 'polls.create') && <Button size="sm" icon={Plus} onClick={() => nav('new')}>New poll</Button>}>
      <Tabs className="mt-1" value={tab} onChange={setTab} tabs={[{ value: 'open', label: `Open (${polls.filter(pollOpen).length})` }, { value: 'closed', label: 'Closed' }]} />
      <div className="space-y-3 mt-4">
        {list.map((p) => <PollCard key={p.id} p={p} />)}
        {!list.length && <Empty icon={Vote} title="No polls" />}
      </div>
    </Page>
  )
}

function NewPoll() {
  const { user } = useAuth()
  const nav = useNavigate()
  const act = useAction()
  const [f, setF] = useState({ question: '', description: '', options: ['', ''], multi: false, anonymous: false, eligibility: 'apartment', closesAt: isoDay(Date.now() + 7 * 86400000) })
  if (!can(user, 'polls.create')) return <Page title="New poll" back><Empty title="Committee only" text="Only committee members can create polls." /></Page>
  const setOpt = (i, v) => setF({ ...f, options: f.options.map((o, j) => (j === i ? v : o)) })
  const submit = () => { if (act(() => createPoll(user, { ...f, closesAt: new Date(f.closesAt + 'T23:59').toISOString() }), 'Poll published – residents notified')) nav('/polls', { replace: true }) }
  return (
    <Page title="New poll" back>
      <Field label="Question"><Input value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} placeholder="e.g. Which date for Holi celebration?" /></Field>
      <Field label="Details (optional)"><Textarea rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="Options">
        <div className="space-y-2">
          {f.options.map((o, i) => (
            <div key={i} className="flex gap-2">
              <Input value={o} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Option ${i + 1}`} />
              {f.options.length > 2 && <button aria-label="Remove option" onClick={() => setF({ ...f, options: f.options.filter((_, j) => j !== i) })} className="h-12 w-12 shrink-0 grid place-items-center text-ink-400 rounded-xl hover:bg-ink-100"><X size={18} /></button>}
            </div>
          ))}
        </div>
        {f.options.length < 8 && <Button variant="ghost" size="sm" className="mt-2" icon={Plus} onClick={() => setF({ ...f, options: [...f.options, ''] })}>Add option</Button>}
      </Field>
      <Field label="Who can vote?"><Select value={f.eligibility} onChange={(e) => setF({ ...f, eligibility: e.target.value })}><option value="apartment">All flats – one vote per apartment</option><option value="resident">All residents – one vote each</option><option value="owners">Owners only – one vote per flat</option></Select></Field>
      <Field label="Closes on"><Input type="date" min={isoDay(Date.now() + 86400000)} value={f.closesAt} onChange={(e) => setF({ ...f, closesAt: e.target.value })} /></Field>
      <Card className="px-4 divide-y divide-ink-100">
        <Toggle checked={f.multi} onChange={(v) => setF({ ...f, multi: v })} label="Allow multiple choices" />
        <Toggle checked={f.anonymous} onChange={(v) => setF({ ...f, anonymous: v })} label="Anonymous voting" desc="Voter names are never shown, even to admins" />
      </Card>
      <Button block size="lg" className="mt-6" onClick={submit}>Publish poll</Button>
    </Page>
  )
}
