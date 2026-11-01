import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Megaphone, Wallet, MessageSquareWarning, UserCheck, CalendarDays, Heart, Store, Siren, Dumbbell, Settings } from 'lucide-react'
import { Page, Card, Chips, Empty, Button } from '../components/ui'
import { useAuth } from '../lib/auth'
import { useData } from '../lib/db'
import { markAllRead, markNotificationRead } from '../lib/actions'
import { timeAgo, cls } from '../lib/utils'

const T = {
  announcements: [Megaphone, 'bg-brand-50 text-brand-700'], payments: [Wallet, 'bg-accent-50 text-accent-700'], complaints: [MessageSquareWarning, 'bg-red-50 text-red-600'],
  visitors: [UserCheck, 'bg-violet-50 text-violet-700'], events: [CalendarDays, 'bg-pink-50 text-pink-600'], polls: [CalendarDays, 'bg-amber-50 text-amber-700'], social: [Heart, 'bg-rose-50 text-rose-500'],
  marketplace: [Store, 'bg-teal-50 text-teal-700'], alert: [Siren, 'bg-red-500 text-white'], bookings: [Dumbbell, 'bg-sky-50 text-sky-700'], system: [Settings, 'bg-ink-100 text-ink-700']
}

export default function Notifications() {
  const { user } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState('all')
  const list = useData((d) => d.list('notifications', (n) => n.userId === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
  const shown = list.filter((n) => f === 'all' || (f === 'unread' ? !n.read : n.type === f))
  const unread = list.filter((n) => !n.read).length
  const open = (n) => { markNotificationRead(n.id); if (n.link) nav(n.link) }
  return (
    <Page title="Notifications" subtitle={unread ? `${unread} unread` : 'All caught up'} back actions={unread > 0 && <Button size="sm" variant="ghost" icon={CheckCheck} onClick={() => markAllRead(user.id)}>Read all</Button>}>
      <Chips className="my-3" value={f} onChange={setF} options={[{ value: 'all', label: 'All' }, { value: 'unread', label: 'Unread', count: unread }, { value: 'visitors', label: 'Visitors' }, { value: 'payments', label: 'Payments' }, { value: 'complaints', label: 'Complaints' }, { value: 'announcements', label: 'Notices' }, { value: 'social', label: 'Social' }]} />
      <Card className="overflow-hidden divide-y divide-ink-100">
        {shown.map((n) => {
          const [Icon, c] = T[n.type] || T.system
          return (
            <button key={n.id} onClick={() => open(n)} className={cls('w-full flex gap-3 px-4 py-3.5 text-left active:bg-ink-100', !n.read && 'bg-brand-50/40')}>
              <span className={cls('h-10 w-10 rounded-xl grid place-items-center shrink-0', c)}><Icon size={18} /></span>
              <div className="flex-1 min-w-0">
                <div className={cls('text-[14px] leading-snug', n.read ? 'font-medium text-ink-700' : 'font-bold text-ink-900')}>{n.title}</div>
                {n.body && <div className="text-xs text-ink-500 mt-0.5 line-clamp-2">{n.body}</div>}
                <div className="text-[11px] text-ink-400 mt-1">{timeAgo(n.createdAt)}</div>
              </div>
              {!n.read && <span className="h-2.5 w-2.5 rounded-full bg-brand-500 mt-1.5 shrink-0" />}
            </button>
          )
        })}
      </Card>
      {!shown.length && <Empty icon={Bell} title="No notifications" text="You’ll see updates about visitors, payments and your community here." />}
      <Button variant="ghost" size="sm" className="mt-4" icon={Settings} onClick={() => nav('/profile')}>Notification preferences</Button>
    </Page>
  )
}
