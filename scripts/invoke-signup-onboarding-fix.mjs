import fs from 'fs'
const t = fs.readFileSync('.env', 'utf8')
const g = (k) => (t.match(new RegExp(`^${k}=(.+)$`, 'm')) || [])[1]?.replace(/^["']|["']$/g, '') || ''
const url = g('VITE_SUPABASE_URL').replace(/\/$/, '')
const key = g('SUPABASE_SERVICE_ROLE_KEY')
if (!url || !key) {
  console.error('Missing SUPABASE url or service role key')
  process.exit(1)
}
const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), 90_000)
const res = await fetch(`${url}/functions/v1/apply-signup-onboarding-fix`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    apikey: key,
    'Content-Type': 'application/json',
  },
  body: '{}',
  signal: controller.signal,
})
clearTimeout(timer)
const text = await res.text()
console.log('status', res.status)
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2))
} catch {
  console.log(text.slice(0, 800))
}
if (!res.ok) process.exit(1)
