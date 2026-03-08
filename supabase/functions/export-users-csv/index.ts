import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Fetch ALL users using pagination
    const allUsers: any[] = [];
    let page = 1;
    const perPage = 1000;
    
    while (true) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        throw error;
      }

      if (!users || users.length === 0) {
        break;
      }

      allUsers.push(...users);
      
      if (users.length < perPage) {
        break;
      }
      
      page++;
    }

    // Generate CSV
    const csvHeader = 'id,email,created_at,confirmed_at,last_sign_in_at,email_confirmed_at,phone,phone_confirmed_at';
    const csvRows = allUsers.map(user => {
      const id = user.id || '';
      const email = (user.email || '').replace(/,/g, ';'); // Escape commas
      const created_at = user.created_at || '';
      const confirmed_at = user.confirmed_at || '';
      const last_sign_in_at = user.last_sign_in_at || '';
      const email_confirmed_at = user.email_confirmed_at || '';
      const phone = user.phone || '';
      const phone_confirmed_at = user.phone_confirmed_at || '';
      
      return `${id},${email},${created_at},${confirmed_at},${last_sign_in_at},${email_confirmed_at},${phone},${phone_confirmed_at}`;
    });

    const csv = [csvHeader, ...csvRows].join('\n');
    const timestamp = new Date().toISOString().split('T')[0];

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="auth_users_export_${timestamp}.csv"`,
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
