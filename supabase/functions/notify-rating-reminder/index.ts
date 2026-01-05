import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  offer_id: string;
  restaurant_name: string;
  motoboy_name?: string;
  target_user_id: string;
  target_type: "restaurant" | "motoboy";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { offer_id, restaurant_name, motoboy_name, target_user_id, target_type }: NotifyRequest = await req.json();

    console.log(`Notificando avaliação pendente para ${target_type}: ${target_user_id}`);

    // Busca subscriptions do usuário
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", target_user_id);

    if (subError) {
      console.error("Erro ao buscar subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("Nenhuma subscription encontrada para o usuário");
      return new Response(
        JSON.stringify({ message: "Usuário não possui notificações ativas", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Encontradas ${subscriptions.length} subscriptions para notificar`);

    // Define título e corpo com base no tipo de usuário
    const isRestaurant = target_type === "restaurant";
    const title = "⭐ Avalie o Extra!";
    const body = isRestaurant
      ? `Como foi o trabalho de ${motoboy_name || "seu motoboy"}? Deixe sua avaliação!`
      : `Como foi trabalhar no ${restaurant_name}? Deixe sua avaliação!`;
    const targetUrl = isRestaurant ? "/restaurant/home" : "/meus-extras";

    // Payload da notificação
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: `rating-reminder-${offer_id}`,
      renotify: false,
      requireInteraction: false,
      vibrate: [200, 100, 200],
      data: { 
        url: targetUrl,
        type: "rating_reminder",
        offer_id
      }
    });

    let sent = 0;
    let failed = 0;
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
          sent++;
          console.log(`Push de avaliação enviado para user_id: ${sub.user_id}`);
        } else if (response.status === 404 || response.status === 410) {
          failed++;
          failedSubscriptions.push(sub.id);
          console.log(`Subscription expirada para user_id: ${sub.user_id}`);
        } else {
          failed++;
          console.error(`Erro ${response.status} para ${sub.user_id}: ${await response.text()}`);
        }
      } catch (error) {
        failed++;
        console.error(`Erro ao enviar para ${sub.user_id}:`, error);
      }
    }

    // Remove subscriptions inválidas
    if (failedSubscriptions.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", failedSubscriptions);
      console.log(`Removidas ${failedSubscriptions.length} subscriptions inválidas`);
    }

    console.log(`Notificações de avaliação: ${sent} enviadas, ${failed} falharam`);

    return new Response(
      JSON.stringify({ 
        message: "Notificação de avaliação enviada",
        sent,
        failed,
        target_type,
        notification: notificationPayload
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função notify-rating-reminder:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
