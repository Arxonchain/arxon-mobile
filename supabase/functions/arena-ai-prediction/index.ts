import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openAiApiKey = Deno.env.get("OPENAI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const marketId = body.market_id;

    // Fetch the specific market or all live markets
    let markets;
    if (marketId) {
      const { data, error } = await supabase
        .from("arena_battles")
        .select("*")
        .eq("id", marketId)
        .single();
      
      if (error) throw error;
      markets = [data];
    } else {
      const { data, error } = await supabase
        .from("arena_battles")
        .select("*")
        .eq("is_active", true)
        .gt("ends_at", new Date().toISOString());
      
      if (error) throw error;
      markets = data || [];
    }

    const results = [];

    for (const market of markets) {
      const totalPool = market.side_a_power + market.side_b_power;
      const sideAPercent = totalPool > 0 ? (market.side_a_power / totalPool) * 100 : 50;
      const sideBPercent = totalPool > 0 ? (market.side_b_power / totalPool) * 100 : 50;
      
      const now = new Date();
      const endsAt = new Date(market.ends_at);
      const startsAt = new Date(market.starts_at);
      const totalDuration = endsAt.getTime() - startsAt.getTime();
      const elapsed = now.getTime() - startsAt.getTime();
      const timeProgress = Math.min(Math.max(elapsed / totalDuration, 0), 1);
      const hoursRemaining = Math.max(0, (endsAt.getTime() - now.getTime()) / (1000 * 60 * 60));

      const prompt = `You are an expert prediction market analyst. Analyze this prediction market and provide probability estimates.

MARKET DETAILS:
- Title: "${market.title}"
- Description: "${market.description || 'No description'}"
- Category: ${market.category}
- Side A: "${market.side_a_name}" - Current stake: ${market.side_a_power} ARX-P (${sideAPercent.toFixed(1)}% of pool)
- Side B: "${market.side_b_name}" - Current stake: ${market.side_b_power} ARX-P (${sideBPercent.toFixed(1)}% of pool)
- Total pool: ${totalPool} ARX-P
- Time progress: ${(timeProgress * 100).toFixed(0)}% through event
- Hours remaining: ${hoursRemaining.toFixed(1)} hours
- Total participants: ${market.total_participants || 0}

Based on the market title, stakes, and timing, provide:
1. Your estimated probability for Side A winning (0-100)
2. Your estimated probability for Side B winning (0-100)
3. Confidence level (low/moderate/high/very_high)
4. A brief 1-2 sentence prediction insight

Respond with ONLY a JSON object in this exact format:
{
  "side_a_probability": <number>,
  "side_b_probability": <number>,
  "confidence": "<string>",
  "prediction_text": "<string>"
}`;

      try {
        const aiResponse = await fetch(" https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
           "Authorization": `Bearer ${openAiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a prediction market analyst. Always respond with valid JSON only." },
              { role: "user", content: prompt }
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI request failed: ${aiResponse.status}`);
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        // Parse JSON from response
        let prediction;
        try {
          // Extract JSON from potential markdown code blocks
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            prediction = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found");
          }
        } catch (e) {
          console.error("Failed to parse AI response:", content);
          // Default to market sentiment
          prediction = {
            side_a_probability: sideAPercent,
            side_b_probability: sideBPercent,
            confidence: "low",
            prediction_text: "Analysis based on current market sentiment."
          };
        }

        // Update the market with AI predictions
        const { error: updateError } = await supabase
          .from("arena_battles")
          .update({
            ai_side_a_probability: prediction.side_a_probability,
            ai_side_b_probability: prediction.side_b_probability,
            ai_prediction_text: prediction.prediction_text,
            ai_confidence: prediction.confidence,
            ai_last_updated: new Date().toISOString(),
          })
          .eq("id", market.id);

        if (updateError) {
          console.error(`Failed to update market ${market.id}:`, updateError);
        }

        results.push({
          market_id: market.id,
          title: market.title,
          prediction,
          updated: true,
        });

      } catch (aiError) {
        console.error(`AI error for market ${market.id}:`, aiError);
        results.push({
          market_id: market.id,
          title: market.title,
          error: "AI prediction failed",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in arena-ai-prediction:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});