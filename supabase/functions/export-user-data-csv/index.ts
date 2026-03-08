 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
     const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
     
     const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
       auth: { autoRefreshToken: false, persistSession: false },
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
 
     // Parse request body for email filter list
     let filterEmails: Set<string> | null = null;
     
     if (req.method === 'POST') {
       const body = await req.json();
       if (body.emails && Array.isArray(body.emails)) {
         // Normalize emails to lowercase for comparison
         filterEmails = new Set(body.emails.map((e: string) => e.toLowerCase().trim()));
         console.log(`Filtering to ${filterEmails.size} emails from input list`);
       }
     }
 
     console.log('Fetching all auth users...');
 
     // Fetch ALL auth users using pagination
     const allUsers: any[] = [];
     let page = 1;
     const perPage = 1000;
     
     while (true) {
       const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
         page,
         perPage,
       });
 
       if (error) throw error;
       if (!users || users.length === 0) break;
 
       allUsers.push(...users);
       if (users.length < perPage) break;
       page++;
     }
 
     console.log(`Found ${allUsers.length} total auth users`);
 
     // Filter users by email list if provided
     const filteredUsers = filterEmails 
       ? allUsers.filter(u => u.email && filterEmails!.has(u.email.toLowerCase()))
       : allUsers;
 
      console.log(`After filtering: ${filteredUsers.length} users match`);
 
      // Get ALL user_points data using pagination (default limit is 1000)
      console.log('Fetching all user_points...');
      const allPoints: any[] = [];
      let pointsOffset = 0;
      const pointsPageSize = 1000;
      
      while (true) {
        const { data: pointsBatch, error: pointsError } = await supabaseAdmin
          .from('user_points')
          .select('user_id, total_points, mining_points, task_points, social_points, referral_points, daily_streak, referral_bonus_percentage, x_post_boost_percentage')
          .range(pointsOffset, pointsOffset + pointsPageSize - 1);
 
        if (pointsError) throw pointsError;
        if (!pointsBatch || pointsBatch.length === 0) break;
        
        allPoints.push(...pointsBatch);
        if (pointsBatch.length < pointsPageSize) break;
        pointsOffset += pointsPageSize;
      }
      console.log(`Found ${allPoints.length} user_points records`);
 
      // Get ALL profiles data using pagination
      console.log('Fetching all profiles...');
      const allProfiles: any[] = [];
      let profilesOffset = 0;
      const profilesPageSize = 1000;
      
      while (true) {
        const { data: profilesBatch, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('user_id, username, referral_code')
          .range(profilesOffset, profilesOffset + profilesPageSize - 1);
 
        if (profilesError) throw profilesError;
        if (!profilesBatch || profilesBatch.length === 0) break;
        
        allProfiles.push(...profilesBatch);
        if (profilesBatch.length < profilesPageSize) break;
        profilesOffset += profilesPageSize;
      }
      console.log(`Found ${allProfiles.length} profile records`);
 
     // Create lookup maps with proper typing
      const pointsMap = new Map<string, any>(allPoints.map(p => [p.user_id, p]));
      const profilesMap = new Map<string, any>(allProfiles.map(p => [p.user_id, p]));
 
     // Generate CSV with full data - only for filtered users
     const csvHeader = 'email,total_points,mining_points,task_points,social_points,referral_points,daily_streak,referral_bonus_pct,x_post_boost_pct,username,referral_code,signup_date';
     
     const csvRows = filteredUsers.map(user => {
       const points = pointsMap.get(user.id);
       const profile = profilesMap.get(user.id);
       
       const email = (user.email || '').replace(/,/g, ';');
       const total_points = Math.floor(Number(points?.total_points || 0));
       const mining_points = Math.floor(Number(points?.mining_points || 0));
       const task_points = Math.floor(Number(points?.task_points || 0));
       const social_points = Math.floor(Number(points?.social_points || 0));
       const referral_points = Math.floor(Number(points?.referral_points || 0));
       const daily_streak = points?.daily_streak || 0;
       const referral_bonus_pct = points?.referral_bonus_percentage || 0;
       const x_post_boost_pct = points?.x_post_boost_percentage || 0;
       const username = ((profile?.username || '') as string).replace(/,/g, ';');
       const referral_code = profile?.referral_code || '';
       const signup_date = user.created_at || '';
       
       return `${email},${total_points},${mining_points},${task_points},${social_points},${referral_points},${daily_streak},${referral_bonus_pct},${x_post_boost_pct},${username},${referral_code},${signup_date}`;
     });
 
     const csv = [csvHeader, ...csvRows].join('\n');
     const timestamp = new Date().toISOString().split('T')[0];
     const filename = filterEmails 
       ? `filtered_user_export_${filteredUsers.length}_users_${timestamp}.csv`
       : `full_user_export_${timestamp}.csv`;
 
     console.log(`Generated CSV with ${csvRows.length} rows`);
 
     return new Response(csv, {
       headers: {
         ...corsHeaders,
         'Content-Type': 'text/csv',
         'Content-Disposition': `attachment; filename="${filename}"`,
       },
     });
 
   } catch (error: unknown) {
     console.error('Export error:', error);
     const message = error instanceof Error ? error.message : 'Unknown error';
     return new Response(JSON.stringify({ error: message }), {
       status: 500,
       headers: { ...corsHeaders, 'Content-Type': 'application/json' },
     });
   }
 });