import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ArenaMember {
  id: string;
  user_id: string;
  club: 'alpha' | 'omega';
  fingerprint_verified: boolean;
  fingerprint_hash: string | null;
  joined_at: string;
  total_votes: number;
  total_wins: number;
}

export const useArenaMembership = () => {
  const { user } = useAuth();
  const [membership, setMembership] = useState<ArenaMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const fetchMembership = useCallback(async () => {
    if (!user) {
      setMembership(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('arena_members')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setMembership(data as ArenaMember | null);
    } catch (error) {
      console.error('Error fetching arena membership:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auto-assign to club with fewer members
  const getAutoAssignedClub = async (): Promise<'alpha' | 'omega'> => {
    const { count: alphaCount } = await supabase
      .from('arena_members')
      .select('*', { count: 'exact', head: true })
      .eq('club', 'alpha');

    const { count: omegaCount } = await supabase
      .from('arena_members')
      .select('*', { count: 'exact', head: true })
      .eq('club', 'omega');

    const alpha = alphaCount ?? 0;
    const omega = omegaCount ?? 0;

    // Assign to smaller club, or random if equal
    if (alpha < omega) return 'alpha';
    if (omega < alpha) return 'omega';
    return Math.random() < 0.5 ? 'alpha' : 'omega';
  };

  const registerMembership = async (fingerprintHash?: string): Promise<{ success: boolean; club: 'alpha' | 'omega' | null; error?: string }> => {
    if (!user) {
      toast.error('You must be logged in to join the Arena');
      return { success: false, club: null, error: 'Not logged in' };
    }

    setRegistering(true);
    try {
      // Auto-assign club
      const assignedClub = await getAutoAssignedClub();

      // Register membership (fingerprint is optional - only used during voting)
      const insertData: any = {
        user_id: user.id,
        club: assignedClub,
        fingerprint_verified: !!fingerprintHash,
      };
      if (fingerprintHash) {
        insertData.fingerprint_hash = fingerprintHash;
      }

      const { data, error } = await supabase
        .from('arena_members')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('You are already registered in the Arena');
          return { success: false, club: null, error: 'Already registered' };
        } else {
          throw error;
        }
      }

      setMembership(data as ArenaMember);
      toast.success(`Welcome to Club ${assignedClub.toUpperCase()}!`, {
        description: 'You are now ready to battle in the Arena!'
      });
      return { success: true, club: assignedClub };
    } catch (error: any) {
      console.error('Error registering arena membership:', error);
      toast.error('Failed to register for the Arena');
      return { success: false, club: null, error: 'Registration failed' };
    } finally {
      setRegistering(false);
    }
  };

  useEffect(() => {
    fetchMembership();
  }, [fetchMembership]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('arena-membership')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'arena_members',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setMembership(payload.new as ArenaMember);
          } else if (payload.eventType === 'DELETE') {
            setMembership(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Re-register fingerprint for existing member (recovery flow)
  const reregisterFingerprint = async (newFingerprintHash: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || !membership) {
      toast.error('You must be logged in and a member to re-register');
      return { success: false, error: 'Not logged in or not a member' };
    }

    try {
      // Check if this NEW fingerprint is already used by ANOTHER account
      const { data: existingFingerprint, error: checkError } = await supabase
        .from('arena_members')
        .select('user_id')
        .eq('fingerprint_hash', newFingerprintHash)
        .neq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking fingerprint:', checkError);
      }

      if (existingFingerprint) {
        toast.error('This fingerprint is already registered to another account', {
          description: 'Each fingerprint can only be linked to one Arena account.'
        });
        return { success: false, error: 'Fingerprint already registered to another account' };
      }

      // Update the user's fingerprint
      const { error } = await supabase
        .from('arena_members')
        .update({
          fingerprint_hash: newFingerprintHash,
          fingerprint_verified: true,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      // Refresh membership data
      await fetchMembership();
      
      toast.success('Fingerprint re-registered successfully!', {
        description: 'Your new device fingerprint has been saved.'
      });
      return { success: true };
    } catch (error: any) {
      console.error('Error re-registering fingerprint:', error);
      toast.error('Failed to re-register fingerprint');
      return { success: false, error: 'Re-registration failed' };
    }
  };

  return {
    membership,
    loading,
    registering,
    registerMembership,
    reregisterFingerprint,
    refetch: fetchMembership,
  };
};
