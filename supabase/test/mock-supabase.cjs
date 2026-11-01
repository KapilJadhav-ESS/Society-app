// Local stand-in for Supabase, for automated tests ONLY.
// Implements the small part of the Supabase HTTP API the app uses:
//   • Auth: OTP send/verify (any phone/email; the code is always 123456), session refresh, user
//   • RPC:  POST /rest/v1/rpc/<fn> → runs the real SQL function in PostgreSQL as the logged-in
//           user (role "authenticated" + JWT claims), so the real security rules apply
//   • Storage: upload + public download for the "media" bucket (kept in memory)
// Realtime is not emulated – the app falls back to periodic sync.
// Usage: PGDATABASE=society_test node supabase/test/mock-supabase.cjs  (port 54321)
const http = require('http')
const crypto = require('crypto')
const { Pool } = require('pg')
const pool = new Pool()
const SECRET = 'test-secret'
const files = new Map()

const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')
const sign = (payload) => {
  const h = b64({ alg: 'HS256', typ: 'JWT' }), p = b64(payload)
  return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`
}
const claims = (req) => {
  const t = (req.headers.authorization || '').replace(/^Bearer /, '')
  const [h, p, s] = t.split('.')
  if (!s || crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url') !== s) return null
  const c = JSON.parse(Buffer.from(p, 'base64url'))
  return c.exp * 1000 > Date.now() ? c : null
}
const userObj = (u) => ({ id: u.id, aud: 'authenticated', role: 'authenticated', phone: u.phone || '', email: u.email || '', app_metadata: {}, user_metadata: {}, created_at: u.created_at })
const session = (u) => {
  const exp = Math.floor(Date.now() / 1000) + 3600
  return { access_token: sign({ sub: u.id, role: 'authenticated', aud: 'authenticated', exp, phone: u.phone, email: u.email }), token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r_' + u.id, user: userObj(u) }
}
const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'content-type': type, 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' })
  res.end(body == null ? '' : type === 'application/json' ? JSON.stringify(body) : body)
}
const readBody = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))) })
const findOrCreate = async (b) => {
  const phone = b.phone ? b.phone.replace(/\D/g, '') : null
  const email = b.email ? b.email.toLowerCase() : null
  const q = phone ? ['select * from auth.users where phone=$1', [phone]] : ['select * from auth.users where email=$1', [email]]
  let u = (await pool.query(...q)).rows[0]
  if (!u) u = (await pool.query('insert into auth.users(phone,email) values($1,$2) returning *', [phone, email])).rows[0]
  return u
}
const PG_HTTP = { '42501': 403, '28000': 401, P0002: 404, '23505': 409 }

http.createServer(async (req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, null)
    const url = new URL(req.url, 'http://x')
    const body = await readBody(req)
    const json = () => (body.length ? JSON.parse(body) : {})
    // ---- auth
    if (url.pathname === '/auth/v1/otp') { const b = json(); if (!b.phone && !b.email) return send(res, 400, { msg: 'phone or email required' }); return send(res, 200, {}) }
    if (url.pathname === '/auth/v1/verify') {
      const b = json()
      if (b.token !== '123456') return send(res, 403, { code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' })
      return send(res, 200, session(await findOrCreate(b)))
    }
    if (url.pathname === '/auth/v1/token') {
      const b = json(); const id = (b.refresh_token || '').slice(2)
      const u = (await pool.query('select * from auth.users where id=$1', [id])).rows[0]
      return u ? send(res, 200, session(u)) : send(res, 400, { msg: 'invalid refresh token' })
    }
    if (url.pathname === '/auth/v1/user') {
      const c = claims(req); if (!c) return send(res, 401, { msg: 'invalid JWT' })
      return send(res, 200, userObj((await pool.query('select * from auth.users where id=$1', [c.sub])).rows[0]))
    }
    if (url.pathname === '/auth/v1/logout') return send(res, 204, null)
    // ---- rpc
    const m = url.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/)
    if (m) {
      const c = claims(req)
      const args = json()
      const keys = Object.keys(args)
      const sql = `select public.${m[1]}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`
      const vals = keys.map((k) => (args[k] !== null && typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k]))
      const cli = await pool.connect()
      try {
        await cli.query('begin')
        await cli.query(`set local role ${c ? 'authenticated' : 'anon'}`)
        await cli.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(c || { role: 'anon' })])
        const r = await cli.query(sql, vals)
        await cli.query('commit')
        return send(res, 200, r.rows[0].r ?? null)
      } catch (e) {
        await cli.query('rollback').catch(() => {})
        return send(res, PG_HTTP[e.code] || 400, { code: e.code, message: e.message, details: null, hint: null })
      } finally { cli.release() }
    }
    // ---- storage
    const up = url.pathname.match(/^\/storage\/v1\/object\/media\/(.+)$/)
    if (up && req.method === 'POST') {
      if (!claims(req)) return send(res, 401, { message: 'unauthorized' })
      files.set(up[1], { type: req.headers['content-type'], body })
      return send(res, 200, { Key: 'media/' + up[1], Id: up[1] })
    }
    const pub = url.pathname.match(/^\/storage\/v1\/object\/public\/media\/(.+)$/)
    if (pub) { const f = files.get(pub[1]); return f ? send(res, 200, f.body, f.type) : send(res, 404, { message: 'not found' }) }
    send(res, 404, { message: 'not found: ' + url.pathname })
  } catch (e) { console.error(e); send(res, 500, { message: e.message }) }
}).listen(54321, () => console.log('mock supabase on :54321'))
