import { useState } from 'react'
import { Check, X, Search, UserX, UserCheck as UC } from 'lucide-react'
import { Page, Card, Tabs, Button, Input, Select, Sheet, Avatar, Badge, Empty, Field, useAction, useConfirm } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useData } from '../../lib/db'
import { can, ROLES, roleLabel } from '../../lib/rbac'
import { approveRegistration, updateUser, aptNo } from '../../lib/actions'
import { timeAgo, cls, downloadCSV } from '../../lib/utils'

export default function Residents() {
  const { user } = useAuth()
  const act = useAction()
  const ask = useConfirm()
  const [tab, setTab] = useState('requests')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const regs = useData((d) => d.list('registrations', (r) => r.status === 'pending'))
  const users = useData((d) => d.list('users').sort((a, b) => aptNo(a.apartmentId).localeCompare(aptNo(b.apartmentId))))
  const apts = useData((d) => d.list('apartments'))
  const occupied = new Map()
  users.filter((u) => u.apartmentId && u.status === 'active').forEach((u) => occupied.set(u.apartmentId, [...(occupied.get(u.apartmentId) || []), u]))
  if (!can(user, 'residents.manage')) return <Page title="Residents" back="/admin"><Empty title="Not allowed" /></Page>
  const list = users.filter((u) => !q || (u.name + aptNo(u.apartmentId) + u.phone).toLowerCase().includes(q.toLowerCase()))
  const u = sel && users.find((x) => x.id === sel)
  return (
    <Page title="Residents & apartments" back="/admin" actions={<Button size="sm" variant="secondary" onClick={() => downloadCSV('residents.csv', [['Name', 'Flat', 'Role', 'Phone', 'Email', 'Status'], ...users.map((x) => [x.name, aptNo(x.apartmentId), roleLabel(x.role), x.phone, x.email, x.status])])}>Export</Button>}>
      <Tabs className="mt-1" value={tab} onChange={setTab} tabs={[{ value: 'requests', label: `Requests (${regs.length})`, count: regs.length }, { value: 'people', label: 'People' }, { value: 'flats', label: 'Flats' }]} />
      {tab === 'requests' && (
        <div className="space-y-3 mt-4">
          {regs.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center gap-3">
                <Avatar name={r.name} size={44} />
                <div className="flex-1 min-w-0"><div className="font-bold">{r.name}</div><div className="text-xs text-ink-500">{r.phone}{r.email && ` · ${r.email}`}</div></div>
                <span className="text-[11px] text-ink-400">{timeAgo(r.createdAt)}</span>
              </div>
              <div className="flex gap-2 mt-3 text-xs"><Badge color="blue">{aptNo(r.apartmentId)}</Badge><Badge color="gray">{r.occupancy}</Badge>{occupied.get(r.apartmentId) && <Badge color="amber">Flat has {occupied.get(r.apartmentId).length} resident(s)</Badge>}</div>
              <div className="flex gap-2 mt-3">
                <Button variant="danger" block size="sm" icon={X} onClick={() => act(() => approveRegistration(user, r.id, false), 'Request rejected')}>Reject</Button>
                <Button variant="success" block size="sm" icon={Check} onClick={() => act(() => approveRegistration(user, r.id, true), `${r.name} approved – they can now log in`)}>Approve</Button>
              </div>
            </Card>
          ))}
          {!regs.length && <Empty icon={UC} title="No pending requests" text="New apartment registrations appear here for verification." />}
        </div>
      )}
      {tab === 'people' && (
        <>
          <div className="relative mt-3"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><Input className="pl-9" placeholder="Name, flat or phone" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Card className="mt-3 divide-y divide-ink-100 overflow-hidden">
            {list.map((x) => (
              <button key={x.id} onClick={() => setSel(x.id)} className={cls('w-full flex items-center gap-3 px-4 py-3 text-left active:bg-ink-100', x.status !== 'active' && 'opacity-50')}>
                <Avatar user={x} size={38} />
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{x.name}</div><div className="text-[11px] text-ink-500">{aptNo(x.apartmentId) || 'Staff'} · {x.phone}</div></div>
                {x.role !== 'resident' && <Badge color="purple">{roleLabel(x.role)}</Badge>}
                {x.status !== 'active' && <Badge color="red">Inactive</Badge>}
              </button>
            ))}
          </Card>
        </>
      )}
      {tab === 'flats' && ['A', 'B', 'C'].map((t) => (
        <div key={t}>
          <div className="text-xs font-bold text-ink-400 uppercase tracking-wider mt-5 mb-2">Tower {t} · {apts.filter((a) => a.tower === t && occupied.has(a.id)).length}/{apts.filter((a) => a.tower === t).length} occupied</div>
          <div className="grid grid-cols-4 gap-2">
            {apts.filter((a) => a.tower === t).map((a) => {
              const occ = occupied.get(a.id)
              return (
                <div key={a.id} title={occ?.map((x) => x.name).join(', ') || 'Vacant'} className={cls('rounded-xl p-2 text-center', occ ? 'bg-white shadow-card' : 'bg-ink-100 text-ink-400')}>
                  <div className="text-[13px] font-extrabold">{a.number}</div>
                  <div className="text-[10px] truncate">{occ ? `${occ[0].name.split(' ')[0]}${occ.length > 1 ? ` +${occ.length - 1}` : ''}` : 'Vacant'}</div>
                  <div className={cls('text-[9px] font-bold uppercase', a.occupancy === 'tenant' ? 'text-violet-600' : 'text-ink-400')}>{a.type}{occ && a.occupancy === 'tenant' ? ' · T' : ''}</div>
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <Sheet open={!!u} onClose={() => setSel(null)} title="Manage member">
        {u && (
          <>
            <div className="flex items-center gap-3 mb-4"><Avatar user={u} size={52} /><div><div className="font-bold">{u.name}</div><div className="text-xs text-ink-500">{aptNo(u.apartmentId) || 'Staff'} · {u.phone}</div></div></div>
            <Field label="Role" hint="Controls what this person can access in the app">
              <Select value={u.role} disabled={u.id === user.id} onChange={(e) => act(() => updateUser(user, u.id, { role: e.target.value }), 'Role updated')}>
                {Object.entries(ROLES).filter(([k]) => k !== 'super_admin' || user.role === 'super_admin').map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </Select>
            </Field>
            {u.id !== user.id && (u.status === 'active'
              ? <Button variant="danger" block icon={UserX} onClick={async () => { if (await ask({ title: `Deactivate ${u.name}?`, text: 'They will no longer be able to log in.', ok: 'Deactivate', danger: true })) act(() => updateUser(user, u.id, { status: 'inactive' }), 'Account deactivated') }}>Deactivate account</Button>
              : <Button variant="success" block onClick={() => act(() => updateUser(user, u.id, { status: 'active' }), 'Reactivated')}>Reactivate</Button>)}
          </>
        )}
      </Sheet>
    </Page>
  )
}
