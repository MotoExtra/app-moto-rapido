import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, Check, X, Handshake } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface SnackExchange {
  id: string;
  user_id: string;
  offering: string;
  wanting: string;
  description?: string;
  city: string;
  phone: string;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_by?: string | null;
  accepted_at?: string | null;
  confirmed_at?: string | null;
  profiles?: {
    name: string;
  };
  accepter_profile?: {
    name: string;
  };
}

interface SnackChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exchange: SnackExchange;
  currentUserId: string;
  onStatusChange?: () => void;
}

export function SnackChatModal({
  open,
  onOpenChange,
  exchange,
  currentUserId,
  onStatusChange,
}: SnackChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentExchange, setCurrentExchange] = useState<SnackExchange>(exchange);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isOwner = currentUserId === currentExchange.user_id;
  const isAccepter = currentUserId === currentExchange.accepted_by;
  const isPending = currentExchange.status === 'pending';
  const isConfirmed = currentExchange.status === 'confirmed';
  const isAvailable = currentExchange.status === 'available';

  // Determine the other user's name
  const otherUserName = isOwner 
    ? currentExchange.accepter_profile?.name || 'Interessado'
    : currentExchange.profiles?.name || 'Motoboy';

  useEffect(() => {
    if (!open || !exchange.id) return;

    setCurrentExchange(exchange);
    loadMessages();
    loadExchangeDetails();

    const messageChannel = supabase
      .channel(`snack_chat_${exchange.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'snack_chat_messages',
          filter: `exchange_id=eq.${exchange.id}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    const exchangeChannel = supabase
      .channel(`snack_exchange_${exchange.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'snack_exchanges',
          filter: `id=eq.${exchange.id}`,
        },
        (payload) => {
          setCurrentExchange(prev => ({ ...prev, ...payload.new }));
          onStatusChange?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(exchangeChannel);
    };
  }, [open, exchange.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadExchangeDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('snack_exchanges')
        .select('*')
        .eq('id', exchange.id)
        .single();

      if (error) throw error;

      // Load accepter profile if exists
      if (data.accepted_by) {
        const { data: accepterProfile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', data.accepted_by)
          .single();

        setCurrentExchange({
          ...exchange,
          ...data,
          accepter_profile: accepterProfile ? { name: accepterProfile.name } : undefined
        });
      } else {
        setCurrentExchange({ ...exchange, ...data });
      }
    } catch (error) {
      console.error('Error loading exchange details:', error);
    }
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('snack_chat_messages' as any)
        .select('*')
        .eq('exchange_id', exchange.id)
        .order('created_at', { ascending: true }) as any);

      if (error) throw error;
      setMessages((data as Message[]) || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await (supabase.from('snack_chat_messages' as any).insert({
        exchange_id: exchange.id,
        sender_id: currentUserId,
        message: newMessage.trim(),
      }) as any);

      if (error) throw error;
      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const sendNotification = async (action: 'accepted' | 'confirmed' | 'rejected', actorName: string) => {
    try {
      await supabase.functions.invoke('notify-snack-exchange', {
        body: {
          exchange_id: exchange.id,
          action,
          actor_name: actorName,
        },
      });
      console.log(`Notification sent for action: ${action}`);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const getCurrentUserName = async (): Promise<string> => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', currentUserId)
        .single();
      return data?.name || 'Motoboy';
    } catch {
      return 'Motoboy';
    }
  };

  const handleAccept = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('snack_exchanges')
        .update({
          status: 'pending',
          accepted_by: currentUserId,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', exchange.id);

      if (error) throw error;
      
      // Send notification to the owner
      const actorName = await getCurrentUserName();
      await sendNotification('accepted', actorName);
      
      toast.success('Proposta de troca enviada! Aguarde a confirmação.');
      loadExchangeDetails();
      onStatusChange?.();
    } catch (error) {
      console.error('Error accepting exchange:', error);
      toast.error('Erro ao aceitar troca');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('snack_exchanges')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', exchange.id);

      if (error) throw error;
      
      // Send notification to the accepter
      const actorName = await getCurrentUserName();
      await sendNotification('confirmed', actorName);
      
      toast.success('Troca confirmada com sucesso!');
      loadExchangeDetails();
      onStatusChange?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error confirming exchange:', error);
      toast.error('Erro ao confirmar troca');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      // Send notification before clearing accepted_by
      const actorName = await getCurrentUserName();
      await sendNotification('rejected', actorName);

      const { error } = await supabase
        .from('snack_exchanges')
        .update({
          status: 'available',
          accepted_by: null,
          accepted_at: null,
        })
        .eq('id', exchange.id);

      if (error) throw error;
      
      toast.info('Proposta recusada');
      loadExchangeDetails();
      onStatusChange?.();
    } catch (error) {
      console.error('Error rejecting exchange:', error);
      toast.error('Erro ao recusar troca');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (isConfirmed) {
      return (
        <div className="flex items-center gap-1 text-xs bg-green-500/20 text-green-600 px-2 py-1 rounded-full">
          <Check className="w-3 h-3" />
          Confirmada
        </div>
      );
    }
    if (isPending) {
      return (
        <div className="flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          Aguardando confirmação
        </div>
      );
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              💬 Chat com {otherUserName}
            </div>
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        {/* Exchange Info */}
        <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-green-500">🟢</span>
            <span><strong>Tenho:</strong> {currentExchange.offering}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-blue-500">🔵</span>
            <span><strong>Quero:</strong> {currentExchange.wanting}</span>
          </div>
        </div>

        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">Nenhuma mensagem ainda</p>
              <p className="text-xs mt-1">Inicie a conversa!</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isMe
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatDistanceToNow(new Date(msg.created_at), {
                          locale: ptBR,
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Action Buttons */}
        {!isConfirmed && (
          <div className="border-t pt-3 space-y-2">
            {/* Not owner, not accepted yet - can accept */}
            {!isOwner && isAvailable && (
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Handshake className="w-4 h-4 mr-2" />
                )}
                Aceitar Troca
              </Button>
            )}

            {/* Is owner, has pending acceptance - can confirm or reject */}
            {isOwner && isPending && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleReject}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <X className="w-4 h-4 mr-2" />
                  )}
                  Recusar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={handleConfirm}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Confirmar
                </Button>
              </div>
            )}

            {/* Is accepter, pending - waiting for confirmation */}
            {isAccepter && isPending && (
              <div className="text-center text-sm text-muted-foreground bg-muted/50 rounded-lg py-3">
                ⏳ Aguardando confirmação do dono da oferta
              </div>
            )}
          </div>
        )}

        {/* Confirmed message */}
        {isConfirmed && (
          <div className="text-center text-sm bg-green-500/10 text-green-600 rounded-lg py-3">
            ✅ Troca confirmada! Combinem a entrega pelo chat.
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            disabled={sending}
          />
          <Button type="submit" size="icon" disabled={sending || !newMessage.trim()}>
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
