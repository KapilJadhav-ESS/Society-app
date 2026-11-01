// Local-first data store.
// The whole society database lives in memory and is persisted to IndexedDB,
// so the app works fully offline. Changes are broadcast to other open tabs
// (e.g. a guard tab and a resident tab) for a "realtime" feel.
//
// The public API (list/get/insert/update/remove) is intentionally the same
// shape as a REST/Supabase table API so a remote backend can be swapped in
// later — see supabase/schema.sql and src/lib/README.md.
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import { useSyncExternalStore } from 'react'
import { buildSeed } from './seed'

const KEY = 'smart-society-db-v1'
const COLLECTIONS = [
  'societies', 'towers', 'apartments', 'users', 'staff', 'contacts', 'announcements', 'posts',
  'bills', 'payments', 'aptCharges', 'complaints', 'visitors', 'facilities', 'bookings',
  'listings', 'events', 'polls', 'notifications', 'alerts', 'registrations', 'settings'
]

let state = null
let version = 0
let currentSociety = null
const listeners = new Set()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('smart-society') : null

const emit = () => { version++; listeners.forEach((l) => l()) }

// Coalesce all writes made in the same tick into one IndexedDB write, and
// flush again when the app is hidden/closed so nothing is lost.
let pending = false
let writing = Promise.resolve()
const flush = () => {
  writing = writing.then(async () => {
    try {
      await idbSet(KEY, state)
      channel?.postMessage({ type: 'changed' })
    } catch (e) {
      console.error('Persist failed', e)
    }
  })
  return writing
}
const persist = () => {
  if (pending) return
  pending = true
  queueMicrotask(() => { pending = false; flush() })
}
if (typeof window !== 'undefined') {
  const onHide = () => { if (state) flush() }
  window.addEventListener('pagehide', onHide)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && onHide())
}

channel && (channel.onmessage = async (e) => {
  if (e.data?.type === 'changed') {
    const fresh = await idbGet(KEY)
    if (fresh) { state = fresh; emit() }
  }
})

export async function initDB() {
  let s = null
  try { s = await idbGet(KEY) } catch { /* private mode */ }
  if (!s) {
    s = buildSeed()
    try { await idbSet(KEY, s) } catch { /* ignore */ }
  }
  COLLECTIONS.forEach((c) => { if (!s[c]) s[c] = [] })
  state = s
  currentSociety = s.societies[0]?.id
  emit()
}

export async function resetDB() {
  try { await idbDel(KEY) } catch { /* ignore */ }
  state = buildSeed()
  await idbSet(KEY, state)
  channel?.postMessage({ type: 'changed' })
  emit()
}

const scoped = (rows) => rows.filter((r) => !r.societyId || r.societyId === currentSociety)

export const db = {
  get societyId() { return currentSociety },
  setSociety(id) { currentSociety = id; emit() },
  society() { return state.societies.find((s) => s.id === currentSociety) },
  list(col, filter) {
    const rows = scoped(state[col] || [])
    return filter ? rows.filter(filter) : rows
  },
  get(col, id) { return (state[col] || []).find((r) => r.id === id) },
  find(col, filter) { return scoped(state[col] || []).find(filter) },
  insert(col, row) {
    const rec = { societyId: currentSociety, createdAt: new Date().toISOString(), ...row }
    state = { ...state, [col]: [rec, ...state[col]] }
    persist(); emit()
    return rec
  },
  update(col, id, patch) {
    let out
    state = {
      ...state,
      [col]: state[col].map((r) => {
        if (r.id !== id) return r
        out = { ...r, ...(typeof patch === 'function' ? patch(r) : patch), updatedAt: new Date().toISOString() }
        return out
      })
    }
    persist(); emit()
    return out
  },
  remove(col, id) {
    state = { ...state, [col]: state[col].filter((r) => r.id !== id) }
    persist(); emit()
  },
  setting(key, fallback) {
    return state.settings.find((s) => s.id === key && s.societyId === currentSociety)?.value ?? fallback
  },
  setSetting(key, value) {
    const exists = state.settings.find((s) => s.id === key && s.societyId === currentSociety)
    if (exists) db.update('settings', key, { value })
    else db.insert('settings', { id: key, value })
  }
}

const subscribe = (l) => { listeners.add(l); return () => listeners.delete(l) }
export const useDBVersion = () => useSyncExternalStore(subscribe, () => version)

// Re-render whenever the DB changes; the selector is cheap (in-memory arrays).
export function useData(selector) {
  useDBVersion()
  return state ? selector(db) : undefined
}
