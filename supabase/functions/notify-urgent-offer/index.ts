import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotifyRequest {
  offer_id: string;
  restaurant_name: string;
  time_start: string;
  time_end: string;
  city: string;
  offer_date?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { offer_id, restaurant_name, time_start, time_end, city, offer_date }: NotifyRequest = await req.json();

    console.log(`Notificando extra urgente: ${restaurant_name} em ${city}`);

    // Get motoboys interested in this city
    let targetUserIds: string[] = [];

    if (city) {
      const { data: cityPrefs, error: prefError } = await supabase
        .from("motoboy_city_preferences")
        .select("user_id")
        .eq("city", city);

      if (prefError) {
        console.error("Erro ao buscar preferências de cidade:", prefError);
      } else if (cityPrefs && cityPrefs.length > 0) {
        targetUserIds = cityPrefs.map(p => p.user_id);
        console.log(`Encontrados ${targetUserIds.length} motoboys interessados em ${city}`);
      } else {
        console.log(`Nenhum motoboy interessado em ${city}`);
        return new Response(
          JSON.stringify({ message: "Nenhum motoboy interessado nessa cidade", sent: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch push subscriptions filtered by city preferences
    let query = supabase.from("push_subscriptions").select("*");
    if (targetUserIds.length > 0) {
      query = query.in("user_id", targetUserIds);
    }

    const { data: subscriptions, error: subError } = await query;

    if (subError) {
      console.error("Erro ao buscar subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("Nenhuma subscription encontrada");
      return new Response(
        JSON.stringify({ message: "Nenhum motoboy para notificar", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Encontradas ${subscriptions.length} subscriptions para notificar`);

    const offerDateStr = offer_date
      ? new Date(offer_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      : "hoje";

    let sent = 0;
    let failed = 0;
    const failedSubscriptions: string[] = [];

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
          console.log(`Push urgente enviado para user_id: ${sub.user_id}`);
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

    // Clean up expired subscriptions
    if (failedSubscriptions.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", failedSubscriptions);
      console.log(`Removidas ${failedSubscriptions.length} subscriptions inválidas`);
    }

    console.log(`Notificações urgentes: ${sent} enviadas, ${failed} falharam`);

    return new Response(
      JSON.stringify({
        message: "Notificações urgentes enviadas",
        sent,
        failed,
        removed: failedSubscriptions.length,
        city: city || "todas",
        notification: {
          restaurant: restaurant_name,
          time: `${time_start} - ${time_end}`,
          urgent: true,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Erro na função notify-urgent-offer:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
