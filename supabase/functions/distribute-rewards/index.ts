import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const prodUrl = Deno.env.get('PROD_SUPABASE_URL')!
    const prodKey = Deno.env.get('PROD_SUPABASE_SERVICE_ROLE_KEY')!
    const db = createClient(prodUrl, prodKey)

    const body = await req.json().catch(() => ({}))
    const { action, dry_run = true } = body

    console.log(`Action=${action}, dry_run=${dry_run}`)

    // ═══════════════════════════════════════════
    // ACTION: rumble_rewards
    // Credit 10K ARX-P to Discord rumble winners
    // ═══════════════════════════════════════════
    if (action === 'rumble_rewards') {
      // Accept emails from request body, or use default list
      const requestEmails = body.emails as string[] | undefined;
      const emails = requestEmails || [
        'metaken101@gmail.com',
        'probandocrytobullis@gmail.com',
        'mrvision@mail.ru',
        'midulkhan985@gmail.com',
        'riskiafani04@gmail.com',
        'umar.bisniscore@gmail.com',
        'sesawljem@gmail.com',
        'gabemetax@gmail.com',
      ]

      const amount = 10000
      const results: any[] = []

      // Look up all users
      // Paginate through ALL auth users
      let allUsers: any[] = []
      let page = 1
      let hasMoreUsers = true
      while (hasMoreUsers) {
        const { data: { users: batch }, error: authErr } = await db.auth.admin.listUsers({ page, perPage: 1000 })
        if (authErr) throw authErr
        allUsers.push(...(batch || []))
        hasMoreUsers = (batch?.length || 0) === 1000
        page++
      }
      console.log(`Total auth users found: ${allUsers.length}`)

      for (const email of emails) {
        const authUser = allUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (!authUser) {
          results.push({ email, status: 'not_found' })
          continue
        }

        const uid = authUser.id

        if (!dry_run) {
          // Credit points to social_points
          const { data: current } = await db
            .from('user_points')
            .select('social_points, total_points')
            .eq('user_id', uid)
            .maybeSingle()

          if (current) {
            const { error: updateErr } = await db.from('user_points').update({
              social_points: Number(current.social_points) + amount,
              total_points: Number(current.total_points) + amount,
              updated_at: new Date().toISOString(),
            }).eq('user_id', uid)

            if (updateErr) {
              console.error(`Failed to credit ${email}:`, updateErr.message)
              results.push({ email, user_id: uid, status: 'credit_failed', error: updateErr.message })
              continue
            }
          } else {
            // Create user_points record
            const { error: insertErr } = await db.from('user_points').insert({
              user_id: uid,
              social_points: amount,
              total_points: amount,
            })
            if (insertErr) {
              console.error(`Failed to create points for ${email}:`, insertErr.message)
            }
          }

          // Insert notification
          try {
            const { error: notifErr } = await db.from('user_notifications').insert({
              user_id: uid,
              title: '🏆 Discord Rumble Winner!',
              message: `Congratulations! You earned 10,000 ARX-P for winning the Discord Rumble event!`,
              notification_type: 'rumble_reward',
              amount: amount,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            })
            if (notifErr) console.warn(`Notification skipped for ${email}:`, notifErr.message)
          } catch (e: any) { console.warn(`Notification skipped for ${email}:`, e.message) }
        }

        results.push({ email, user_id: uid, status: dry_run ? 'would_credit' : 'credited', amount })
      }

      return new Response(JSON.stringify({
        success: true, action, dry_run,
        total_credited: results.filter(r => r.status === 'credited').length,
        total_distributed: results.filter(r => r.status === 'credited').length * amount,
        results,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══════════════════════════════════════════════════
    // ACTION: inflation_compensation
    // Credit 50K ARX-P to users who were affected by
    // the points inflation correction (net arena loss > 5K)
    // ═══════════════════════════════════════════════════
    if (action === 'inflation_compensation') {
      const amount = 50000

      // Get all arena votes (paginated)
      const userStakes: Record<string, number> = {}
      let offset = 0
      let hasMore = true
      while (hasMore) {
        const { data, error } = await db
          .from('arena_votes')
          .select('user_id, power_spent')
          .range(offset, offset + 999)
        if (error) throw error
        for (const v of data || []) {
          userStakes[v.user_id] = (userStakes[v.user_id] || 0) + Number(v.power_spent)
        }
        hasMore = (data?.length || 0) === 1000
        offset += 1000
      }

      // Get all arena earnings (paginated)
      const userEarnings: Record<string, number> = {}
      offset = 0
      hasMore = true
      while (hasMore) {
        const { data, error } = await db
          .from('arena_earnings')
          .select('user_id, total_earned')
          .range(offset, offset + 999)
        if (error) throw error
        for (const e of data || []) {
          userEarnings[e.user_id] = (userEarnings[e.user_id] || 0) + Number(e.total_earned)
        }
        hasMore = (data?.length || 0) === 1000
        offset += 1000
      }

      // Find users with net loss > 5K
      const affectedUsers = Object.entries(userStakes)
        .filter(([uid, staked]) => {
          const earned = userEarnings[uid] || 0
          return (staked - earned) > 5000
        })
        .map(([uid, staked]) => ({
          user_id: uid,
          staked,
          earned: userEarnings[uid] || 0,
          net_loss: staked - (userEarnings[uid] || 0),
        }))
        .sort((a, b) => b.net_loss - a.net_loss)

      const results: any[] = []

      for (const affected of affectedUsers) {
        const uid = affected.user_id

        // Get username for logging
        const { data: profile } = await db
          .from('profiles')
          .select('username')
          .eq('user_id', uid)
          .maybeSingle()

        if (!dry_run) {
          const { data: current } = await db
            .from('user_points')
            .select('social_points, total_points')
            .eq('user_id', uid)
            .maybeSingle()

          if (current) {
            const { error: updateErr } = await db.from('user_points').update({
              social_points: Number(current.social_points) + amount,
              total_points: Number(current.total_points) + amount,
              updated_at: new Date().toISOString(),
            }).eq('user_id', uid)

            if (updateErr) {
              console.error(`Failed to credit ${uid}:`, updateErr.message)
              results.push({ ...affected, username: profile?.username, status: 'credit_failed' })
              continue
            }
          }

          // Insert notification (table may not exist on production yet)
          try {
            const { error: notifErr } = await db.from('user_notifications').insert({
              user_id: uid,
              title: '🎁 Compensation Reward',
              message: `You received 50,000 ARX-P as a reward for the inconvenience caused by the recent points adjustment. Thank you for your patience and continued support!`,
              notification_type: 'inflation_compensation',
              amount: amount,
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            })
            if (notifErr) console.warn(`Notification skipped for ${uid}:`, notifErr.message)
          } catch (e: any) { console.warn(`Notification skipped for ${uid}:`, e.message) }
        }

        results.push({
          ...affected,
          username: profile?.username || uid,
          status: dry_run ? 'would_credit' : 'credited',
          amount,
        })
      }

      return new Response(JSON.stringify({
        success: true, action, dry_run,
        affected_count: affectedUsers.length,
        total_distributed: dry_run ? 0 : affectedUsers.length * amount,
        results: results.slice(0, 100),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══════════════════════════════════════════
    // ACTION: create_announcement
    // ═══════════════════════════════════════════
    if (action === 'create_announcement') {
      if (!dry_run) {
        const { error } = await db.from('announcements').insert({
          title: '🏆 Reward Distributions Applied!',
          message: `Two reward distributions have been applied:\n\n1️⃣ Discord Rumble Winners — 10,000 ARX-P has been credited to each winner from our recent Discord Rumble event. Congratulations to all winners!\n\n2️⃣ Points Adjustment Compensation — 50,000 ARX-P has been credited to all users who were affected by the recent balance reconciliation. This is our way of saying thank you for your patience and continued support.\n\nCheck your dashboard balance for the updated totals. Keep mining and staking! ⛏️🔥`,
          is_active: true,
        })
        if (error) throw error
      }

      return new Response(JSON.stringify({ success: true, action, dry_run }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use: rumble_rewards, inflation_compensation, create_announcement' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Distribute rewards error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
