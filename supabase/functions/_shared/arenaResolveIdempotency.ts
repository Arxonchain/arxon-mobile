import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** True when this battle already has payout/refund rows (safe to skip re-resolve). */
export async function battleHasPayoutRows(
  supabase: SupabaseClient,
  battleId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("arena_earnings")
    .select("id", { count: "exact", head: true })
    .eq("battle_id", battleId);
  if (error) throw new Error(`Payout check failed: ${error.message}`);
  return (count ?? 0) > 0;
}

/** Re-open a battle that was soft-locked but never finished resolving. */
export async function releaseStuckResolveLock(
  supabase: SupabaseClient,
  battleId: string,
): Promise<void> {
  const hasPayout = await battleHasPayoutRows(supabase, battleId);
  if (hasPayout) return;

  const { data: battle } = await supabase
    .from("arena_battles")
    .select("winner_side")
    .eq("id", battleId)
    .maybeSingle();

  if (battle?.winner_side) return;

  await supabase
    .from("arena_battles")
    .update({ is_active: true })
    .eq("id", battleId)
    .is("winner_side", null);
}
