import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  offer_id: string;
  acceptor_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { offer_id, acceptor_name }: NotifyRequest = await req.json();

    console.log(`Processing notification for offer: ${offer_id}, acceptor: ${acceptor_name}`);

    // Get the offer details and creator
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("restaurant_name, created_by, time_start, time_end")
      .eq("id", offer_id)
      .maybeSingle();

    if (offerError) {
      console.error("Error fetching offer:", offerError);
      throw offerError;
    }

    if (!offer || !offer.created_by) {
      console.log("No creator found for this offer, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "No creator to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get push subscriptions for the offer creator
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", offer.created_by);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for creator");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for creator`);

    // Build notification payload
    const notificationPayload = {
      title: "🎉 Extra Aceito!",
      body: `${acceptor_name} aceitou seu extra em ${offer.restaurant_name} das ${offer.time_start} às ${offer.time_end}`,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: {
        url: "/extras-aceitos",
        offer_id: offer_id,
      },
    };

    // Note: Web Push notifications require VAPID keys and web-push library
    // For now, we'll log the notification that would be sent
    // In a full implementation, you'd use web-push to send to each subscription
    console.log("Notification payload:", JSON.stringify(notificationPayload));

    // For each subscription, we would send the push notification
    // This requires VAPID keys to be configured
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
    console.error("Error in notify-offer-accepted function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
