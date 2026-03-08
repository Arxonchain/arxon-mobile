import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * FIXED Reward System (v2):
 * - Total Pool = Prize Pool (admin set) + All Stakes (winners + losers)
 * - Winners share the ENTIRE pool proportionally by (stake × earlyMultiplier)
 * - Streak bonus = % of NET PROFIT only (never inflates beyond pool)
 * - Hard cap: total distributed NEVER exceeds TOTAL_POOL
 * - Losers get NOTHING
 * - Battle marked resolved AFTER rewards distributed (atomic)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const manualWinner = body.winner_side;
    const battleId = body.battle_id;
    const forceResolve = body.force === true;

    console.log("Starting battle resolution...", { manualWinner, battleId, forceResolve });

    let battlesToResolve;

    if (battleId && manualWinner) {
      let query = supabase.from("arena_battles").select("*").eq("id", battleId);
      if (!forceResolve) {
        query = query.is("winner_side", null);
      }
      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(`Database error: ${error.message}`);
      if (!data) throw new Error("Battle not found or already resolved. Use force=true to re-resolve.");

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

        // Determine winner
        let winnerSide: string | null = null;
        if (battle.verified_winner) {
          winnerSide = battle.verified_winner;
        } else if (hasSideC) {
          if (sideAPower > sideBPower && sideAPower > sideCPower) winnerSide = "a";
          else if (sideBPower > sideAPower && sideBPower > sideCPower) winnerSide = "b";
          else if (sideCPower > sideAPower && sideCPower > sideBPower) winnerSide = "c";
          else if (sideAPower >= sideBPower && sideAPower >= sideCPower && sideAPower > 0) winnerSide = "a";
          else if (sideBPower > 0) winnerSide = "b";
          else if (sideCPower > 0) winnerSide = "c";
        } else {
          if (sideAPower > sideBPower) winnerSide = "a";
          else if (sideBPower > sideAPower) winnerSide = "b";
          else if (sideAPower > 0) winnerSide = "a";
        }

        const prizePool = Number(battle.prize_pool) || 0;
        const totalStakes = sideAPower + sideBPower + sideCPower;
        const TOTAL_POOL = prizePool + totalStakes;

        const winnerSideName = winnerSide === "a" ? battle.side_a_name :
                               winnerSide === "c" ? (battle.side_c_name || "Draw") :
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

        if (winnerSide && votes.length > 0) {
          // DEDUP: Check if rewards already exist
          const { count: existingRewards } = await supabase
            .from("arena_earnings")
            .select("id", { count: "exact", head: true })
            .eq("battle_id", battle.id);

          if ((existingRewards || 0) > 0) {
            console.log(`Battle ${battle.id} already has ${existingRewards} earnings. Skipping.`);
            await supabase.from("arena_battles").update({
              is_active: false,
              winner_side: winnerSide,
              outcome_verified: !!battle.verified_winner,
              outcome_verified_at: battle.verified_winner ? new Date().toISOString() : null,
            }).eq("id", battle.id);
            results.push({ battle: battle.title, battleId: battle.id, skipped: true, reason: "already_distributed" });
            continue;
          }

          const winningVotes = votes.filter(v => v.side === winnerSide);
          const losingVotes = votes.filter(v => v.side !== winnerSide);

          console.log(`Winners: ${winningVotes.length}, Losers: ${losingVotes.length}`);

          // ─── FIXED WEIGHT CALCULATION ───
          // Weight = stake × earlyMultiplier ONLY (no bonus_percentage multiplier)
          let totalWeight = 0;
          const winnerWeights: { vote: typeof winningVotes[0]; weight: number; earlyMultiplier: number }[] = [];

          for (const vote of winningVotes) {
            const earlyMultiplier = Number(vote.early_stake_multiplier) || 1.0;
            const weight = vote.power_spent * earlyMultiplier;
            winnerWeights.push({ vote, weight, earlyMultiplier });
            totalWeight += weight;
          }

          let totalRewardsDistributed = 0;

          // ─── DISTRIBUTE REWARDS TO WINNERS ───
          for (const { vote, weight } of winnerWeights) {
            try {
              // Get win streak
              const { data: memberData } = await supabase
                .from("arena_members")
                .select("current_win_streak, best_win_streak, total_wins")
                .eq("user_id", vote.user_id)
                .maybeSingle();

              const currentStreak = (memberData?.current_win_streak || 0) + 1;
              const bestStreak = Math.max(currentStreak, memberData?.best_win_streak || 0);

              // Streak bonus % (applied to NET PROFIT only)
              let streakBonusPercent = 0;
              if (currentStreak >= 10) streakBonusPercent = 100;
              else if (currentStreak >= 5) streakBonusPercent = 50;
              else if (currentStreak >= 3) streakBonusPercent = 25;

              // Base reward = proportional share of TOTAL_POOL
              const baseReward = totalWeight > 0 ? (weight / totalWeight) * TOTAL_POOL : 0;

              // Net profit = base reward minus original stake (can be 0 if pool is tiny)
              const netProfit = Math.max(0, baseReward - vote.power_spent);

              // Streak bonus applies ONLY to net profit
              const streakBonus = Math.floor(netProfit * (streakBonusPercent / 100));

              let totalReward = Math.floor(baseReward + streakBonus);

              // ─── HARD CAP: never exceed remaining pool ───
              const remainingPool = TOTAL_POOL - totalRewardsDistributed;
              if (totalReward > remainingPool) totalReward = Math.floor(remainingPool);
              if (totalReward < 0) totalReward = 0;
              totalRewardsDistributed += totalReward;

              console.log(`Winner ${vote.user_id}: Stake=${vote.power_spent}, Base=${Math.floor(baseReward)}, NetProfit=${Math.floor(netProfit)}, StreakBonus=${streakBonus}, Total=${totalReward}`);

              // Update member stats
              if (memberData) {
                await supabase.from("arena_members").update({
                  current_win_streak: currentStreak,
                  best_win_streak: bestStreak,
                  total_wins: (memberData.total_wins || 0) + 1,
                }).eq("user_id", vote.user_id);
              }

              // Record staking reward
              await supabase.from("arena_staking_rewards").insert({
                battle_id: battle.id,
                user_id: vote.user_id,
                original_stake: vote.power_spent,
                multiplier: vote.power_spent > 0 ? totalReward / vote.power_spent : 0,
                stake_return: 0,
                loser_pool_share: totalReward,
                total_reward: totalReward,
                is_winner: true,
              });

              // Record earnings
              await supabase.from("arena_earnings").insert({
                battle_id: battle.id,
                user_id: vote.user_id,
                stake_amount: vote.power_spent,
                bonus_earned: totalReward - vote.power_spent,
                pool_share_earned: totalReward,
                streak_bonus: streakBonus,
                total_earned: totalReward,
                is_winner: true,
              });

              // Credit points (500 cap per RPC call)
              let remainingReward = totalReward;
              while (remainingReward > 0) {
                const increment = Math.min(remainingReward, 500);
                await supabase.rpc("increment_user_points", {
                  p_user_id: vote.user_id,
                  p_amount: increment,
                  p_type: "mining",
                });
                remainingReward -= 500;
              }

              // Award winner badge
              const streakText = currentStreak >= 3 ? ` 🔥 ${currentStreak}-Win Streak!` : "";
              await supabase.from("user_badges").insert({
                user_id: vote.user_id,
                badge_type: "winner",
                badge_name: `${winnerSideName} Champion`,
                description: `Won ${totalReward} ARX-P in "${battle.title}"${streakText}`,
                battle_id: battle.id,
              });

              // Extended boost (7 days)
              const boostExpiry = new Date();
              boostExpiry.setDate(boostExpiry.getDate() + 7);
              await supabase.from("arena_boosts").upsert({
                user_id: vote.user_id,
                battle_id: battle.id,
                boost_percentage: 25,
                expires_at: boostExpiry.toISOString(),
              });

            } catch (winnerErr) {
              console.error(`Error processing winner ${vote.user_id}:`, winnerErr);
            }
          }

          // Process losers
          for (const vote of losingVotes) {
            try {
              await supabase.from("arena_members").update({ current_win_streak: 0 }).eq("user_id", vote.user_id);

              await supabase.from("arena_staking_rewards").insert({
                battle_id: battle.id, user_id: vote.user_id,
                original_stake: vote.power_spent, multiplier: 0,
                stake_return: 0, loser_pool_share: 0, total_reward: 0, is_winner: false,
              });

              await supabase.from("arena_earnings").insert({
                battle_id: battle.id, user_id: vote.user_id,
                stake_amount: vote.power_spent, bonus_earned: 0,
                pool_share_earned: 0, streak_bonus: 0, total_earned: 0, is_winner: false,
              });

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
