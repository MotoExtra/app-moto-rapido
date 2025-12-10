import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotifyRequest {
  restaurant_name: string;
  description: string;
  time_start: string;
  time_end: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { restaurant_name, description, time_start, time_end }: NotifyRequest = await req.json();

    console.log("Notificando novo extra de:", restaurant_name);

    // Busca todas as subscriptions de motoboys
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*");

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

    let sent = 0;
    let failed = 0;
    const failedSubscriptions: string[] = [];

    // Envia push para cada subscription usando fetch direto (simples, sem payload criptografado)
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
          console.log(`Push enviado para user_id: ${sub.user_id}`);
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

    console.log(`Notificações: ${sent} enviadas, ${failed} falharam`);

    return new Response(
      JSON.stringify({ 
        message: "Notificações enviadas",
        sent,
        failed,
        removed: failedSubscriptions.length,
        notification: {
          restaurant: restaurant_name,
          time: `${time_start} - ${time_end}`
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função notify-new-offer:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
