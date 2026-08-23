import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enqueueArenaResolveJob } from "./backgroundJobs.ts";
import { battleHasPayoutRows } from "./arenaResolveIdempotency.ts";

export type ArenaBattleRow = {
  id: string;
  title: string;
  description: string | null;
  side_a_name: string;
  side_b_name: string;
  side_c_name: string | null;
  ends_at: string;
  category: string | null;
  resolution_source: string | null;
};

export type AIOutcomeResponse = {
  winner: "a" | "b" | "c" | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  source: string;
};

export type AutoResolveBattleResult = {
  battleId: string;
  battle: string;
  status:
    | "already_resolved"
    | "needs_manual_review"
    | "ai_suggestion_only"
    | "resolve_queued"
    | "error";
  winner?: string | null;
  confidence?: string;
  reasoning?: string;
  job_id?: string | null;
  error?: string;
};

async function getAIOutcomeVerification(
  battle: ArenaBattleRow,
  apiKey: string,
): Promise<AIOutcomeResponse> {
  const hasSideC = !!battle.side_c_name;

  const systemPrompt = `You are an expert fact-checker and outcome verifier for prediction markets. Your job is to determine the outcome of prediction events based on real-world data.

CRITICAL RULES:
1. You MUST determine a winner - side 'a', side 'b'${hasSideC ? ", or side 'c' (often Draw/Tie)" : ""}. Only return null if the event is genuinely unresolvable.
2. Base your decision on factual, verifiable information.
3. For price predictions (crypto, stocks), check if the price target was hit during the specified timeframe.
4. For sports predictions, check the actual game results. If the match ended in a draw/tie and there's a Side C for Draw, pick 'c'.
5. For political/event predictions, verify what actually happened.
6. Be decisive - markets need clear resolution.

Response format (JSON only):
{
  "winner": "a" or "b"${hasSideC ? ' or "c"' : ""} or null,
  "confidence": "high" or "medium" or "low",
  "reasoning": "Brief explanation of why this side won",
  "source": "What data/source you used to verify"
}`;

  const userPrompt = `Determine the outcome of this prediction market:

**Prediction Title:** ${battle.title}
**Description:** ${battle.description || "No additional description"}

**Side A:** ${battle.side_a_name}
**Side B:** ${battle.side_b_name}${hasSideC ? `\n**Side C (Draw/Tie):** ${battle.side_c_name}` : ""}

**Category:** ${battle.category || "General"}
**Battle End Time:** ${battle.ends_at}

Based on real-world events and data, which side won this prediction? The battle has ended, so you must determine the outcome based on what actually happened.
${hasSideC ? "\nIMPORTANT: If the event ended in a draw/tie, choose side 'c'." : ""}

Return ONLY a JSON object with your verdict.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 429) throw new Error("Rate limit exceeded - try again later");
    if (response.status === 402) throw new Error("AI credits exhausted - please add funds");
    throw new Error(`AI Gateway error: ${response.status} ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No response from AI");

  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  try {
    const parsed = JSON.parse(jsonStr);
    const winnerVal = parsed.winner;
    return {
      winner: winnerVal === "a" || winnerVal === "b" || winnerVal === "c" ? winnerVal : null,
      confidence: parsed.confidence || "medium",
      reasoning: parsed.reasoning || "AI-determined outcome",
      source: parsed.source || "AI analysis",
    };
  } catch {
    return {
      winner: null,
      confidence: "low",
      reasoning: "Could not parse AI outcome — manual review required",
      source: "AI parse failure",
    };
  }
}

export async function runArenaAutoResolveForBattle(
  supabase: SupabaseClient,
  battleId: string,
  supabaseUrl: string,
  serviceKey: string,
  openAiApiKey: string,
): Promise<AutoResolveBattleResult> {
  const { data: battle, error } = await supabase
    .from("arena_battles")
    .select("id, title, description, side_a_name, side_b_name, side_c_name, ends_at, category, resolution_source, winner_side")
    .eq("id", battleId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!battle) throw new Error("Battle not found");
  if (battle.winner_side) {
    return {
      battleId,
      battle: battle.title,
      status: "already_resolved",
    };
  }

  if (await battleHasPayoutRows(supabase, battleId)) {
    return {
      battleId,
      battle: battle.title,
      status: "already_resolved",
    };
  }

  const outcome = await getAIOutcomeVerification(battle as ArenaBattleRow, openAiApiKey);

  if (!outcome.winner || outcome.confidence !== "high") {
    await supabase.from("arena_battles").update({
      resolution_source: `AI Review Required (${outcome.confidence}): ${outcome.reasoning}`,
    }).eq("id", battleId);

    return {
      battleId,
      battle: battle.title,
      status: "needs_manual_review",
      winner: outcome.winner,
      confidence: outcome.confidence,
      reasoning: outcome.reasoning,
    };
  }

  const allowAiAutoPay = Deno.env.get("ALLOW_AI_AUTO_PAY") === "true";
  if (!allowAiAutoPay) {
    await supabase.from("arena_battles").update({
      resolution_source: `AI Suggestion (${outcome.confidence}): ${outcome.reasoning} [awaiting admin confirm]`,
    }).eq("id", battleId);

    return {
      battleId,
      battle: battle.title,
      status: "ai_suggestion_only",
      winner: outcome.winner,
      confidence: outcome.confidence,
      reasoning: outcome.reasoning,
    };
  }

  await supabase.from("arena_battles").update({
    resolution_source: `AI Verified (${outcome.confidence}): ${outcome.reasoning}`,
  }).eq("id", battleId);

  const queued = await enqueueArenaResolveJob(
    supabase,
    {
      battle_id: battleId,
      winner_side: outcome.winner,
    },
    supabaseUrl,
    serviceKey,
  );

  if (queued.error) throw new Error(queued.error);

  return {
    battleId,
    battle: battle.title,
    status: "resolve_queued",
    winner: outcome.winner,
    confidence: outcome.confidence,
    reasoning: outcome.reasoning,
    job_id: queued.jobId,
  };
}

export async function listBattlesNeedingAutoResolve(
  supabase: SupabaseClient,
): Promise<ArenaBattleRow[]> {
  const endedBefore = new Date().toISOString();

  const [activeEnded, stuckLocked] = await Promise.all([
    supabase
      .from("arena_battles")
      .select("id, title, description, side_a_name, side_b_name, side_c_name, ends_at, category, resolution_source")
      .eq("is_active", true)
      .lt("ends_at", endedBefore)
      .is("winner_side", null),
    supabase
      .from("arena_battles")
      .select("id, title, description, side_a_name, side_b_name, side_c_name, ends_at, category, resolution_source")
      .eq("is_active", false)
      .lt("ends_at", endedBefore)
      .is("winner_side", null),
  ]);

  if (activeEnded.error) throw new Error(activeEnded.error.message);
  if (stuckLocked.error) throw new Error(stuckLocked.error.message);

  const battleMap = new Map<string, ArenaBattleRow>();
  for (const row of [...(activeEnded.data ?? []), ...(stuckLocked.data ?? [])]) {
    battleMap.set(row.id, row as ArenaBattleRow);
  }
  return [...battleMap.values()];
}
