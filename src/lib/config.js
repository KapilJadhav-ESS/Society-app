// Deployment settings, read at build time from environment variables
// (GitHub → Settings → Secrets and variables → Actions → Variables, or a local .env file).
// Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY the app runs in DEMO mode:
// sample society, data kept only on this device.
const env = import.meta.env
export const SUPABASE_URL = (env.VITE_SUPABASE_URL || '').trim()
export const SUPABASE_ANON_KEY = (env.VITE_SUPABASE_ANON_KEY || '').trim()
export const DEFAULT_SOCIETY = (env.VITE_SOCIETY_CODE || '').trim()
export const BRAND_NAME = (env.VITE_SOCIETY_NAME || '').trim()
export const CLOUD = !!(SUPABASE_URL && SUPABASE_ANON_KEY)
export const DEMO = !CLOUD
