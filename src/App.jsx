import { Suspense, lazy, useEffect, useState } from 'react'
import { getLang, onLangChange } from './i18n'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { can } from './lib/rbac'
import { OverlayProvider } from './components/ui'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Home from './pages/Home'

const Directory = lazy(() => import('./pages/Directory'))
const Services = lazy(() => import('./pages/Services'))
const Profile = lazy(() => import('./pages/Profile'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Announcements = lazy(() => import('./pages/Announcements'))
const Feed = lazy(() => import('./pages/Feed'))
const Complaints = lazy(() => import('./pages/Complaints'))
const Payments = lazy(() => import('./pages/Payments'))
const Visitors = lazy(() => import('./pages/Visitors'))
const Guard = lazy(() => import('./pages/Guard'))
const Facilities = lazy(() => import('./pages/Facilities'))
const Marketplace = lazy(() => import('./pages/Marketplace'))
const Events = lazy(() => import('./pages/Events'))
const Polls = lazy(() => import('./pages/Polls'))
const Emergency = lazy(() => import('./pages/Emergency'))
const Admin = lazy(() => import('./pages/admin/Admin'))

const Loading = () => <div className="h-[60vh] grid place-items-center"><span className="h-8 w-8 rounded-full border-[3px] border-brand-600 border-r-transparent animate-spin" /></div>

function Shell() {
  const { user } = useAuth()
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  if (!user) return <Login />
  const guard = user.role === 'security'
  const hideNav = /\/new|\/receipt\//.test(loc.pathname)
  return (
    <>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={guard ? <Navigate to="/guard" replace /> : <Home />} />
          <Route path="/directory" element={<Directory />} />
          <Route path="/services" element={<Services />} />
          <Route path="/profile/*" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/announcements/*" element={<Announcements />} />
          <Route path="/feed/*" element={<Feed />} />
          <Route path="/complaints/*" element={<Complaints />} />
          <Route path="/payments/*" element={<Payments />} />
          <Route path="/visitors/*" element={<Visitors />} />
          <Route path="/guard/*" element={can(user, 'visitors.gate') ? <Guard /> : <Navigate to="/" />} />
          <Route path="/facilities/*" element={<Facilities />} />
          <Route path="/marketplace/*" element={<Marketplace />} />
          <Route path="/events/*" element={<Events />} />
          <Route path="/polls/*" element={<Polls />} />
          <Route path="/emergency" element={<Emergency />} />
          <Route path="/admin/*" element={can(user, 'admin.view') ? <Admin /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
      {!hideNav && <BottomNav guard={guard} />}
    </>
  )
}

export default function App() {
  const [lang, setLangState] = useState(getLang())
  useEffect(() => onLangChange(setLangState), [])
  return (
    <OverlayProvider key={lang}>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </OverlayProvider>
  )
}
