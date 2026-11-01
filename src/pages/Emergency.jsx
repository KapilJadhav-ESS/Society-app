import { useState } from 'react'
import { Siren, Phone, Ambulance, Flame, ShieldAlert, Shield, Wrench, Building2, CheckCircle2, AlertTriangle, MessageSquareWarning } from 'lucide-react'
import { Page, Card, Button, Sheet, Field, Input, Textarea, Tabs, Badge, useAction, useConfirm } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/db'
import { can } from '../lib/rbac'
import { sendEmergencyAlert, resolveAlert, userById, notify, aptNo } from '../lib/actions'
import { timeAgo, cls } from '../lib/utils'

const BIG = [
  { label: 'Ambulance', phone: '108', icon: Ambulance, c: 'from-red-500 to-rose-600' },
  { label: 'Fire', phone: '101', icon: Flame, c: 'from-orange-500 to-red-500' },
  { label: 'Police', phone: '100', icon: ShieldAlert, c: 'from-brand-600 to-brand-800' },
  { label: 'Emergency', phone: '112', icon: Siren, c: 'from-rose-600 to-red-700' }
]

export default function Emergency() {
  const { user } = useAuth()
  const act = useAction()
  const ask = useConfirm()
  const SOC = useData((d) => d.list('contacts', (c) => c.group === 'Society' || c.group === 'Maintenance').slice(0, 4).map((c) => ({ label: c.name, sub: c.note, phone: c.phone, icon: c.group === 'Maintenance' ? Wrench : c.icon === 'shield' ? Shield : Building2 })))
  const alerts = useData((d) => d.list('alerts').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ title: '', message: '', severity: 'high' })
  const admin = can(user, 'emergency.alert')
  const sos = async () => {
    if (!(await ask({ title: 'Send SOS to security?', text: 'Security guards and the committee will be alerted immediately with your flat number.', ok: 'Send SOS', danger: true }))) return
    act(() => notify({ roles: ['security', 'chairman', 'secretary', 'facility_manager', 'super_admin'] }, { type: 'alert', title: `🆘 SOS from ${aptNo(user.apartmentId) || user.name}`, body: `${user.name} (${user.phone}) needs urgent help.`, link: '/emergency' }), 'SOS sent – security has been alerted')
  }
  return (
    <Page title="Emergency & help" back>
      <button onClick={sos} className="mt-2 w-full rounded-3xl bg-gradient-to-br from-red-500 to-red-700 text-white p-6 shadow-[0_10px_40px_rgba(220,38,38,.35)] active:scale-[.98] transition flex items-center gap-4">
        <span className="relative h-16 w-16 grid place-items-center"><span className="absolute inset-0 rounded-full bg-white/25 animate-ping" /><span className="relative h-16 w-16 rounded-full bg-white text-red-600 grid place-items-center font-black text-lg">SOS</span></span>
        <span className="text-left"><span className="block text-xl font-extrabold">Alert security now</span><span className="text-sm text-red-100">Notifies guards & committee with your flat</span></span>
      </button>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {BIG.map((b) => (
          <a key={b.label} href={`tel:${b.phone}`} className={cls('rounded-2xl bg-gradient-to-br text-white p-4 shadow-card active:scale-95 transition', b.c)}>
            <b.icon size={26} />
            <div className="font-extrabold text-lg mt-2">{b.label}</div>
            <div className="text-sm opacity-90 flex items-center gap-1"><Phone size={13} /> {b.phone}</div>
          </a>
        ))}
      </div>

      <h3 className="font-bold mt-6 mb-2">Society contacts</h3>
      <Card className="divide-y divide-ink-100 overflow-hidden">
        {SOC.map((s) => (
          <a key={s.label} href={`tel:${s.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-ink-100">
            <span className="h-10 w-10 rounded-xl bg-red-50 text-red-600 grid place-items-center"><s.icon size={18} /></span>
            <div className="flex-1"><div className="font-semibold">{s.label}</div><div className="text-xs text-ink-500">{s.sub}</div></div>
            <span className="h-10 w-10 rounded-full bg-accent-500 text-white grid place-items-center"><Phone size={17} /></span>
          </a>
        ))}
      </Card>

      <div className="flex items-center justify-between mt-6 mb-2">
        <h3 className="font-bold">Emergency alerts</h3>
        {admin && <Button size="sm" variant="dangerSolid" icon={Siren} onClick={() => setOpen(true)}>Broadcast alert</Button>}
      </div>
      <div className="space-y-2">
        {alerts.map((a) => (
          <Card key={a.id} className={cls('p-4', a.active && 'border-2 border-red-200')}>
            <div className="flex items-center gap-2">{a.active ? <Badge color="red" dot>Active</Badge> : <Badge color="green"><CheckCircle2 size={11} /> Resolved</Badge>}<span className="text-[11px] text-ink-400 ml-auto">{timeAgo(a.createdAt)}</span></div>
            <div className="font-bold mt-2">{a.title}</div>
            <p className="text-sm text-ink-700 mt-1">{a.message}</p>
            <div className="text-[11px] text-ink-400 mt-2">By {userById(a.by)?.name}</div>
            {admin && a.active && <Button size="sm" variant="secondary" className="mt-3" icon={CheckCircle2} onClick={() => act(() => resolveAlert(user, a.id), 'Marked as resolved')}>Mark resolved</Button>}
          </Card>
        ))}
        {!alerts.length && <Card className="p-5 text-center text-sm text-ink-500"><CheckCircle2 className="mx-auto text-accent-500 mb-2" />No emergency alerts. Stay safe!</Card>}
      </div>
      {!admin && <p className="text-xs text-ink-400 mt-3 flex items-center gap-1.5"><MessageSquareWarning size={13} /> Only authorised administrators can broadcast society-wide alerts.</p>}

      <Sheet open={open} onClose={() => setOpen(false)} title="Broadcast emergency alert">
        <div className="text-sm text-red-700 bg-red-50 rounded-xl p-3 mb-4 flex gap-2"><AlertTriangle size={18} className="shrink-0" /> This will instantly notify every resident, overriding their notification preferences.</div>
        <Field label="Alert title"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Fire alarm in Tower B" /></Field>
        <Field label="Instructions"><Textarea rows={3} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="Evacuate using staircases. Assemble at the central lawn." /></Field>
        <Field label="Severity"><Tabs value={f.severity} onChange={(v) => setF({ ...f, severity: v })} tabs={[{ value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' }, { value: 'advisory', label: 'Advisory' }]} /></Field>
        <Button variant="dangerSolid" block size="lg" icon={Siren} onClick={() => { if (act(() => sendEmergencyAlert(user, f), 'Alert sent to all residents')) { setOpen(false); setF({ title: '', message: '', severity: 'high' }) } }}>Send to everyone</Button>
      </Sheet>
    </Page>
  )
}
