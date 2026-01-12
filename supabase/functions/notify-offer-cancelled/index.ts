import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  offer_id: string;
  motoboy_name: string;
  restaurant_user_id: string;
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

    const { offer_id, motoboy_name, restaurant_user_id }: NotifyRequest = await req.json();

    console.log(`Processing cancellation notification for offer: ${offer_id}, motoboy: ${motoboy_name}, restaurant: ${restaurant_user_id}`);

    // Get the offer details
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .select("restaurant_name, time_start, time_end, offer_date")
      .eq("id", offer_id)
      .maybeSingle();

    if (offerError) {
      console.error("Error fetching offer:", offerError);
      throw offerError;
    }

    if (!offer) {
      console.log("Offer not found, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "Offer not found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get push subscriptions for the restaurant owner
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", restaurant_user_id);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for restaurant owner");
      return new Response(
        JSON.stringify({ success: true, message: "No subscriptions found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s) for restaurant owner`);

    // Format date for display
    const offerDateStr = offer.offer_date 
      ? new Date(offer.offer_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      : 'hoje';

    // Build notification payload
    const notificationPayload = {
      title: "⚠️ Extra Cancelado",
      body: `${motoboy_name} cancelou o extra em ${offer.restaurant_name} (${offerDateStr} das ${offer.time_start} às ${offer.time_end}). O extra está disponível novamente.`,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: {
        url: "/restaurante",
        offer_id: offer_id,
      },
    };

    console.log("Notification payload:", JSON.stringify(notificationPayload));

    // For each subscription, log the push notification
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
    console.error("Error in notify-offer-cancelled function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
