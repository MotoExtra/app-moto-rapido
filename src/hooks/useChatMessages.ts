import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  offer_id: string;
  sender_id: string;
  sender_type: "restaurant" | "motoboy";
  message: string;
  created_at: string;
  read_at: string | null;
}

interface UseChatMessagesOptions {
  offerId: string | null;
  userId: string | null;
  senderType: "restaurant" | "motoboy";
}

export function useChatMessages({ offerId, userId, senderType }: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!offerId) return;

    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("offer_id", offerId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setMessages((data as ChatMessage[]) || []);
      
      // Calculate unread count
      const unread = (data || []).filter(
        (m: ChatMessage) => m.sender_id !== userId && !m.read_at
      ).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error("Erro ao buscar mensagens:", error);
    } finally {
      setLoading(false);
    }
  }, [offerId, userId]);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    if (!offerId || !userId || !text.trim()) return false;

    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        offer_id: offerId,
        sender_id: userId,
        sender_type: senderType,
        message: text.trim(),
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      return false;
    } finally {
      setSending(false);
    }
  }, [offerId, userId, senderType]);

  // Mark messages as read
  const markAsRead = useCallback(async () => {
    if (!offerId || !userId) return;

    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("offer_id", offerId)
        .neq("sender_id", userId)
        .is("read_at", null);

      if (error) throw error;
      
      // Update local state
      setMessages(current =>
        current.map(m =>
          m.sender_id !== userId && !m.read_at
            ? { ...m, read_at: new Date().toISOString() }
            : m
        )
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Erro ao marcar como lido:", error);
    }
  }, [offerId, userId]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!offerId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`chat-${offerId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `offer_id=eq.${offerId}`,
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(current => [...current, newMessage]);
          
          // Increment unread if not from current user
          if (newMessage.sender_id !== userId) {
            setUnreadCount(c => c + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `offer_id=eq.${offerId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(current =>
            current.map(m => (m.id === updatedMessage.id ? updatedMessage : m))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [offerId, userId, fetchMessages]);

  return {
    messages,
    loading,
    sending,
    unreadCount,
    sendMessage,
    markAsRead,
    refetch: fetchMessages,
  };
}

// Hook to get unread count for multiple offers
export function useUnreadCounts(offerIds: string[], userId: string | null) {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!userId || offerIds.length === 0) return;

    const fetchUnreadCounts = async () => {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("offer_id")
          .in("offer_id", offerIds)
          .neq("sender_id", userId)
          .is("read_at", null);

        if (error) throw error;

        const counts: Record<string, number> = {};
        offerIds.forEach(id => { counts[id] = 0; });
        
        (data || []).forEach((m: { offer_id: string }) => {
          counts[m.offer_id] = (counts[m.offer_id] || 0) + 1;
        });

        setUnreadCounts(counts);
      } catch (error) {
        console.error("Erro ao buscar contagem de não lidos:", error);
      }
    };

    fetchUnreadCounts();

    // Subscribe to new messages
    const channel = supabase
      .channel("unread-counts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          const newMessage = payload.new as ChatMessage;
          if (offerIds.includes(newMessage.offer_id) && newMessage.sender_id !== userId) {
            setUnreadCounts(c => ({
              ...c,
              [newMessage.offer_id]: (c[newMessage.offer_id] || 0) + 1,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [offerIds.join(","), userId]);

  return unreadCounts;
}
