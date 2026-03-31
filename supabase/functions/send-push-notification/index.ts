import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Web Push (VAPID) helpers ───────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

async function generateVapidAuthHeader(
  endpoint: string, vapidPublicKey: string, vapidPrivateKey: string
): Promise<string> {
  const urlObj = new URL(endpoint);
  const audience = `${urlObj.protocol}//${urlObj.host}`;

  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = { aud: audience, exp: Math.floor(Date.now() / 1000) + 43200, sub: 'mailto:gabemetax@gmail.com' };

  const b64u = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64uJson = (o: object) => b64u(JSON.stringify(o));
  const b64uBytes = (b: Uint8Array) => b64u(String.fromCharCode(...b));

  const decode = (s: string) => {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return new Uint8Array([...atob(s)].map(c => c.charCodeAt(0)));
  };

  const privBytes = decode(vapidPrivateKey);
  const pubBytes  = decode(vapidPublicKey);
  const x = pubBytes.slice(1, 33);
  const y = pubBytes.slice(33, 65);

  const cryptoKey = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256',
    x: b64uBytes(x), y: b64uBytes(y), d: b64uBytes(privBytes),
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);

  const unsigned = `${b64uJson(header)}.${b64uJson(payload)}`;
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  return `vapid t=${unsigned}.${b64uBytes(new Uint8Array(sig))}, k=${vapidPublicKey}`;
}

async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: object, vapidPublicKey: string, vapidPrivateKey: string
): Promise<boolean> {
  try {
    const authorization = await generateVapidAuthHeader(sub.endpoint, vapidPublicKey, vapidPrivateKey);
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json', TTL: '86400', Urgency: 'high' },
      body: JSON.stringify(payload),
    });
    if (res.status === 410 || res.status === 404) return false; // expired
    return res.status === 200 || res.status === 201;
  } catch { return false; }
}

// ── FCM V1 API helper ─────────────────────────────────────────────────────
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const b64u = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64uJson = (o: object) => b64u(JSON.stringify(o));

  // Import RSA private key
  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const keyBytes = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const unsigned = `${b64uJson(header)}.${b64uJson(payload)}`;
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const jwt = `${unsigned}.${b64u(String.fromCharCode(...new Uint8Array(sig)))}`;

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error('Failed to get access token:', tokenData);
    throw new Error('Could not get FCM access token');
  }
  return tokenData.access_token;
}

async function sendFCMv1(
  fcmToken: string, title: string, body: string,
  data: Record<string, string>, projectId: string, serviceAccount: any
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken(serviceAccount);

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: fcmToken,
            notification: { title, body },
            data,
            android: {
              priority: 'high',
              notification: { sound: 'default', click_action: 'FLUTTER_NOTIFICATION_CLICK' },
            },
          },
        }),
      }
    );

    const result = await res.json();
    console.log('FCM V1 result:', result);

    if (result.error?.code === 404 || result.error?.status === 'UNREGISTERED') {
      return false; // token expired
    }
    return !!result.name; // success returns message name
  } catch (e) {
    console.error('FCM V1 send error:', e);
    return false;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const vapidPublicKey  = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const firebaseSA      = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    const firebaseProject = Deno.env.get('FIREBASE_PROJECT_ID') || 'arxon-cb305';

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { userId, userIds, title, body, url, tag, data, broadcast } = await req.json();
    console.log('Push request:', { userId, userIds: userIds?.length, broadcast, title });

    // Build query
    let query = supabase.from('push_subscriptions').select('*');
    if (!broadcast && userId)                   query = query.eq('user_id', userId);
    else if (!broadcast && userIds?.length > 0) query = query.in('user_id', userIds);

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = { title: title || 'ARXON', body: body || 'New notification', url: url || '/', tag: tag || 'arxon', ...data };
    const dataStrings: Record<string, string> = { url: url || '/', tag: tag || 'arxon' };

    // Parse service account once
    let serviceAccount: any = null;
    if (firebaseSA) {
      try { serviceAccount = JSON.parse(firebaseSA); } catch { console.error('Invalid FIREBASE_SERVICE_ACCOUNT JSON'); }
    }

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        const isFCM = sub.fcm_token || sub.endpoint?.startsWith('fcm:');

        if (isFCM) {
          const token = sub.fcm_token || sub.endpoint?.replace('fcm:', '');
          if (!token || !serviceAccount) return false;

          const ok = await sendFCMv1(
            token, title || 'ARXON', body || 'New notification',
            dataStrings, firebaseProject, serviceAccount
          );

          if (!ok) await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          return ok;
        }

        // Web push
        if (!vapidPublicKey || !vapidPrivateKey) return false;
        const ok = await sendWebPush(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload, vapidPublicKey, vapidPrivateKey
        );
        if (!ok) await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        return ok;
      })
    );

    const sent = results.filter(Boolean).length;
    console.log(`Sent ${sent}/${subscriptions.length}`);

    return new Response(
      JSON.stringify({ success: true, sent, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
