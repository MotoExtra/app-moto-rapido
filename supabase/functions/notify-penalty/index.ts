import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PenaltyPayload {
  user_id: string;
  penalty_type: "cancellation" | "delay";
  xp_amount: number;
  reason: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: PenaltyPayload = await req.json();
    const { user_id, penalty_type, xp_amount, reason } = payload;

    console.log("Enviando notificação de penalidade:", payload);

    if (!user_id || !penalty_type || !xp_amount) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar subscriptions do motoboy
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .eq("user_id", user_id);

    if (subError) {
      console.error("Erro ao buscar subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("Nenhuma subscription encontrada para o usuário:", user_id);
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "Sem subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Montar mensagem baseada no tipo de penalidade
    let title = "";
    let body = "";
    const icon = "/pwa-192x192.png";
    
    if (penalty_type === "cancellation") {
      title = "⚠️ Penalidade por Cancelamento";
      body = `Você perdeu ${xp_amount} XP. ${reason}`;
    } else if (penalty_type === "delay") {
      title = "⏰ Penalidade por Atraso";
      body = `Você perdeu ${xp_amount} XP. ${reason}`;
    }

    let sent = 0;
    const failedSubscriptions: string[] = [];

    // Enviar para cada subscription
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
          console.log(`Push de penalidade enviado para user_id: ${sub.user_id}`);
        } else if (response.status === 404 || response.status === 410) {
          failedSubscriptions.push(sub.id);
          console.log(`Subscription expirada para user_id: ${sub.user_id}`);
        } else {
          console.error(`Erro ${response.status} para ${sub.user_id}: ${await response.text()}`);
        }
      } catch (error) {
        console.error(`Erro ao enviar para ${sub.user_id}:`, error);
      }
    }

    // Limpar subscriptions expiradas
    if (failedSubscriptions.length > 0) {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", failedSubscriptions);

      if (deleteError) {
        console.error("Erro ao deletar subscriptions expiradas:", deleteError);
      } else {
        console.log(`${failedSubscriptions.length} subscriptions expiradas removidas`);
      }
    }

    console.log(`Notificações de penalidade enviadas: ${sent}/${subscriptions.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent, 
        total: subscriptions.length,
        title,
        body
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro na função notify-penalty:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
