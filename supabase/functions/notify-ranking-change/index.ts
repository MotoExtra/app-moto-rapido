import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RankingChangeRequest {
  user_id: string;
  old_position: number;
  new_position: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { user_id, old_position, new_position }: RankingChangeRequest = await req.json();

    console.log(`Ranking change for user ${user_id}: ${old_position} -> ${new_position}`);

    // Only notify if position improved (lower number is better)
    if (new_position >= old_position) {
      console.log("Position did not improve, skipping notification");
      return new Response(
        JSON.stringify({ message: "Position did not improve", sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's push subscription
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) {
      console.error("Error fetching subscription:", subError);
      return new Response(
        JSON.stringify({ error: "Error fetching subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No subscription found for user");
      return new Response(
        JSON.stringify({ message: "No subscription found", sent: false }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const failedSubscriptions: string[] = [];

    // Determine the message based on new position
    let title = "🎉 Você subiu no ranking!";
    let body = `Parabéns! Você subiu da posição #${old_position} para #${new_position}!`;
    
    if (new_position === 1) {
      title = "🏆 VOCÊ É O #1!";
      body = "Incrível! Você está no topo do ranking semanal!";
    } else if (new_position <= 3) {
      title = "🥇 Top 3 do Ranking!";
      body = `Você está na posição #${new_position}! Continue assim para ganhar prêmios!`;
    }

    for (const sub of subscriptions) {
      try {
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "TTL": "86400",
            "Urgency": "high",
          },
        });

        if (response.ok || response.status === 201) {
          sent++;
          console.log(`Push sent to user_id: ${sub.user_id}`);
        } else if (response.status === 404 || response.status === 410) {
          failedSubscriptions.push(sub.id);
          console.log(`Expired subscription for user_id: ${sub.user_id}`);
        } else {
          console.error(`Error ${response.status} for ${sub.user_id}: ${await response.text()}`);
        }
      } catch (error) {
        console.error(`Error sending to ${sub.user_id}:`, error);
      }
    }

    // Clean up expired subscriptions
    if (failedSubscriptions.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", failedSubscriptions);
      console.log(`Removed ${failedSubscriptions.length} invalid subscriptions`);
    }

    console.log(`Notification sent: ${sent > 0}`);

    return new Response(
      JSON.stringify({ 
        message: sent > 0 ? "Notification sent" : "Failed to send",
        sent: sent > 0,
        title,
        body,
        old_position,
        new_position
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in notify-ranking-change:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
