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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { offer_id, motoboy_name, restaurant_user_id }: NotifyRequest = await req.json();

    console.log("Notificando chegada do motoboy:", motoboy_name, "para restaurante:", restaurant_user_id);

    // Busca subscriptions do restaurante
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", restaurant_user_id);

    if (subError) {
      console.error("Erro ao buscar subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("Nenhuma subscription encontrada para o restaurante");
      return new Response(
        JSON.stringify({ message: "Restaurante não possui notificações ativas", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Encontradas ${subscriptions.length} subscriptions para notificar`);

    // Payload da notificação com configuração para som alto
    const notificationPayload = JSON.stringify({
      title: "🏍️ MOTOBOY CHEGOU!",
      body: `${motoboy_name} chegou e está pronto para trabalhar!`,
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      tag: "motoboy-arrived",
      renotify: true,
      requireInteraction: true,
      vibrate: [500, 200, 500, 200, 500], // Vibração longa e intensa
      sound: "/notification-sound.mp3", // Som personalizado
      data: { 
        url: "/restaurant/home",
        type: "arrival",
        offer_id,
        motoboy_name
      }
    });

    let sent = 0;
    let failed = 0;
    const failedSubscriptions: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Envia push notification básica
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "TTL": "86400",
            "Urgency": "high",
          },
        });

        if (response.ok || response.status === 201) {
          sent++;
          console.log(`Push enviado para restaurante user_id: ${sub.user_id}`);
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

    console.log(`Notificações de chegada: ${sent} enviadas, ${failed} falharam`);

    return new Response(
      JSON.stringify({ 
        message: "Notificação de chegada enviada",
        sent,
        failed,
        motoboy_name,
        notification: notificationPayload
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função notify-motoboy-arrived:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
