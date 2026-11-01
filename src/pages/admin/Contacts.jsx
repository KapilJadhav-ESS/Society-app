import { useState } from 'react'
import { Plus, Trash2, Phone } from 'lucide-react'
import { Page, Card, Tabs, Button, Field, Input, Select, Empty, useAction, useConfirm } from '../../components/ui'
import { useAuth } from '../../lib/auth'
import { useData, db } from '../../lib/db'
import { can } from '../../lib/rbac'
import { COMPLAINT_CATEGORIES } from '../../lib/actions'
import { uid, cls } from '../../lib/utils'

export default function Contacts() {
  const { user } = useAuth()
  const act = useAction()
  const ask = useConfirm()
  const [tab, setTab] = useState('staff')
  const staff = useData((d) => d.list('staff'))
  const contacts = useData((d) => d.list('contacts'))
  const [s, setS] = useState({ name: '', role: '', phone: '', skills: [] })
  const [c, setC] = useState({ group: 'Society', name: '', phone: '', note: '' })
  if (!can(user, 'facilities.manage')) return <Page title="Staff & contacts" back="/admin"><Empty title="Not allowed" /></Page>
  const guard = (fn) => () => act(() => { if (!can(user, 'facilities.manage')) throw new Error('Not allowed'); fn() })
  const del = async (col, id, name) => { if (await ask({ title: `Remove ${name}?`, ok: 'Remove', danger: true })) act(() => db.remove(col, id), 'Removed') }
  return (
    <Page title="Staff & contacts" back="/admin">
      <Tabs className="mt-1" value={tab} onChange={setTab} tabs={[{ value: 'staff', label: `Staff (${staff.length})` }, { value: 'contacts', label: `Directory contacts (${contacts.length})` }]} />
      {tab === 'staff' ? (
        <>
          <p className="text-sm text-ink-500 mt-3">Staff appear in the “Assign to staff” list on complaints. Tick the categories each person handles.</p>
          <Card className="mt-3 divide-y divide-ink-100 overflow-hidden">
            {staff.map((x) => (
              <div key={x.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0"><div className="font-semibold truncate">{x.name}</div><div className="text-xs text-ink-500 truncate">{x.role} · {x.phone}{x.skills?.length ? ` · ${x.skills.join(', ')}` : ''}</div></div>
                <a href={`tel:${x.phone.replace(/\s/g, '')}`} aria-label="Call" className="h-9 w-9 rounded-full bg-accent-50 text-accent-700 grid place-items-center"><Phone size={16} /></a>
                <button aria-label="Remove" onClick={() => del('staff', x.id, x.name)} className="text-ink-400"><Trash2 size={17} /></button>
              </div>
            ))}
            {!staff.length && <p className="p-4 text-sm text-ink-400">No staff added yet.</p>}
          </Card>
          <Card className="p-4 mt-4">
            <div className="font-bold text-sm mb-3">Add staff member</div>
            <Field label="Name"><Input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Job"><Input value={s.role} onChange={(e) => setS({ ...s, role: e.target.value })} placeholder="Plumber, Electrician…" /></Field>
              <Field label="Phone"><Input inputMode="tel" value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} /></Field>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {COMPLAINT_CATEGORIES.map((k) => <button key={k} type="button" onClick={() => setS({ ...s, skills: s.skills.includes(k) ? s.skills.filter((x) => x !== k) : [...s.skills, k] })} className={cls('h-8 px-3 rounded-full text-xs font-semibold border', s.skills.includes(k) ? 'bg-brand-800 text-white border-brand-800' : 'bg-white border-ink-200')}>{k}</button>)}
            </div>
            <Button block icon={Plus} disabled={!s.name.trim() || !s.phone.trim()} onClick={guard(() => { db.insert('staff', { id: 'st_' + uid(), ...s, name: s.name.trim() }); setS({ name: '', role: '', phone: '', skills: [] }) })}>Add staff</Button>
          </Card>
        </>
      ) : (
        <>
          {['Emergency', 'Society', 'Maintenance'].map((g) => (
            <div key={g}>
              <div className="text-xs font-bold text-ink-400 uppercase tracking-wider mt-5 mb-2">{g}</div>
              <Card className="divide-y divide-ink-100 overflow-hidden">
                {contacts.filter((x) => x.group === g).map((x) => (
                  <div key={x.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0"><div className="font-semibold truncate">{x.name}</div><div className="text-xs text-ink-500 truncate">{x.phone}{x.note && ` · ${x.note}`}</div></div>
                    <button aria-label="Remove" onClick={() => del('contacts', x.id, x.name)} className="text-ink-400"><Trash2 size={17} /></button>
                  </div>
                ))}
                {!contacts.some((x) => x.group === g) && <p className="p-4 text-sm text-ink-400">None yet.</p>}
              </Card>
            </div>
          ))}
          <Card className="p-4 mt-4">
            <div className="font-bold text-sm mb-3">Add contact</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Section"><Select value={c.group} onChange={(e) => setC({ ...c, group: e.target.value })}><option>Society</option><option>Maintenance</option><option>Emergency</option></Select></Field>
              <Field label="Phone"><Input inputMode="tel" value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} /></Field>
            </div>
            <Field label="Name"><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="e.g. Ruby Hall Clinic" /></Field>
            <Field label="Note (optional)"><Input value={c.note} onChange={(e) => setC({ ...c, note: e.target.value })} placeholder="24 × 7, 2 km away…" /></Field>
            <Button block icon={Plus} disabled={!c.name.trim() || !c.phone.trim()} onClick={guard(() => { db.insert('contacts', { id: 'c_' + uid(), ...c, icon: c.group === 'Emergency' ? 'siren' : c.group === 'Society' ? 'building' : 'wrench' }); setC({ group: c.group, name: '', phone: '', note: '' }) })}>Add contact</Button>
          </Card>
        </>
      )}
    </Page>
  )
}
