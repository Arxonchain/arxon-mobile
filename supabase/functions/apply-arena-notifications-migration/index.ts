import postgres from 'https://deno.land/x/postgresjs@v3.4.4/mod.js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('authorization') ?? ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!authHeader.includes(serviceKey)) {
      return new Response(JSON.stringify({ ok: false, error: 'Service role required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const dbUrl = Deno.env.get('SUPABASE_DB_URL') ?? Deno.env.get('DATABASE_URL')
    if (!dbUrl) {
      return new Response(JSON.stringify({ ok: false, error: 'No database URL configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const migrationSql = await Deno.readTextFile(
      new URL('../../migrations/20260816201500_arena_notifications.sql', import.meta.url),
    )

    const sql = postgres(dbUrl, { prepare: false })
    await sql.unsafe(migrationSql)
    await sql.end()

    return new Response(JSON.stringify({ ok: true, message: 'Arena notifications migration applied' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
