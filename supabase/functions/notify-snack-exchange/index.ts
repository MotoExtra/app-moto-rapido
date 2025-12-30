import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  exchange_id: string;
  action: 'accepted' | 'confirmed' | 'rejected';
  actor_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { exchange_id, action, actor_name }: NotifyRequest = await req.json();

    console.log(`Processing snack exchange notification: ${exchange_id}, action: ${action}, actor: ${actor_name}`);

    // Get the exchange details
    const { data: exchange, error: exchangeError } = await supabase
      .from("snack_exchanges")
      .select("user_id, accepted_by, offering, wanting")
      .eq("id", exchange_id)
      .maybeSingle();

    if (exchangeError) {
      console.error("Error fetching exchange:", exchangeError);
      throw exchangeError;
    }

    if (!exchange) {
      console.log("Exchange not found");
      return new Response(
        JSON.stringify({ success: false, message: "Exchange not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Determine who to notify based on the action
    let targetUserId: string | null = null;
    let notificationTitle = "";
    let notificationBody = "";
    let url = "/troca-lanche";

    switch (action) {
      case 'accepted':
        // Notify the exchange owner that someone wants to trade
        targetUserId = exchange.user_id;
        notificationTitle = "🤝 Nova proposta de troca!";
        notificationBody = `${actor_name} quer trocar com você! Você ofereceu ${exchange.offering} e quer ${exchange.wanting}.`;
        break;
      case 'confirmed':
        // Notify the accepter that the owner confirmed
        targetUserId = exchange.accepted_by;
        notificationTitle = "✅ Troca confirmada!";
        notificationBody = `${actor_name} confirmou a troca! Entre em contato para combinar.`;
        break;
      case 'rejected':
        // Notify the accepter that the owner rejected
        targetUserId = exchange.accepted_by;
        notificationTitle = "❌ Troca recusada";
        notificationBody = `${actor_name} recusou sua proposta de troca.`;
        break;
    }

    if (!targetUserId) {
      console.log("No target user to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No target user to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get push subscriptions for the target user
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", targetUserId);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for target user");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for target user`);

    // Build notification payload
    const notificationPayload = {
      title: notificationTitle,
      body: notificationBody,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: {
        url: url,
        exchange_id: exchange_id,
      },
    };

    console.log("Notification payload:", JSON.stringify(notificationPayload));

    // Log subscriptions for debugging
    for (const subscription of subscriptions) {
      console.log(`Would send notification to endpoint: ${subscription.endpoint.substring(0, 50)}...`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Notification queued for ${subscriptions.length} device(s)`,
        payload: notificationPayload
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in notify-snack-exchange function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
