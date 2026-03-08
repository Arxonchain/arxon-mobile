import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body - expects CSV data
    const { csvData, dryRun = true, batchSize = 50 } = await req.json();
    
    if (!csvData) {
      return new Response(JSON.stringify({ error: 'CSV data required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting import - dryRun: ${dryRun}, batchSize: ${batchSize}`);

    // Parse CSV
    const lines = csvData.trim().split('\n');
    const results = {
      total: lines.length,
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
      preview: [] as any[],
    };

    // Parse all lines into user data first
    const usersToProcess: any[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Skip header if present
      if (line.toLowerCase().startsWith('email,')) continue;
      
      const parts = line.split(',');
      if (parts.length < 12) {
        results.errors.push(`Line ${i + 1}: Invalid format - expected 12 columns, got ${parts.length}`);
        continue;
      }

      const [
        email,
        total_points,
        mining_points,
        task_points,
        social_points,
        referral_points,
        daily_streak,
        referral_bonus_pct,
        x_post_boost_pct,
        username,
        referral_code,
        signup_date
      ] = parts;

      if (!email || !email.includes('@')) {
        results.errors.push(`Line ${i + 1}: Invalid email`);
        continue;
      }

      usersToProcess.push({
        email: email.trim(),
        total_points: parseFloat(total_points) || 0,
        mining_points: parseFloat(mining_points) || 0,
        task_points: parseFloat(task_points) || 0,
        social_points: parseFloat(social_points) || 0,
        referral_points: parseFloat(referral_points) || 0,
        daily_streak: parseInt(daily_streak) || 0,
        referral_bonus_percentage: parseInt(referral_bonus_pct) || 0,
        x_post_boost_percentage: parseInt(x_post_boost_pct) || 0,
        username: username?.trim() || null,
        referral_code: referral_code?.trim() || null,
        line: i + 1,
      });
    }

    console.log(`Parsed ${usersToProcess.length} valid users from ${lines.length} lines`);

    // Preview mode - just show what would be imported
    if (dryRun) {
      results.processed = usersToProcess.length;
      results.preview = usersToProcess.slice(0, 10).map(u => ({
        email: u.email,
        total_points: u.total_points,
        username: u.username,
      }));
      
      return new Response(JSON.stringify({
        success: true,
        dryRun: true,
        results,
        message: `Preview: ${results.processed} users would be imported`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Actual import - process in batches
    for (let i = 0; i < usersToProcess.length; i++) {
      const userData = usersToProcess[i];
      
      try {
        // Create user in auth.users with a temporary password
        const tempPassword = `Arxon2024!${Math.random().toString(36).slice(-8)}`;
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: tempPassword,
          email_confirm: true, // Auto-confirm so they can use forgot password
          user_metadata: {
            username: userData.username,
            imported: true,
            imported_at: new Date().toISOString(),
          }
        });

        if (createError) {
          if (createError.message.includes('already exists') || 
              createError.message.includes('duplicate') ||
              createError.message.includes('already been registered')) {
            results.skipped++;
            results.processed++;
            console.log(`Skipped existing: ${userData.email}`);
            continue;
          }
          results.errors.push(`${userData.email}: ${createError.message}`);
          console.error(`Create error for ${userData.email}:`, createError.message);
          continue;
        }

        if (!newUser.user) {
          results.errors.push(`${userData.email}: Failed to create user`);
          continue;
        }

        const userId = newUser.user.id;

        // Create profile (trigger should handle referral_code and nexus_address)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            user_id: userId,
            username: userData.username,
            referral_code: userData.referral_code,
          }, { onConflict: 'user_id' });

        if (profileError) {
          console.error(`Profile error for ${userData.email}:`, profileError);
        }

        // Create user_points with imported data
        const { error: pointsError } = await supabaseAdmin
          .from('user_points')
          .upsert({
            user_id: userId,
            total_points: userData.total_points,
            mining_points: userData.mining_points,
            task_points: userData.task_points,
            social_points: userData.social_points,
            referral_points: userData.referral_points,
            daily_streak: userData.daily_streak,
            referral_bonus_percentage: userData.referral_bonus_percentage,
            x_post_boost_percentage: userData.x_post_boost_percentage,
          }, { onConflict: 'user_id' });

        if (pointsError) {
          console.error(`Points error for ${userData.email}:`, pointsError);
        }

        results.created++;
        results.processed++;
        
        // Log progress every 10 users
        if (results.created % 10 === 0) {
          console.log(`Progress: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`);
        }

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.errors.push(`${userData.email}: ${message}`);
        console.error(`Exception for ${userData.email}:`, message);
      }
    }

    console.log(`Import complete: ${results.created} created, ${results.skipped} skipped, ${results.errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      dryRun: false,
      results,
      message: `Imported ${results.created} users, skipped ${results.skipped} existing`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Import error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
