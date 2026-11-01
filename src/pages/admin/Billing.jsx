import { useState } from 'react'
import { Download, Plus, Trash2, Zap, Clock, IndianRupee, Search, Receipt, MinusCircle } from 'lucide-react'
import { Page, Card, Tabs, Chips, Button, Field, Input, Select, Textarea, Sheet, Empty, useAction, useConfirm } from '../../components/ui'
import { BillBadge } from '../Payments'
import { useAuth } from '../../lib/auth'
import { useData, db } from '../../lib/db'
import { can } from '../../lib/rbac'
import { verifyPayment, billLabel, billTotal, billStatus, billingConfig, saveBillingConfig, generateBills, applyLateFees, addAdjustment, waiveLateFee, payBills, aptNo, residentsOfApt } from '../../lib/actions'
import { inr, ymOf, addMonths, monthLabel, fmtDate, downloadCSV, uid, cls } from '../../lib/utils'

export default function Billing() {
  const { user } = useAuth()
  const manage = can(user, 'billing.manage')
  const [tab, setTab] = useState('collection')
  if (!can(user, 'payments.view_all') && !manage) return <Page title="Billing" back="/admin"><Empty title="Not allowed" /></Page>
  return (
    <Page title={manage ? 'Maintenance billing' : 'Payment tracking'} back="/admin">
      {manage && <Tabs className="mt-1" value={tab} onChange={setTab} tabs={[{ value: 'collection', label: 'Collection' }, { value: 'settings', label: 'Charges' }, { value: 'apt', label: 'Flat-specific' }]} />}
      {tab === 'collection' && <Collection manage={manage} />}
      {tab === 'settings' && <Settings />}
      {tab === 'apt' && <AptCharges />}
    </Page>
  )
}

function Collection({ manage }) {
  const { user } = useAuth()
  const act = useAction()
  const ask = useConfirm()
  const [ym, setYm] = useState(ymOf())
  const [f, setF] = useState('all')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const months = Array.from({ length: 7 }, (_, i) => addMonths(ymOf(), 1 - i))
  const bills = useData((d) => d.list('bills', (b) => b.month === ym).map((b) => ({ ...b, apt: aptNo(b.apartmentId) })).sort((a, b) => a.apt.localeCompare(b.apt)))
  const shown = bills.filter((b) => (f === 'all' || billStatus(b) === f || (f === 'unpaid' && b.status !== 'paid')) && (!q || b.apt.toLowerCase().includes(q.toLowerCase())))
  const paid = bills.filter((b) => b.status === 'paid')
  const total = bills.reduce((a, b) => a + billTotal(b), 0)
  const coll = paid.reduce((a, b) => a + billTotal(b), 0)
  const exportCsv = () => downloadCSV(`maintenance-${ym}.csv`, [['Flat', 'Resident', 'Month', 'Base', 'Late fee', 'Adjustments', 'Total', 'Status', 'Due date', 'Paid on'], ...bills.map((b) => [b.apt, residentsOfApt(b.apartmentId)[0]?.name || '', monthLabel(b.month), b.amount, b.lateFee || 0, (b.adjustments || []).reduce((a, x) => a + x.amount, 0), billTotal(b), billStatus(b), fmtDate(b.dueDate), b.paidAt ? fmtDate(b.paidAt) : ''])])
  const gen = async () => {
    if (!(await ask({ title: `Generate bills for ${monthLabel(ym)}?`, text: 'Bills are created for every occupied flat using current charges. Existing bills are not touched.', ok: 'Generate' }))) return
    act(() => generateBills(user, ym), (n) => n ? `${n} bills generated – residents notified` : 'All bills already exist for this month')
  }
  const b = sel && db.get('bills', sel)
  return (
    <>
      <VerifyPayments manage={manage} />
      <div className="flex gap-2 mt-3">
        <Select value={ym} onChange={(e) => setYm(e.target.value)} className="flex-1">{months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</Select>
        <Button variant="outline" icon={Download} onClick={exportCsv}>CSV</Button>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Card className="p-3"><div className="text-[11px] text-ink-500">Billed</div><div className="font-extrabold">{inr(total)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-ink-500">Collected</div><div className="font-extrabold text-accent-700">{inr(coll)}</div></Card>
        <Card className="p-3"><div className="text-[11px] text-ink-500">Pending</div><div className="font-extrabold text-red-600">{inr(total - coll)}</div></Card>
      </div>
      {manage && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <Button variant="primary" icon={Zap} onClick={gen}>Generate bills</Button>
          <Button variant="secondary" icon={Clock} onClick={async () => { if (await ask({ title: 'Apply late fees?', text: 'Adds the configured late fee to all overdue bills that do not have one yet.', ok: 'Apply' })) act(() => applyLateFees(user), (n) => `Late fee applied to ${n} bill(s)`) }}>Apply late fees</Button>
        </div>
      )}
      <div className="relative mt-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><Input className="pl-9" placeholder="Search flat (e.g. B-2)" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <Chips className="mt-3" value={f} onChange={setF} options={[{ value: 'all', label: 'All', count: bills.length }, { value: 'paid', label: 'Paid', count: paid.length }, { value: 'unpaid', label: 'Unpaid', count: bills.length - paid.length }, { value: 'overdue', label: 'Overdue', count: bills.filter((x) => billStatus(x) === 'overdue').length }]} />
      <Card className="mt-3 divide-y divide-ink-100 overflow-hidden">
        {shown.map((b) => (
          <button key={b.id} onClick={() => setSel(b.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-ink-100">
            <div className="h-10 w-12 rounded-xl bg-brand-50 text-brand-800 text-[12px] font-extrabold grid place-items-center">{b.apt}</div>
            <div className="flex-1 min-w-0"><div className="text-sm font-semibold truncate">{residentsOfApt(b.apartmentId)[0]?.name || '—'}</div><div className="text-[11px] text-ink-500">{b.paidAt ? `Paid ${fmtDate(b.paidAt)}` : `Due ${fmtDate(b.dueDate)}`}{b.lateFee ? ` · late fee ${inr(b.lateFee)}` : ''}</div></div>
            <div className="text-right"><div className="font-bold text-sm">{inr(billTotal(b))}</div><BillBadge b={b} /></div>
          </button>
        ))}
      </Card>
      {!bills.length && <Empty icon={Receipt} title="No bills for this month" text={manage ? 'Generate bills to start collection.' : ''} />}

      <Sheet open={!!b} onClose={() => setSel(null)} title={b ? `${aptNo(b.apartmentId)} · ${billLabel(b)}` : ''}>
        {b && <BillAdmin b={b} manage={manage} close={() => setSel(null)} />}
      </Sheet>
    </>
  )
}

function BillAdmin({ b, manage, close }) {
  const { user } = useAuth()
  const act = useAction()
  const [adj, setAdj] = useState({ label: '', amount: '', type: 'credit' })
  const [mode, setMode] = useState('Cash')
  return (
    <>
      <div className="text-sm space-y-1">
        {b.items.map((i, k) => <div key={k} className="flex justify-between"><span className="text-ink-700">{i.label}</span><span className="font-semibold">{inr(i.amount)}</span></div>)}
        {b.lateFee > 0 && <div className="flex justify-between text-red-600"><span>Late fee</span><span className="font-semibold">{inr(b.lateFee)}</span></div>}
        {(b.adjustments || []).map((a, k) => <div key={k} className="flex justify-between text-accent-700"><span>{a.label}</span><span className="font-semibold">{inr(a.amount)}</span></div>)}
        <div className="flex justify-between font-extrabold border-t border-ink-200 pt-2 mt-2"><span>Total</span><span>{inr(billTotal(b))}</span></div>
        <div className="pt-1"><BillBadge b={b} /></div>
      </div>
      {manage && b.status !== 'paid' && (
        <>
          <div className="text-sm font-bold mt-5 mb-2">Record offline payment</div>
          <div className="flex gap-2">
            <Select value={mode} onChange={(e) => setMode(e.target.value)} className="flex-1"><option>Cash</option><option>Cheque</option><option>Bank transfer (NEFT)</option></Select>
            <Button variant="success" onClick={() => { if (act(() => payBills(null, [b.id], mode, { offline: true, actor: user }), 'Payment recorded – receipt sent')) close() }}>Mark paid</Button>
          </div>
          <div className="text-sm font-bold mt-5 mb-2">Adjustment</div>
          <div className="grid grid-cols-[1fr_100px] gap-2">
            <Input placeholder="Reason (e.g. Waiver approved in AGM)" value={adj.label} onChange={(e) => setAdj({ ...adj, label: e.target.value })} />
            <Input type="number" placeholder="₹" value={adj.amount} onChange={(e) => setAdj({ ...adj, amount: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="secondary" icon={MinusCircle} onClick={() => { if (act(() => addAdjustment(user, b.id, adj.label, -Math.abs(Number(adj.amount))), 'Credit applied')) setAdj({ label: '', amount: '' }) }}>Credit / waiver</Button>
            <Button size="sm" variant="outline" icon={Plus} onClick={() => { if (act(() => addAdjustment(user, b.id, adj.label, Math.abs(Number(adj.amount))), 'Charge added')) setAdj({ label: '', amount: '' }) }}>Extra charge</Button>
            {b.lateFee > 0 && <Button size="sm" variant="danger" onClick={() => act(() => waiveLateFee(user, b.id), 'Late fee waived')}>Waive late fee</Button>}
          </div>
        </>
      )}
    </>
  )
}

function Settings() {
  const { user } = useAuth()
  const act = useAction()
  const [c, setC] = useState(() => JSON.parse(JSON.stringify(billingConfig())))
  const sample = 1050 * Number(c.ratePerSqft || 0) + c.items.reduce((a, i) => a + Number(i.amount || 0), 0)
  return (
    <div className="mt-4">
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Rate per sq.ft (₹)"><Input type="number" step="0.1" value={c.ratePerSqft} onChange={(e) => setC({ ...c, ratePerSqft: Number(e.target.value) })} /></Field>
          <Field label="Due day of month"><Input type="number" min={1} max={28} value={c.dueDay} onChange={(e) => setC({ ...c, dueDay: Number(e.target.value) })} /></Field>
          <Field label="Late fee type"><Select value={c.lateFeeType} onChange={(e) => setC({ ...c, lateFeeType: e.target.value })}><option value="flat">Flat amount</option><option value="percent">% of bill</option></Select></Field>
          <Field label={c.lateFeeType === 'flat' ? 'Late fee (₹)' : 'Late fee (%)'}><Input type="number" value={c.lateFee} onChange={(e) => setC({ ...c, lateFee: Number(e.target.value) })} /></Field>
        </div>
        <div className="text-sm font-bold mb-2">Fixed monthly charges (all flats)</div>
        {c.items.map((it, i) => (
          <div key={it.id} className="grid grid-cols-[1fr_96px_40px] gap-2 mb-2">
            <Input value={it.label} onChange={(e) => setC({ ...c, items: c.items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
            <Input type="number" value={it.amount} onChange={(e) => setC({ ...c, items: c.items.map((x, j) => (j === i ? { ...x, amount: Number(e.target.value) } : x)) })} />
            <button aria-label="Remove" onClick={() => setC({ ...c, items: c.items.filter((_, j) => j !== i) })} className="h-12 grid place-items-center text-ink-400"><Trash2 size={17} /></button>
          </div>
        ))}
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => setC({ ...c, items: [...c.items, { id: uid('i'), label: 'New charge', amount: 0 }] })}>Add charge</Button>
        <div className="text-xs text-ink-500 mt-3 bg-ink-100 rounded-xl p-3 flex items-center gap-2"><IndianRupee size={14} /> A 1,050 sq.ft flat would pay <b className="text-ink-900">{inr(sample)}</b>/month</div>
      </Card>
      <Card className="p-4 mt-4">
        <div className="text-sm font-bold mb-1">How residents pay the society</div>
        <p className="text-xs text-ink-500 mb-3">Shown on the resident’s Pay screen. Residents pay directly, enter the reference, and you verify it here.</p>
        <Field label="Society UPI ID" hint="e.g. shantinagarchs@hdfcbank – opens GPay/PhonePe with the amount filled in"><Input value={c.upiId || ''} onChange={(e) => setC({ ...c, upiId: e.target.value.trim() })} placeholder="society@bank" autoCapitalize="none" /></Field>
        <Field label="Payee name (as per bank)"><Input value={c.payeeName || ''} onChange={(e) => setC({ ...c, payeeName: e.target.value })} /></Field>
        <Field label="Bank details for NEFT (optional)"><Textarea rows={3} value={c.bankDetails || ''} onChange={(e) => setC({ ...c, bankDetails: e.target.value })} placeholder={'A/c name: …\nA/c no: …\nIFSC: …'} /></Field>
      </Card>
      <Button block size="lg" className="mt-4" onClick={() => act(() => saveBillingConfig(user, c), 'Billing settings saved – applies to new bills')}>Save settings</Button>
    </div>
  )
}

function AptCharges() {
  const { user } = useAuth()
  const act = useAction()
  const charges = useData((d) => d.list('aptCharges'))
  const apts = useData((d) => d.list('apartments'))
  const [f, setF] = useState({ apartmentId: '', label: '', amount: '' })
  const add = () => act(() => {
    if (!can(user, 'billing.manage')) throw new Error('Not allowed')
    if (!f.apartmentId || !f.label || !(Number(f.amount) > 0)) throw new Error('Select a flat and enter a label and positive amount.')
    db.insert('aptCharges', { id: uid('ac_'), apartmentId: f.apartmentId, label: f.label, amount: Number(f.amount) })
    setF({ apartmentId: '', label: '', amount: '' })
  }, 'Charge added – applies from the next bill')
  return (
    <div className="mt-4">
      <p className="text-sm text-ink-500 mb-3">Recurring charges for specific flats – extra parking, terrace use, etc. Added to each new monthly bill.</p>
      <Card className="divide-y divide-ink-100 overflow-hidden">
        {charges.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-[12px] font-extrabold bg-brand-50 text-brand-800 rounded-lg px-2 py-1">{aptNo(c.apartmentId)}</span>
            <span className="flex-1 text-sm font-semibold">{c.label}</span>
            <span className="font-bold text-sm">{inr(c.amount)}</span>
            <button aria-label="Delete" onClick={() => act(() => db.remove('aptCharges', c.id), 'Removed')} className="text-ink-400"><Trash2 size={16} /></button>
          </div>
        ))}
        {!charges.length && <p className="p-4 text-sm text-ink-400">No flat-specific charges.</p>}
      </Card>
      <Card className="p-4 mt-4">
        <div className="text-sm font-bold mb-3">Add charge</div>
        <Field label="Flat"><Select value={f.apartmentId} onChange={(e) => setF({ ...f, apartmentId: e.target.value })}><option value="">Select flat</option>{apts.map((a) => <option key={a.id} value={a.id}>{a.number}</option>)}</Select></Field>
        <div className={cls('grid grid-cols-[1fr_110px] gap-2')}>
          <Field label="Description"><Input value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} placeholder="Additional parking slot" /></Field>
          <Field label="₹ / month"><Input type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        </div>
        <Button block icon={Plus} onClick={add}>Add charge</Button>
      </Card>
    </div>
  )
}

function VerifyPayments({ manage }) {
  const { user } = useAuth()
  const act = useAction()
  const [rej, setRej] = useState(null)
  const [reason, setReason] = useState('')
  const pending = useData((d) => d.list('payments', (p) => p.status === 'pending').sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
  if (!pending.length) return null
  return (
    <div className="mt-3">
      <div className="text-sm font-bold mb-2">{`Payments to verify (${pending.length})`}</div>
      <div className="space-y-2">
        {pending.map((p) => (
          <Card key={p.id} className="p-4 border-2 border-sky-100">
            <div className="flex items-center gap-3">
              <div className="h-10 w-12 rounded-xl bg-brand-50 text-brand-800 text-[12px] font-extrabold grid place-items-center">{aptNo(p.apartmentId)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-bold">{inr(p.amount)} <span className="text-xs font-semibold text-ink-500">· {p.method}</span></div>
                <div className="text-xs text-ink-500 truncate">Ref <b className="text-ink-900 select-all">{p.ref}</b> · {fmtDate(p.createdAt)} · {db.get('users', p.userId)?.name || ''}</div>
              </div>
            </div>
            <p className="text-[11px] text-ink-500 mt-2">Check this reference in the society’s bank statement / UPI app before approving.</p>
            {manage && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="danger" block onClick={() => { setReason(''); setRej(p.id) }}>Not received</Button>
                <Button size="sm" variant="success" block onClick={() => act(() => verifyPayment(user, p.id, true), 'Payment verified – receipt sent')}>Money received</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
      <Sheet open={!!rej} onClose={() => setRej(null)} title="Payment not received">
        <Field label="Message to the resident"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reference not found in bank statement" /></Field>
        <Button variant="dangerSolid" block onClick={() => { act(() => verifyPayment(user, rej, false, reason), 'Resident informed'); setRej(null) }}>Mark as not received</Button>
      </Sheet>
    </div>
  )
}
