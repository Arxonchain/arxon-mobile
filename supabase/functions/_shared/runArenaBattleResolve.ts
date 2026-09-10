import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { blastArenaBattleNotifications } from "./arenaNotifications.ts";

type BattleOption = { id: string; name: string; power: number };

function parseBattleOptions(battle: Record<string, unknown>): BattleOption[] {
  const raw = battle.vote_options;
  if (Array.isArray(raw) && raw.length >= 2) {
    const parsed = raw
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const r = row as Record<string, unknown>;
        const id = typeof r.id === "string" ? r.id : "";
        const name = typeof r.name === "string" ? r.name : "";
        if (!id || !name) return null;
        return { id, name, power: Number(r.power) || 0 };
      })
      .filter((o): o is BattleOption => o !== null);
    if (parsed.length >= 2) return parsed;
  }

  const options: BattleOption[] = [
    { id: "a", name: String(battle.side_a_name || "A"), power: Number(battle.side_a_power) || 0 },
    { id: "b", name: String(battle.side_b_name || "B"), power: Number(battle.side_b_power) || 0 },
  ];
  if (battle.side_c_name && String(battle.side_c_name).trim()) {
    options.push({
      id: "c",
      name: String(battle.side_c_name),
      power: Number(battle.side_c_power) || 0,
    });
  }
  return options;
}
import { enqueueArenaPushBlastJob } from "./backgroundJobs.ts";
import { battleHasPayoutRows, releaseStuckResolveLock } from "./arenaResolveIdempotency.ts";

export type RunArenaResolveInput = {
  battleId?: string;
  manualWinner?: string;
  forceResolve?: boolean;
  supabaseUrl: string;
  serviceKey: string;
};

export type RunArenaResolveResult = {
  message: string;
  results: Record<string, unknown>[];
};

export async function runArenaBattleResolve(
  supabase: SupabaseClient,
  input: RunArenaResolveInput,
): Promise<RunArenaResolveResult> {
  const { battleId, manualWinner, forceResolve = false, supabaseUrl, serviceKey } = input;

  let battlesToResolve;

  if (battleId && manualWinner) {
    const { data, error } = await supabase
      .from("arena_battles")
      .select("*")
      .eq("id", battleId)
      .maybeSingle();
    if (error) throw new Error(`Database error: ${error.message}`);
    if (!data) throw new Error("Battle not found");

    const alreadyPaid = await battleHasPayoutRows(supabase, battleId);
    if (data.winner_side && !forceResolve) {
      return {
        message: "Battle already resolved",
        results: [{
          battle: data.title,
          battleId: data.id,
          skipped: true,
          reason: "already_resolved",
          winner: data.winner_side,
        }],
      };
    }

    if (alreadyPaid && data.winner_side && !forceResolve) {
      return {
        message: "Battle already resolved",
        results: [{
          battle: data.title,
          battleId: data.id,
          skipped: true,
          reason: "already_paid",
          winner: data.winner_side,
        }],
      };
    }

    if (forceResolve && data.total_rewards_distributed && data.total_rewards_distributed > 0) {
      throw new Error(`Battle already has ${data.total_rewards_distributed} rewards distributed. Cannot re-resolve.`);
    }
    battlesToResolve = [{ ...data, verified_winner: manualWinner }];
  } else {
    const { data, error } = await supabase
      .from("arena_battles")
      .select("*")
      .eq("is_active", true)
      .lt("ends_at", new Date().toISOString());
    if (error) throw new Error(`Error fetching battles: ${error.message}`);
    battlesToResolve = data || [];
  }

  if (battlesToResolve.length === 0) {
    return { message: "No battles to resolve", results: [] };
  }

  console.log(`Found ${battlesToResolve.length} battles to resolve`);
  const results: Record<string, unknown>[] = [];

  for (const battle of battlesToResolve) {
    try {
      console.log(`Resolving battle: ${battle.title} (${battle.id})`);

      let winnerSide: string | null = null;
      if (battle.verified_winner) {
        winnerSide = battle.verified_winner;
      } else {
        console.log(`Battle ${battle.id} has no verified_winner — skipping popularity resolve`);
        results.push({
          battle: battle.title,
          battleId: battle.id,
          skipped: true,
          reason: "verified_winner_required",
        });
        continue;
      }

      if (winnerSide !== "none" && (!winnerSide || !/^[a-z]+$/.test(winnerSide))) {
        throw new Error(`Invalid winner_side: ${winnerSide}`);
      }

      const battleOptions = parseBattleOptions(battle);
      const optionIds = new Set(battleOptions.map((o) => o.id));
      if (winnerSide !== "none" && !optionIds.has(winnerSide)) {
        throw new Error(`Winner side "${winnerSide}" is not a valid option for this market`);
      }

      const totalStakes = battleOptions.reduce((sum, o) => sum + o.power, 0);

      const { error: lockErr } = await supabase.rpc("lock_arena_battle_for_resolve", {
        p_battle_id: battle.id,
      });
      if (lockErr) {
        results.push({
          battle: battle.title,
          battleId: battle.id,
          skipped: true,
          reason: lockErr.message,
        });
        continue;
      }

      const prizePool = Number(battle.prize_pool) || 0;
      const TOTAL_POOL = prizePool + totalStakes;

      const winnerSideName = winnerSide === "none"
        ? "Void"
        : (battleOptions.find((o) => o.id === winnerSide)?.name || winnerSide);

      console.log(`Winner: ${winnerSide} (${winnerSideName}), TOTAL POOL: ${TOTAL_POOL}`);

      const { data: allVotes, error: votesError } = await supabase
        .from("arena_votes")
        .select("user_id, power_spent, side, early_stake_multiplier, created_at")
        .eq("battle_id", battle.id);

      if (votesError) throw new Error(`Failed to fetch votes: ${votesError.message}`);

      const votes = allVotes || [];
      console.log(`Total votes: ${votes.length}`);

      if (winnerSide === "none" || votes.length === 0) {
        const { data: refundResult, error: refundErr } = await supabase.rpc("refund_arena_battle_stakes", {
          p_battle_id: battle.id,
          p_reason: winnerSide === "none" ? "tie_or_void" : "no_votes",
        });
        if (refundErr) throw new Error(`Refund failed: ${refundErr.message}`);
        results.push({
          battle: battle.title,
          battleId: battle.id,
          winner: "none",
          refunded: true,
          refund: refundResult,
        });
        continue;
      }

      if (winnerSide && winnerSide !== "none" && votes.length > 0) {
        const winningVotes = votes.filter(v => v.side === winnerSide);

        if (winningVotes.length === 0) {
          const { data: refundResult, error: refundErr } = await supabase.rpc("refund_arena_battle_stakes", {
            p_battle_id: battle.id,
            p_reason: "empty_winning_side",
          });
          if (refundErr) throw new Error(`Refund failed: ${refundErr.message}`);
          results.push({
            battle: battle.title,
            battleId: battle.id,
            winner: winnerSide,
            refunded: true,
            reason: "empty_winning_side",
            refund: refundResult,
          });
          continue;
        }

        if (battle.winner_side && (await battleHasPayoutRows(supabase, battle.id))) {
          console.log(`Battle ${battle.id} already resolved with payouts. Skipping.`);
          await supabase.from("arena_battles").update({
            is_active: false,
            winner_side: battle.winner_side,
            outcome_verified: !!battle.verified_winner,
            outcome_verified_at: battle.verified_winner ? new Date().toISOString() : null,
          }).eq("id", battle.id);
          results.push({ battle: battle.title, battleId: battle.id, skipped: true, reason: "already_distributed" });
          continue;
        }

        const losingVotes = votes.filter(v => v.side !== winnerSide);

        console.log(`Winners: ${winningVotes.length}, Losers: ${losingVotes.length}`);

        type WinnerPayout = {
          vote: typeof winningVotes[0];
          weight: number;
          memberData: { current_win_streak: number; best_win_streak: number; total_wins: number } | null;
          currentStreak: number;
          bestStreak: number;
          baseReward: number;
          desiredStreak: number;
          streakBonus: number;
          totalReward: number;
        };

        let totalWeight = 0;
        const payouts: WinnerPayout[] = [];

        for (const vote of winningVotes) {
          const earlyMultiplier = Number(vote.early_stake_multiplier) || 1.0;
          const weight = vote.power_spent * earlyMultiplier;
          totalWeight += weight;

          const { data: memberData } = await supabase
            .from("arena_members")
            .select("current_win_streak, best_win_streak, total_wins")
            .eq("user_id", vote.user_id)
            .maybeSingle();

          const currentStreak = (memberData?.current_win_streak || 0) + 1;
          const bestStreak = Math.max(currentStreak, memberData?.best_win_streak || 0);

          payouts.push({
            vote,
            weight,
            memberData: memberData ?? null,
            currentStreak,
            bestStreak,
            baseReward: 0,
            desiredStreak: 0,
            streakBonus: 0,
            totalReward: 0,
          });
        }

        let sumBase = 0;
        let sumDesiredStreak = 0;
        for (const p of payouts) {
          const baseReward = totalWeight > 0 ? Math.floor((p.weight / totalWeight) * TOTAL_POOL) : 0;
          const netProfit = Math.max(0, baseReward - p.vote.power_spent);
          let streakBonusPercent = 0;
          if (p.currentStreak >= 10) streakBonusPercent = 100;
          else if (p.currentStreak >= 5) streakBonusPercent = 50;
          else if (p.currentStreak >= 3) streakBonusPercent = 25;
          const desiredStreak = Math.floor(netProfit * (streakBonusPercent / 100));
          p.baseReward = baseReward;
          p.desiredStreak = desiredStreak;
          sumBase += baseReward;
          sumDesiredStreak += desiredStreak;
        }

        const leftover = Math.max(0, TOTAL_POOL - sumBase);
        const streakScale = sumDesiredStreak > 0 && leftover > 0
          ? Math.min(1, leftover / sumDesiredStreak)
          : 0;

        let totalRewardsDistributed = 0;
        for (const p of payouts) {
          p.streakBonus = Math.floor(p.desiredStreak * streakScale);
          p.totalReward = p.baseReward + p.streakBonus;
          totalRewardsDistributed += p.totalReward;
        }

        const dust = Math.max(0, TOTAL_POOL - totalRewardsDistributed);
        if (dust > 0 && payouts.length > 0) {
          const top = payouts.reduce((a, b) => (b.weight > a.weight ? b : a));
          top.totalReward += dust;
          totalRewardsDistributed += dust;
        }

        const { data: existingEarnings } = await supabase
          .from("arena_earnings")
          .select("user_id, total_earned, points_credited_amount")
          .eq("battle_id", battle.id)
          .eq("is_winner", true);

        const creditedByUser = new Map(
          (existingEarnings ?? []).map((row) => [
            row.user_id,
            Number(row.points_credited_amount ?? 0) >= Number(row.total_earned ?? 0),
          ]),
        );

        for (const p of payouts) {
          const { vote, memberData, currentStreak, bestStreak, streakBonus, totalReward } = p;
          const alreadyCredited = creditedByUser.get(vote.user_id) === true;

          const { error: stakeErr } = await supabase.from("arena_staking_rewards").upsert({
            battle_id: battle.id,
            user_id: vote.user_id,
            original_stake: vote.power_spent,
            multiplier: vote.power_spent > 0 ? totalReward / vote.power_spent : 0,
            stake_return: 0,
            loser_pool_share: totalReward,
            total_reward: totalReward,
            is_winner: true,
          }, { onConflict: "battle_id,user_id", ignoreDuplicates: true });
          if (stakeErr) throw new Error(`Staking reward insert failed: ${stakeErr.message}`);

          const { error: earnErr } = await supabase.from("arena_earnings").upsert({
            battle_id: battle.id,
            user_id: vote.user_id,
            stake_amount: vote.power_spent,
            bonus_earned: totalReward - vote.power_spent,
            pool_share_earned: totalReward,
            streak_bonus: streakBonus,
            total_earned: totalReward,
            is_winner: true,
          }, { onConflict: "battle_id,user_id" });
          if (earnErr) throw new Error(`Earnings insert failed: ${earnErr.message}`);

          const { data: creditedAmount, error: creditErr } = await supabase.rpc(
            "credit_arena_battle_earnings",
            {
              p_battle_id: battle.id,
              p_user_id: vote.user_id,
              p_total_earned: totalReward,
            },
          );
          if (creditErr) throw new Error(`Points credit failed: ${creditErr.message}`);

          if (alreadyCredited && Number(creditedAmount) <= 0) {
            continue;
          }

          if (Number(creditedAmount) > 0 && memberData) {
            const { error: memberErr } = await supabase.from("arena_members").update({
              current_win_streak: currentStreak,
              best_win_streak: bestStreak,
              total_wins: (memberData.total_wins || 0) + 1,
            }).eq("user_id", vote.user_id);
            if (memberErr) throw new Error(`Member update failed: ${memberErr.message}`);
          }

          if (!alreadyCredited) {
            const streakText = currentStreak >= 3 ? ` 🔥 ${currentStreak}-Win Streak!` : "";
            await supabase.from("user_badges").insert({
              user_id: vote.user_id,
              badge_type: "winner",
              badge_name: `${winnerSideName} Champion`,
              description: `Won ${totalReward} ARX-P in "${battle.title}"${streakText}`,
              battle_id: battle.id,
            });

            const boostExpiry = new Date();
            boostExpiry.setDate(boostExpiry.getDate() + 7);
            await supabase.from("arena_boosts").upsert({
              user_id: vote.user_id,
              battle_id: battle.id,
              boost_percentage: 25,
              expires_at: boostExpiry.toISOString(),
            });
          }
        }

        for (const vote of losingVotes) {
          try {
            await supabase.from("arena_members").update({ current_win_streak: 0 }).eq("user_id", vote.user_id);

            await supabase.from("arena_staking_rewards").upsert({
              battle_id: battle.id, user_id: vote.user_id,
              original_stake: vote.power_spent, multiplier: 0,
              stake_return: 0, loser_pool_share: 0, total_reward: 0, is_winner: false,
            }, { onConflict: "battle_id,user_id", ignoreDuplicates: true });

            await supabase.from("arena_earnings").upsert({
              battle_id: battle.id, user_id: vote.user_id,
              stake_amount: vote.power_spent, bonus_earned: 0,
              pool_share_earned: 0, streak_bonus: 0, total_earned: 0, is_winner: false,
            }, { onConflict: "battle_id,user_id", ignoreDuplicates: true });

            const loserSideName = vote.side === "a" ? battle.side_a_name :
                                  vote.side === "c" ? (battle.side_c_name || "Draw") :
                                  battle.side_b_name;
            await supabase.from("user_badges").insert({
              user_id: vote.user_id, badge_type: "participant",
              badge_name: `${loserSideName} Warrior`,
              description: `Staked ${vote.power_spent} ARX-P on ${loserSideName} in "${battle.title}"`,
              battle_id: battle.id,
            });
          } catch (loserErr) {
            console.error(`Error processing loser ${vote.user_id}:`, loserErr);
          }
        }

        if (winningVotes.length > 0) {
          const topVoter = winningVotes.reduce((max, vote) =>
            vote.power_spent > max.power_spent ? vote : max
          );
          await supabase.from("user_badges").insert({
            user_id: topVoter.user_id, badge_type: "legend",
            badge_name: "Arena Legend",
            description: `Top stake in "${battle.title}"`,
            battle_id: battle.id,
          });
        }

        await supabase.from("arena_battles").update({
          is_active: false,
          winner_side: winnerSide,
          outcome_verified: !!battle.verified_winner,
          outcome_verified_at: battle.verified_winner ? new Date().toISOString() : null,
          losing_pool_distributed: true,
          total_rewards_distributed: totalRewardsDistributed,
        }).eq("id", battle.id);

        results.push({
          battle: battle.title,
          battleId: battle.id,
          winner: winnerSide,
          winnerName: winnerSideName,
          winnersCount: winningVotes.length,
          losersCount: losingVotes.length,
          totalPool: TOTAL_POOL,
          totalDistributed: totalRewardsDistributed,
        });

        try {
          const inApp = await blastArenaBattleNotifications(supabase, battle.id);
          const pushJob = await enqueueArenaPushBlastJob(
            supabase,
            { battle_id: battle.id, offset: 0, limit: 25 },
            supabaseUrl,
            serviceKey,
          );
          results[results.length - 1].notifications = {
            inApp: inApp.detail ?? inApp,
            push: { queued: true, job_id: pushJob.jobId },
          };
        } catch (notifErr) {
          console.error(`Notifications failed for ${battle.id}:`, notifErr);
        }

      } else {
        await supabase.from("arena_battles").update({
          is_active: false,
          winner_side: winnerSide || "none",
          outcome_verified: !!battle.verified_winner,
          outcome_verified_at: new Date().toISOString(),
          losing_pool_distributed: true,
          total_rewards_distributed: 0,
        }).eq("id", battle.id);

        results.push({
          battle: battle.title, battleId: battle.id,
          winner: winnerSide || "none", winnerName: "No winner",
          winnersCount: 0, losersCount: 0,
          totalPool: TOTAL_POOL, totalDistributed: 0,
        });
      }

      console.log(`Battle "${battle.title}" resolved successfully.`);

    } catch (battleErr) {
      const msg = battleErr instanceof Error ? battleErr.message : "Unknown error";
      console.error(`Failed to resolve battle ${battle.id}: ${msg}`);
      try {
        await releaseStuckResolveLock(supabase, battle.id);
      } catch (unlockErr) {
        console.error(`Failed to release resolve lock for ${battle.id}:`, unlockErr);
      }
      results.push({ battle: battle.title, battleId: battle.id, error: msg });
    }
  }

  return { message: "Battle resolution complete", results };
}
