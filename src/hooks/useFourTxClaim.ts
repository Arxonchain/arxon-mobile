import { useCallback, useEffect, useState } from 'react';

import { loadActivity } from '@/chainWallet/activity';
import { detectFourTx, FOUR_TX_ARX_P, type FourTxProgress, type FourTxProof } from '@/chainWallet/fourTx';
import { inspectTx, type InspectedTx } from '@/chainWallet/inspect';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePoints } from '@/hooks/usePoints';

const claimedKey = (userId: string, utcDate: string) => `arxon.fourTxClaimed.${userId}.${utcDate}`;

function readLocalClaimed(userId: string, utcDate: string) {
  try {
    return window.localStorage.getItem(claimedKey(userId, utcDate)) === '1';
  } catch {
    return false;
  }
}

function writeLocalClaimed(userId: string, utcDate: string) {
  try {
    window.localStorage.setItem(claimedKey(userId, utcDate), '1');
  } catch {
    /* ignore */
  }
}

export function useFourTxClaim(enabled: boolean) {
  const { user } = useAuth();
  const { address, rpcUrl } = useChainWallet();
  const { refreshPoints } = usePoints();
  const [progress, setProgress] = useState<FourTxProgress | null>(null);
  const [claimedToday, setClaimedToday] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled || !user || !address) {
      setProgress(null);
      return;
    }
    const items = await loadActivity();
    const inspected: Record<string, InspectedTx> = {};
    const needInspect = items.filter((row) => {
      if (row.network === 'ethereum') return false;
      if (row.kind === 'unshield') return true;
      if (row.kind !== 'shield' && row.kind !== 'private') return false;
      return !row.clocks?.inBlockAt;
    });
    await Promise.all(
      needInspect.slice(0, 16).map(async (row) => {
        try {
          inspected[row.hash.toLowerCase()] = await inspectTx(rpcUrl, row.hash);
        } catch {
          /* offline — local payout / In block still used */
        }
      })
    );
    const next = detectFourTx({ items, user: address, inspected });
    setProgress(next);

    let remote = false;
    try {
      const { data } = await supabase
        .from('daily_four_tx_claim' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('utc_date', next.utcDate)
        .maybeSingle();
      remote = !!data;
    } catch {
      remote = false;
    }
    const local = readLocalClaimed(user.id, next.utcDate);
    setClaimedToday(remote || local);
  }, [address, enabled, rpcUrl, user]);

  useEffect(() => {
    void reload();
    if (!enabled) return;
    const t = window.setInterval(() => void reload(), 20_000);
    return () => window.clearInterval(t);
  }, [enabled, reload]);

  const claim = useCallback(async () => {
    if (!user || !progress?.proof || claimedToday) return { success: false as const, already: claimedToday };
    const proof: FourTxProof = progress.proof;
    setClaiming(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('claim_daily_four_tx' as any, {
        p_wallet: proof.wallet,
        p_utc_date: proof.utcDate,
        p_shield_hash: proof.shieldHash,
        p_private_hash: proof.privateHash,
        p_unshield_self_hash: proof.unshieldSelfHash,
        p_unshield_other_hash: proof.unshieldOtherHash,
        p_unshield_self_payout: proof.unshieldSelfPayout,
        p_unshield_other_payout: proof.unshieldOtherPayout,
      });
      if (rpcError) {
        setError(rpcError.message || 'Claim failed. Apply the four-tx SQL on Supabase.');
        return { success: false as const, already: false };
      }
      const already = !!(data as { already_claimed?: boolean } | null)?.already_claimed;
      const ok = !!(data as { success?: boolean } | null)?.success;
      if (!ok && !already) {
        setError((data as { error?: string } | null)?.error || 'Claim failed');
        return { success: false as const, already: false };
      }
      writeLocalClaimed(user.id, proof.utcDate);
      setClaimedToday(true);
      await refreshPoints();
      return { success: true as const, already, points: FOUR_TX_ARX_P };
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Claim failed');
      return { success: false as const, already: false };
    } finally {
      setClaiming(false);
    }
  }, [claimedToday, progress, refreshPoints, user]);

  return { progress, claimedToday, claiming, error, claim, reload, amount: FOUR_TX_ARX_P };
}
