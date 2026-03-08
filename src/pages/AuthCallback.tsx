import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current URL hash and search params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);
        
        // Check for error
        const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');
        if (errorDesc) {
          setError(errorDesc);
          return;
        }

        // Check for recovery flow (password reset)
        const type = hashParams.get('type') || searchParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        // If we have tokens in URL, set the session
        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
        }

        // Handle token_hash (PKCE flow)
        const tokenHash = searchParams.get('token_hash');
        const emailType = searchParams.get('type');
        if (tokenHash && emailType) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: emailType as any,
          });
          if (error) throw error;
        }

        // Handle code exchange (OAuth/PKCE)
        const code = searchParams.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Check session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // If this was a password recovery, go to reset page
          if (type === 'recovery' || emailType === 'recovery') {
            navigate('/reset-password', { replace: true });
          } else {
            // Normal login - go to dashboard
            navigate('/', { replace: true });
          }
        } else {
          // No session - might be email confirmation
          navigate('/auth', { replace: true });
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-destructive mb-4">Authentication Error</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => navigate('/auth')}
            className="btn-mining"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-accent mx-auto mb-4" />
        <p className="text-muted-foreground">Verifying your account...</p>
      </div>
    </div>
  );
}
