import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    console.log("Verificando ofertas pendentes de avaliação...");

    // Get current time minus 3 minutes (rating prompt time)
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Find accepted offers that ended 3+ minutes ago and need rating
    const { data: completedOffers, error: offersError } = await supabase
      .from("offers")
      .select(`
        id,
        restaurant_name,
        time_end,
        offer_date,
        created_by,
        accepted_by
      `)
      .eq("is_accepted", true)
      .not("accepted_by", "is", null)
      .not("created_by", "is", null);

    if (offersError) {
      console.error("Erro ao buscar ofertas:", offersError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar ofertas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Encontradas ${completedOffers?.length || 0} ofertas aceitas`);

    let notificationsSent = 0;
    const processedOffers: string[] = [];

    for (const offer of completedOffers || []) {
      // Check if the offer has ended (3+ minutes ago)
      const offerDate = offer.offer_date || today;
      const [hours, minutes] = offer.time_end.split(':').map(Number);
      const endTime = new Date(`${offerDate}T${offer.time_end}:00`);
      endTime.setHours(hours, minutes, 0, 0);
      
      const promptTime = new Date(endTime.getTime() + 3 * 60 * 1000);
      
      if (now < promptTime) {
        continue; // Not time yet
      }

      // Check if restaurant has already rated this offer
      const { data: restaurantRating } = await supabase
        .from("ratings")
        .select("id")
        .eq("offer_id", offer.id)
        .eq("restaurant_id", offer.created_by)
        .eq("rating_type", "motoboy")
        .single();

      // Check if motoboy has already rated this offer
      const { data: motoboyRating } = await supabase
        .from("ratings")
        .select("id")
        .eq("offer_id", offer.id)
        .eq("motoboy_id", offer.accepted_by)
        .eq("rating_type", "restaurant")
        .single();

      // Get motoboy name
      const { data: motoboyProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", offer.accepted_by)
        .single();

      // Get restaurant info
      const { data: restaurantInfo } = await supabase
        .from("restaurants")
        .select("fantasy_name")
        .eq("id", offer.created_by)
        .single();

      // Send notification to restaurant if not rated
      if (!restaurantRating) {
        // Check if we already sent a notification (using a simple check table or timestamp)
        const { data: existingNotif } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", offer.created_by);

        if (existingNotif && existingNotif.length > 0) {
          // Send push to restaurant
          await sendPushNotification(supabase, {
            offer_id: offer.id,
            restaurant_name: restaurantInfo?.fantasy_name || offer.restaurant_name,
            motoboy_name: motoboyProfile?.name,
            target_user_id: offer.created_by,
            target_type: "restaurant",
          });
          notificationsSent++;
          processedOffers.push(`restaurant:${offer.id}`);
        }
      }

      // Send notification to motoboy if not rated
      if (!motoboyRating) {
        const { data: motoboySubscriptions } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", offer.accepted_by);

        if (motoboySubscriptions && motoboySubscriptions.length > 0) {
          // Send push to motoboy
          await sendPushNotification(supabase, {
            offer_id: offer.id,
            restaurant_name: restaurantInfo?.fantasy_name || offer.restaurant_name,
            target_user_id: offer.accepted_by,
            target_type: "motoboy",
          });
          notificationsSent++;
          processedOffers.push(`motoboy:${offer.id}`);
        }
      }
    }

    console.log(`Total de notificações enviadas: ${notificationsSent}`);

    return new Response(
      JSON.stringify({ 
        message: "Verificação concluída",
        notifications_sent: notificationsSent,
        processed: processedOffers,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função check-pending-ratings:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

interface NotifyParams {
  offer_id: string;
  restaurant_name: string;
  motoboy_name?: string;
  target_user_id: string;
  target_type: "restaurant" | "motoboy";
}

async function sendPushNotification(supabase: any, params: NotifyParams) {
  const { offer_id, restaurant_name, motoboy_name, target_user_id, target_type } = params;

  console.log(`Enviando push de avaliação para ${target_type}: ${target_user_id}`);

  // Get user subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", target_user_id);

  if (subError || !subscriptions || subscriptions.length === 0) {
    console.log(`Nenhuma subscription encontrada para ${target_user_id}`);
    return;
  }

  const isRestaurant = target_type === "restaurant";
  const title = "⭐ Avalie o Extra!";
  const body = isRestaurant
    ? `Como foi o trabalho de ${motoboy_name || "seu motoboy"}? Deixe sua avaliação!`
    : `Como foi trabalhar no ${restaurant_name}? Deixe sua avaliação!`;

  const failedSubscriptions: string[] = [];

  for (const sub of subscriptions) {
    try {
      const response = await fetch(sub.endpoint, {
        method: "POST",
        headers: {
          "TTL": "86400",
          "Urgency": "normal",
        },
      });

      if (response.ok || response.status === 201) {
        console.log(`Push enviado para ${target_type} ${sub.user_id}`);
      } else if (response.status === 404 || response.status === 410) {
        failedSubscriptions.push(sub.id);
      }
    } catch (error) {
      console.error(`Erro ao enviar push para ${sub.user_id}:`, error);
    }
  }

  // Remove invalid subscriptions
  if (failedSubscriptions.length > 0) {
    await supabase
      .from("push_subscriptions")
      .delete()
      .in("id", failedSubscriptions);
  }
}

serve(handler);
