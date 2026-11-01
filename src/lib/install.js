// Captures Chrome's install prompt so we can show our own "Install app" button.
let deferred = null
const subs = new Set()
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()) })
window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()) })
export const canInstall = () => !!deferred
export const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
export const onInstallChange = (f) => { subs.add(f); return () => subs.delete(f) }
export async function promptInstall() {
  if (!deferred) return false
  deferred.prompt()
  const r = await deferred.userChoice
  deferred = null
  subs.forEach((f) => f())
  return r.outcome === 'accepted'
}
