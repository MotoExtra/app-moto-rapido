import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Phone, MessageCircle } from "lucide-react";
import { useChatMessages } from "@/hooks/useChatMessages";
import { ChatBubble } from "@/components/ChatBubble";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";

interface ChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offerId: string;
  userId: string;
  senderType: "restaurant" | "motoboy";
  contactName: string;
  contactAvatarUrl?: string | null;
  contactPhone?: string | null;
  contactRating?: number | null;
}

export function ChatModal({
  open,
  onOpenChange,
  offerId,
  userId,
  senderType,
  contactName,
  contactAvatarUrl,
  contactPhone,
  contactRating,
}: ChatModalProps) {
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playNewMessage } = useNotificationSound();

  const {
    messages,
    loading,
    sending,
    sendMessage,
    markAsRead,
  } = useChatMessages({
    offerId: open ? offerId : null,
    userId,
    senderType,
    onNewMessage: playNewMessage,
  });

  const { isContactTyping, broadcastTyping } = useTypingIndicator({
    offerId: open ? offerId : null,
    userId,
    contactName,
  });

  // Mark messages as read when modal opens
  useEffect(() => {
    if (open) {
      markAsRead();
      inputRef.current?.focus();
    }
  }, [open, markAsRead]);

  // Scroll to bottom when new messages arrive or typing indicator appears
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isContactTyping]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (e.target.value.trim()) {
      broadcastTyping();
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;
    
    const text = inputValue;
    setInputValue("");
    
    const success = await sendMessage(text);
    if (!success) {
      setInputValue(text); // Restore on failure
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md h-[85vh] max-h-[600px] p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary-foreground/20">
              <AvatarImage src={contactAvatarUrl || undefined} />
              <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground font-semibold">
                {contactName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold text-primary-foreground truncate">
                {contactName}
              </DialogTitle>
              <div className="flex items-center gap-2">
                {contactRating && (
                  <Badge variant="secondary" className="text-xs bg-primary-foreground/20 text-primary-foreground border-0">
                    ⭐ {contactRating}
                  </Badge>
                )}
                {isContactTyping ? (
                  <span className="text-xs text-primary-foreground/90 animate-pulse">
                    digitando...
                  </span>
                ) : (
                  <span className="text-xs text-primary-foreground/70">
                    {senderType === "restaurant" ? "Motoboy" : "Restaurante"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Action buttons below header */}
        {contactPhone && (
          <div className="px-4 pb-3 -mt-1">
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => window.open(`tel:${contactPhone}`, "_blank")}
            >
              <Phone className="w-4 h-4 mr-2" />
              Ligar para {senderType === "restaurant" ? "motoboy" : "restaurante"}
            </Button>
          </div>
        )}

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhuma mensagem ainda
              </p>
              <p className="text-xs text-muted-foreground/70">
                Comece a conversa!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg) => (
                <ChatBubble
                  key={msg.id}
                  message={msg.message}
                  timestamp={msg.created_at}
                  isOwn={msg.sender_id === userId}
                  isRead={!!msg.read_at}
                />
              ))}
              {/* Typing indicator bubble */}
              {isContactTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-2">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-3 border-t bg-background">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              placeholder="Digite sua mensagem..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={sending}
              className="flex-1"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              className="shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
