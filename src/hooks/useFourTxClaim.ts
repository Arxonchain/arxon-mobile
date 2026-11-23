import { useCallback, useEffect, useState } from 'react';

import { loadActivity } from '@/chainWallet/activity';
import { detectFourTx, FOUR_TX_ARX_P, isAddress, type FourTxProgress, type FourTxProof } from '@/chainWallet/fourTx';
import { inspectTx, type InspectedTx } from '@/chainWallet/inspect';
import { useChainWallet } from '@/chainWallet/ChainWalletContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePoints } from '@/hooks/usePoints';
import {
  clearTestnetLink,
  readTaskHistory,
  readTestnetLink,
  upsertTaskHistory,
  writeTestnetLink,
  type TestnetTaskHistoryItem,
} from '@/lib/testnetWalletLink';
import { PUBLIC_ERROR_HINT } from '@/lib/publicError';

const claimedKey = (userId: string, utcDate: string) => `arxon.fourTxClaimed.${userId}.${utcDate}`;

const TASK_META: { key: 'shield' | 'privatePay' | 'unshieldSelf' | 'unshieldOther'; label: string }[] = [
  { key: 'shield', label: 'Shield' },
  { key: 'privatePay', label: 'Private pay' },
  { key: 'unshieldSelf', label: 'Unshield to you' },
  { key: 'unshieldOther', label: 'Unshield to other' },
];

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
  const { address: deviceAddress, rpcUrl } = useChainWallet();
  const { refreshPoints } = usePoints();
  const [linkedAddress, setLinkedAddress] = useState<string | null>(null);
  const [history, setHistory] = useState<TestnetTaskHistoryItem[]>([]);
  const [progress, setProgress] = useState<FourTxProgress | null>(null);
  const [claimedToday, setClaimedToday] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLinkedAddress(null);
      setHistory([]);
      return;
    }
    const sync = () => {
      setLinkedAddress(readTestnetLink(user.id)?.address ?? null);
      setHistory(readTaskHistory(user.id));
    };
    sync();
    window.addEventListener('focus', sync);
    window.addEventListener('storage', sync);
    window.addEventListener('arxon-wallet-linked', sync);
    return () => {
      window.removeEventListener('focus', sync);
      window.removeEventListener('storage', sync);
      window.removeEventListener('arxon-wallet-linked', sync);
    };
  }, [user]);

  const linkWallet = useCallback((raw: string) => {
    if (!user) return { ok: false as const, error: 'Sign in first' };
    const addr = raw.trim();
    if (!isAddress(addr)) return { ok: false as const, error: 'Invalid wallet' };
    writeTestnetLink(user.id, addr);
    setLinkedAddress(addr.toLowerCase());
    setError(null);
    return { ok: true as const };
  }, [user]);

  const unlinkWallet = useCallback(() => {
    if (!user) return;
    clearTestnetLink(user.id);
    setLinkedAddress(null);
    setProgress(null);
  }, [user]);

  const reload = useCallback(async () => {
    if (!enabled || !user || !linkedAddress) {
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
    const next = detectFourTx({ items, user: linkedAddress, inspected });
    setProgress(next);

    const doneRows: TestnetTaskHistoryItem[] = TASK_META.flatMap((step) => {
      const row = next[step.key];
      if (!row) return [];
      return [{
        id: `${next.utcDate}:${step.key}`,
        key: step.key,
        label: step.label,
        utcDate: next.utcDate,
        at: row.at || Date.now(),
      }];
    });
    if (doneRows.length) setHistory(upsertTaskHistory(user.id, doneRows));

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
  }, [enabled, linkedAddress, rpcUrl, user]);

  useEffect(() => {
    void reload();
    if (!enabled || !linkedAddress) return;
    const t = window.setInterval(() => void reload(), 20_000);
    return () => window.clearInterval(t);
  }, [enabled, linkedAddress, reload]);

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
        setError(PUBLIC_ERROR_HINT);
        return { success: false as const, already: false };
      }
      const already = !!(data as { already_claimed?: boolean } | null)?.already_claimed;
      const ok = !!(data as { success?: boolean } | null)?.success;
      if (!ok && !already) {
        setError(PUBLIC_ERROR_HINT);
        return { success: false as const, already: false };
      }
      writeLocalClaimed(user.id, proof.utcDate);
      setClaimedToday(true);
      await refreshPoints();
      return { success: true as const, already, points: FOUR_TX_ARX_P };
    } catch (e) {
      setError(PUBLIC_ERROR_HINT);
      return { success: false as const, already: false };
    } finally {
      setClaiming(false);
    }
  }, [claimedToday, progress, refreshPoints, user]);

  return {
    progress,
    claimedToday,
    claiming,
    error,
    claim,
    reload,
    amount: FOUR_TX_ARX_P,
    linkedAddress,
    deviceAddress,
    history,
    linkWallet,
    unlinkWallet,
  };
}
