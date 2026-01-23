import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVATION_WAIT_MINUTES = 15;

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Verificando motoboys pendentes de ativação...");

    const now = new Date();
    const activationThreshold = new Date(now.getTime() - ACTIVATION_WAIT_MINUTES * 60 * 1000);

    // Find motoboys created more than 15 minutes ago who haven't been notified yet
    // We'll use a simple approach: check profiles without a notification record
    const { data: pendingMotoboys, error: fetchError } = await supabase
      .from("profiles")
      .select("id, name, created_at")
      .eq("user_type", "motoboy")
      .eq("is_blocked", false)
      .lte("created_at", activationThreshold.toISOString());

    if (fetchError) {
      console.error("Erro ao buscar motoboys:", fetchError);
      throw fetchError;
    }

    console.log(`Encontrados ${pendingMotoboys?.length || 0} motoboys potenciais`);

    let notificationsSent = 0;

    for (const motoboy of pendingMotoboys || []) {
      // Check if we already sent an activation notification (using dedicated table)
      const { data: alreadySent } = await supabase
        .from("activation_notifications_sent")
        .select("id")
        .eq("user_id", motoboy.id)
        .maybeSingle();

      if (alreadySent) {
        continue; // Already notified
      }

      // Get push subscriptions for this user
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", motoboy.id);

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`Nenhuma subscription para ${motoboy.id}, pulando...`);
        // Still record that we "processed" this user
        await supabase.from("activation_notifications_sent").insert({
          user_id: motoboy.id,
        });
        continue;
      }

      const title = "🎉 Cadastro Aprovado!";
      const body = `Olá ${motoboy.name}! Seu cadastro foi aprovado. Você já pode acessar o app e aceitar extras!`;

      let anySent = false;
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
            console.log(`Push de ativação enviado para ${motoboy.id}`);
            anySent = true;
          } else if (response.status === 404 || response.status === 410) {
            failedSubscriptions.push(sub.id);
          }
        } catch (error) {
          console.error(`Erro ao enviar push para ${motoboy.id}:`, error);
        }
      }

      // Remove invalid subscriptions
      if (failedSubscriptions.length > 0) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .in("id", failedSubscriptions);
      }

      // Record that notification was sent (or attempted) using dedicated table
      await supabase.from("activation_notifications_sent").insert({
        user_id: motoboy.id,
      });

      if (anySent) {
        notificationsSent++;
      }
    }

    console.log(`Total de notificações de ativação enviadas: ${notificationsSent}`);

    return new Response(
      JSON.stringify({
        message: "Verificação de ativação concluída",
        notifications_sent: notificationsSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro na função notify-account-activated:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
