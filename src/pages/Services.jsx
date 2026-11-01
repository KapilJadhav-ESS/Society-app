import { useNavigate } from 'react-router-dom'
import { Wallet, MessageSquareWarning, Wrench, UserCheck, Dumbbell, Store, CalendarDays, Vote, Megaphone, Siren, LayoutDashboard, BookUser, ChevronRight, ShieldCheck } from 'lucide-react'
import { Page, Card } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/db'
import { can } from '../lib/rbac'
import { billTotal } from '../lib/actions'
import { inr } from '../lib/utils'
import { cls } from '../lib/utils'

export default function Services() {
  const { user } = useAuth()
  const nav = useNavigate()
  const dues = useData((d) => d.list('bills', (b) => b.apartmentId === user.apartmentId && b.status !== 'paid').reduce((a, b) => a + billTotal(b), 0))
  const openTickets = useData((d) => d.list('complaints', (c) => c.userId === user.id && !['resolved', 'closed'].includes(c.status)).length)
  const myBookings = useData((d) => d.list('bookings', (b) => b.userId === user.id && ['pending', 'confirmed'].includes(b.status) && new Date(b.start) > new Date()).length)
  const openPolls = useData((d) => d.list('polls', (p) => new Date(p.closesAt) > new Date()).length)
  const groups = [
    { title: 'Payments & requests', items: [
      user.apartmentId && { label: 'Maintenance payments', sub: dues ? `${inr(dues)} outstanding` : 'All dues cleared', icon: Wallet, to: '/payments', c: 'bg-accent-50 text-accent-700', hot: dues > 0 },
      { label: 'Complaints', sub: openTickets ? `${openTickets} open ticket(s)` : 'Raise & track complaints', icon: MessageSquareWarning, to: '/complaints', c: 'bg-red-50 text-red-600' },
      { label: 'Service requests', sub: 'Carpenter, painter, pest control…', icon: Wrench, to: '/complaints/new?kind=service', c: 'bg-sky-50 text-sky-700' }
    ] },
    { title: 'Community', items: [
      user.apartmentId && { label: 'Visitors & gate', sub: 'Invite guests, approve entries', icon: UserCheck, to: '/visitors', c: 'bg-violet-50 text-violet-700' },
      { label: 'Facility booking', sub: myBookings ? `${myBookings} upcoming booking(s)` : 'Clubhouse, gym, pool, halls…', icon: Dumbbell, to: '/facilities', c: 'bg-sky-50 text-sky-700' },
      { label: 'Marketplace', sub: 'Buy, sell, rent & services', icon: Store, to: '/marketplace', c: 'bg-teal-50 text-teal-700' },
      { label: 'Events', sub: 'Festivals, sports & meetings', icon: CalendarDays, to: '/events', c: 'bg-pink-50 text-pink-600' },
      { label: 'Polls & surveys', sub: openPolls ? `${openPolls} open poll(s)` : 'Have your say', icon: Vote, to: '/polls', c: 'bg-amber-50 text-amber-700' },
      { label: 'Announcements', sub: 'Official notices', icon: Megaphone, to: '/announcements', c: 'bg-brand-50 text-brand-700' },
      { label: 'Directory', sub: 'Residents & useful contacts', icon: BookUser, to: '/directory', c: 'bg-ink-100 text-ink-700' }
    ] },
    { title: 'Safety', items: [{ label: 'Emergency & help', sub: 'SOS, ambulance, fire, police', icon: Siren, to: '/emergency', c: 'bg-red-500 text-white' }] },
    (can(user, 'admin.view') || can(user, 'visitors.gate')) && { title: 'Management', items: [
      can(user, 'admin.view') && { label: 'Admin dashboard', sub: 'Billing, complaints, residents, reports', icon: LayoutDashboard, to: '/admin', c: 'bg-brand-800 text-white' },
      can(user, 'visitors.gate') && { label: 'Security gate', sub: 'Guard console', icon: ShieldCheck, to: '/guard', c: 'bg-brand-800 text-white' }
    ] }
  ].filter(Boolean)
  return (
    <Page title="Services" subtitle="Everything your society offers">
      {groups.map((g) => (
        <div key={g.title}>
          <div className="text-xs font-bold text-ink-400 uppercase tracking-wider mt-5 mb-2">{g.title}</div>
          <Card className="divide-y divide-ink-100 overflow-hidden">
            {g.items.filter(Boolean).map((i) => (
              <button key={i.label} onClick={() => nav(i.to)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-ink-100">
                <span className={cls('h-11 w-11 rounded-2xl grid place-items-center', i.c)}><i.icon size={21} /></span>
                <div className="flex-1 min-w-0"><div className="font-semibold">{i.label}</div><div className={cls('text-xs truncate', i.hot ? 'text-red-600 font-semibold' : 'text-ink-500')}>{i.sub}</div></div>
                <ChevronRight size={18} className="text-ink-300" />
              </button>
            ))}
          </Card>
        </div>
      ))}
    </Page>
  )
}
