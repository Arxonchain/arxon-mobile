import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * AI-Powered Battle Resolution System
 * 
 * This function:
 * 1. Detects battles that have ended
 * 2. Uses AI to research the actual outcome (e.g., did BTC hit $1M?)
 * 3. Determines the winner based on real-world data
 * 4. Calls the resolve-arena-battle function to distribute rewards
 */

interface Battle {
  id: string;
  title: string;
  description: string | null;
  side_a_name: string;
  side_b_name: string;
  side_c_name: string | null;
  ends_at: string;
  category: string | null;
  resolution_source: string | null;
}

interface AIOutcomeResponse {
  winner: 'a' | 'b' | 'c' | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  source: string;
}

async function getAIOutcomeVerification(battle: Battle, apiKey: string): Promise<AIOutcomeResponse> {
  // Determine if this is a 3-way market (has Side C / Draw option)
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
**Description:** ${battle.description || 'No additional description'}

**Side A:** ${battle.side_a_name}
**Side B:** ${battle.side_b_name}${hasSideC ? `\n**Side C (Draw/Tie):** ${battle.side_c_name}` : ""}

**Category:** ${battle.category || 'General'}
**Battle End Time:** ${battle.ends_at}

Based on real-world events and data, which side won this prediction? The battle has ended, so you must determine the outcome based on what actually happened.
${hasSideC ? "\nIMPORTANT: If the event ended in a draw/tie, choose side 'c'." : ""}

Return ONLY a JSON object with your verdict.`;

  console.log(`Querying AI for outcome of: ${battle.title}`);


  const response = await fetch(" https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1, // Low temperature for factual responses
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    
    if (response.status === 429) {
      throw new Error("Rate limit exceeded - try again later");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted - please add funds");
    }
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No response from AI");
  }

  console.log("AI Response:", content);

  // Parse JSON from response (handle markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const winnerVal = parsed.winner;
    return {
      winner: winnerVal === 'a' || winnerVal === 'b' || winnerVal === 'c' ? winnerVal : null,
      confidence: parsed.confidence || 'medium',
      reasoning: parsed.reasoning || 'AI-determined outcome',
      source: parsed.source || 'AI analysis',
    };
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    // Fallback: try to extract winner from text
    if (content.toLowerCase().includes('"winner": "a"') || content.toLowerCase().includes('side a wins')) {
      return { winner: 'a', confidence: 'low', reasoning: 'Extracted from AI response', source: 'AI fallback' };
    }
    if (content.toLowerCase().includes('"winner": "b"') || content.toLowerCase().includes('side b wins')) {
      return { winner: 'b', confidence: 'low', reasoning: 'Extracted from AI response', source: 'AI fallback' };
    }
    if (content.toLowerCase().includes('"winner": "c"') || content.toLowerCase().includes('side c wins') || content.toLowerCase().includes('draw')) {
      return { winner: 'c', confidence: 'low', reasoning: 'Extracted from AI response (draw)', source: 'AI fallback' };
    }
    throw new Error("Could not parse AI outcome");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    
   if (!openAiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Checking for ended battles to auto-resolve...");

    // Find battles that have ended but not yet resolved
    const { data: endedBattles, error: fetchError } = await supabase
      .from("arena_battles")
      .select("*")
      .eq("is_active", true)
      .lt("ends_at", new Date().toISOString())
      .is("winner_side", null);

    if (fetchError) {
      throw new Error(`Error fetching battles: ${fetchError.message}`);
    }

    if (!endedBattles || endedBattles.length === 0) {
      console.log("No battles need resolution");
      return new Response(
        JSON.stringify({ message: "No battles to resolve", resolved: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${endedBattles.length} battles to resolve`);

    const results = [];

    for (const battle of endedBattles) {
      console.log(`\n=== Processing: ${battle.title} ===`);

      try {
        // Get AI verdict on the outcome
        const outcome = await getAIOutcomeVerification(battle, openAiApiKey);
        
        console.log(`AI Verdict: ${outcome.winner} (${outcome.confidence} confidence)`);
        console.log(`Reasoning: ${outcome.reasoning}`);

        if (!outcome.winner) {
          console.log("AI could not determine winner - skipping for manual review");
          
          // Mark for manual review
          await supabase
            .from("arena_battles")
            .update({
              resolution_source: `AI Review Required: ${outcome.reasoning}`,
            })
            .eq("id", battle.id);

          results.push({
            battle: battle.title,
            status: "needs_manual_review",
            reason: outcome.reasoning,
          });
          continue;
        }

        // Update battle with AI resolution source
        await supabase
          .from("arena_battles")
          .update({
            resolution_source: `AI Verified (${outcome.confidence}): ${outcome.reasoning}`,
          })
          .eq("id", battle.id);

        // Call the resolve-arena-battle function to distribute rewards
        const resolveResponse = await fetch(`${supabaseUrl}/functions/v1/resolve-arena-battle`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            battle_id: battle.id,
            winner_side: outcome.winner,
          }),
        });

        const resolveResult = await resolveResponse.json();

        if (resolveResponse.ok) {
          console.log(`Successfully resolved: ${battle.title}`);
          results.push({
            battle: battle.title,
            status: "resolved",
            winner: outcome.winner,
            winnerName: outcome.winner === 'a' ? battle.side_a_name : battle.side_b_name,
            confidence: outcome.confidence,
            reasoning: outcome.reasoning,
            rewards: resolveResult,
          });
        } else {
          console.error(`Failed to resolve: ${resolveResult.error}`);
          results.push({
            battle: battle.title,
            status: "resolution_failed",
            error: resolveResult.error,
          });
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        console.error(`Error processing ${battle.title}: ${errorMsg}`);
        results.push({
          battle: battle.title,
          status: "error",
          error: errorMsg,
        });
      }

      // Small delay between battles to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const resolved = results.filter(r => r.status === "resolved").length;
    console.log(`\nResolution complete. Resolved: ${resolved}/${endedBattles.length}`);

    return new Response(
      JSON.stringify({
        message: "Auto-resolution complete",
        total: endedBattles.length,
        resolved,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in auto-resolve-battles:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
