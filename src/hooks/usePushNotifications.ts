import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// VAPID Public Key - deve corresponder ao secret no backend
const VAPID_PUBLIC_KEY = "BEXziPhtf-Qm1zcSuJseAmFMtR1vl4LMhwOcTPn1KtU1kJQ45Vf6GyIPv1KaQjMxxeHc_9ygE8Y9Pt5RvxI2gV8";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verifica se o navegador suporta push notifications
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkExistingSubscription();
    }
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Erro ao verificar subscription:", error);
    }
  };

  const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      console.log("Service Worker registrado:", registration);
      return registration;
    } catch (error) {
      console.error("Erro ao registrar Service Worker:", error);
      return null;
    }
  };

  const saveSubscription = async (subscription: PushSubscription) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("Usuário não autenticado");
      return false;
    }

    const subscriptionJSON = subscription.toJSON();
    
    // Deleta subscriptions antigas do mesmo usuário
    await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id);

    // Salva nova subscription
    const { error } = await supabase
      .from("push_subscriptions")
      .insert({
        user_id: user.id,
        endpoint: subscriptionJSON.endpoint!,
        p256dh: subscriptionJSON.keys?.p256dh || "",
        auth: subscriptionJSON.keys?.auth || "",
      });

    if (error) {
      console.error("Erro ao salvar subscription:", error);
      return false;
    }

    console.log("Subscription salva com sucesso");
    return true;
  };

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta notificações push.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);

    try {
      // Solicita permissão
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        toast({
          title: "Permissão negada",
          description: "Você não receberá notificações de novos extras.",
          variant: "destructive",
        });
        return false;
      }

      // Registra service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error("Falha ao registrar service worker");
      }

      // Aguarda o service worker estar pronto
      await navigator.serviceWorker.ready;

      // Cria subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Salva no banco
      const saved = await saveSubscription(subscription);
      
      if (saved) {
        setIsSubscribed(true);
        toast({
          title: "Notificações ativadas!",
          description: "Você receberá alertas de novos extras.",
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Erro ao ativar notificações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar as notificações.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported, toast]);

  const unsubscribe = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", user.id);
        }
      }
      
      setIsSubscribed(false);
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais alertas de novos extras.",
      });
    } catch (error) {
      console.error("Erro ao desativar notificações:", error);
    }
  }, [toast]);

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    subscribe,
    unsubscribe,
  };
}
