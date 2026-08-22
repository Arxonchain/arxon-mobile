import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  adminAuthResponse,
  adminCorsHeaders,
  requireAdminOrService,
} from "../_shared/adminAuth.ts";
import {
  blastArenaBattleNotifications,
  notifyArenaBattleResolved,
} from "../_shared/arenaNotifications.ts";
import {
  enqueueArenaPushBlastJob,
  enqueueArenaResolveJob,
} from "../_shared/backgroundJobs.ts";
import {
  battleHasPayoutRows,
  releaseStuckResolveLock,
} from "../_shared/arenaResolveIdempotency.ts";

const corsHeaders = adminCorsHeaders;

/**
 * FIXED Reward System (v3):
 * - Total Pool = Prize Pool (admin set) + All Stakes (winners + losers)
 * - EVERY winner gets a guaranteed proportional base share first
 *   (weight = stake × earlyMultiplier; base = floor(weight/totalWeight * TOTAL_POOL))
 * - Streak bonus = % of NET PROFIT, paid ONLY from leftover after all bases
 *   (scaled down if desired streaks exceed leftover — never zeros other winners)
 * - Floor dust (if any) goes to top-weight winner; sum never exceeds TOTAL_POOL
 * - Losers get NOTHING
 * - Battle marked resolved AFTER rewards distributed (atomic)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await requireAdminOrService(req);
    if (!auth.ok) return adminAuthResponse(auth);

    const supabase = auth.supabase;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const body = await req.json().catch(() => ({}));
    const manualWinner = body.winner_side;
    const battleId = body.battle_id;
    const forceResolve = body.force === true;
    const notificationsOnly = body.notifications_only === true;
    const dryRun = body.dryRun === true || body.dry_run === true;
    const fromWorker = body._from_worker === true;
    const useQueue = body.queue !== false && !fromWorker && !notificationsOnly;

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dryRun: true,
          message: "Auth OK — resolve skipped (dry run)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("Starting battle resolution...", { manualWinner, battleId, forceResolve, notificationsOnly, fromWorker, useQueue });

    if (battleId && manualWinner && useQueue) {
      const queued = await enqueueArenaResolveJob(
        supabase,
        {
          battle_id: battleId,
          winner_side: manualWinner,
          force: forceResolve,
        },
        supabaseUrl,
        supabaseServiceKey,
      );

      if (!queued.error?.includes("Could not find the function")) {
        if (queued.error) throw new Error(queued.error);
        return new Response(
          JSON.stringify({
            message: "Arena resolve queued",
            queued: true,
            job_id: queued.jobId,
            battle_id: battleId,
            results: [{
              battleId,
              queued: true,
              job_id: queued.jobId,
            }],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (notificationsOnly && battleId) {
      const { data: battleRow, error: battleErr } = await supabase
        .from("arena_battles")
        .select("id, title, winner_side, side_a_name, side_b_name, side_c_name")
        .eq("id", battleId)
        .maybeSingle();
      if (battleErr || !battleRow?.winner_side) {
        throw new Error(battleErr?.message || "Battle not found or not resolved yet");
      }
      const notif = await notifyArenaBattleResolved(supabase, battleRow, {
        supabaseUrl,
        serviceKey: supabaseServiceKey,
        push: body.push !== false,
      });
      return new Response(JSON.stringify({ message: "Arena notifications blasted", battleId, notif }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      if (alreadyPaid || (data.winner_side && !forceResolve)) {
        return new Response(
          JSON.stringify({
            message: "Battle already resolved",
            results: [{
              battle: data.title,
              battleId: data.id,
              skipped: true,
              reason: "already_resolved",
              winner: data.winner_side,
            }],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
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
      return new Response(JSON.stringify({ message: "No battles to resolve" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${battlesToResolve.length} battles to resolve`);
    const results = [];

    for (const battle of battlesToResolve) {
      try {
        console.log(`Resolving battle: ${battle.title} (${battle.id})`);

        const sideAPower = Number(battle.side_a_power) || 0;
        const sideBPower = Number(battle.side_b_power) || 0;
        const sideCPower = Number(battle.side_c_power) || 0;
        const hasSideC = !!battle.side_c_name;

        // Determine winner — NEVER invent from stake popularity for prediction markets
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

        if (!["a", "b", "c", "none"].includes(winnerSide)) {
          throw new Error(`Invalid winner_side: ${winnerSide}`);
        }

        // Lock battle row to reduce concurrent resolve races
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
        const totalStakes = sideAPower + sideBPower + sideCPower;
        const TOTAL_POOL = prizePool + totalStakes;

        const winnerSideName = winnerSide === "a" ? battle.side_a_name :
                               winnerSide === "c" ? (battle.side_c_name || "Draw") :
                               winnerSide === "none" ? "Void" :
                               battle.side_b_name;

        console.log(`Winner: ${winnerSide} (${winnerSideName}), TOTAL POOL: ${TOTAL_POOL}`);

        // Get all votes
        const { data: allVotes, error: votesError } = await supabase
          .from("arena_votes")
          .select("user_id, power_spent, side, early_stake_multiplier, created_at")
          .eq("battle_id", battle.id);

        if (votesError) throw new Error(`Failed to fetch votes: ${votesError.message}`);

        const votes = allVotes || [];
        console.log(`Total votes: ${votes.length}`);

        // Tie / void / empty-winner → refund stakes (never burn pool)
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

          if (await battleHasPayoutRows(supabase, battle.id)) {
            console.log(`Battle ${battle.id} already has earnings. Skipping.`);
            await supabase.from("arena_battles").update({
              is_active: false,
              winner_side: winnerSide,
              outcome_verified: !!battle.verified_winner,
              outcome_verified_at: battle.verified_winner ? new Date().toISOString() : null,
            }).eq("id", battle.id);
            results.push({ battle: battle.title, battleId: battle.id, skipped: true, reason: "already_distributed" });
            continue;
          }

          const losingVotes = votes.filter(v => v.side !== winnerSide);

          console.log(`Winners: ${winningVotes.length}, Losers: ${losingVotes.length}`);

          // ─── v3: base shares first, streak only from leftover ───
          // Weight = stake × earlyMultiplier ONLY (no bonus_percentage multiplier)
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

          // Floor dust → top-weight winner
          const dust = Math.max(0, TOTAL_POOL - totalRewardsDistributed);
          if (dust > 0 && payouts.length > 0) {
            const top = payouts.reduce((a, b) => (b.weight > a.weight ? b : a));
            top.totalReward += dust;
            totalRewardsDistributed += dust;
          }

          // ─── DISTRIBUTE REWARDS TO WINNERS ───
          for (const p of payouts) {
              const { vote, memberData, currentStreak, bestStreak, streakBonus, totalReward } = p;

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

              const { data: earnRow, error: earnErr } = await supabase.from("arena_earnings").upsert({
                battle_id: battle.id,
                user_id: vote.user_id,
                stake_amount: vote.power_spent,
                bonus_earned: totalReward - vote.power_spent,
                pool_share_earned: totalReward,
                streak_bonus: streakBonus,
                total_earned: totalReward,
                is_winner: true,
              }, { onConflict: "battle_id,user_id", ignoreDuplicates: true }).select("id").maybeSingle();
              if (earnErr) throw new Error(`Earnings insert failed: ${earnErr.message}`);

              // Only credit points / win stats when a new earnings row was written
              if (earnRow) {
                if (memberData) {
                  const { error: memberErr } = await supabase.from("arena_members").update({
                    current_win_streak: currentStreak,
                    best_win_streak: bestStreak,
                    total_wins: (memberData.total_wins || 0) + 1,
                  }).eq("user_id", vote.user_id);
                  if (memberErr) throw new Error(`Member update failed: ${memberErr.message}`);
                }

                let remainingReward = totalReward;
                while (remainingReward > 0) {
                  const increment = Math.min(remainingReward, 500);
                  const { error: rpcErr } = await supabase.rpc("increment_user_points", {
                    p_user_id: vote.user_id,
                    p_amount: increment,
                    p_type: "arena",
                  });
                  if (rpcErr) throw new Error(`Points credit failed: ${rpcErr.message}`);
                  remainingReward -= increment;
                }
              }

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

          // Process losers
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

          // Award legend badge to top winner
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

          // Mark battle as resolved AFTER rewards distributed
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

          // In-app notifications + queued FCM push chunks (avoids edge timeout)
          try {
            const inApp = await blastArenaBattleNotifications(supabase, battle.id);
            const pushJob = await enqueueArenaPushBlastJob(
              supabase,
              { battle_id: battle.id, offset: 0, limit: 25 },
              supabaseUrl,
              supabaseServiceKey,
            );
            results[results.length - 1].notifications = {
              inApp: inApp.detail ?? inApp,
              push: { queued: true, job_id: pushJob.jobId },
            };
          } catch (notifErr) {
            console.error(`Notifications failed for ${battle.id}:`, notifErr);
          }

        } else {
          // No winner or no votes
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

    return new Response(
      JSON.stringify({ message: "Battle resolution complete", results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in resolve-arena-battle:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
