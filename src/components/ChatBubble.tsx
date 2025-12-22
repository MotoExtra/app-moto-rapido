import { cn } from "@/lib/utils";
import { Check, CheckCheck } from "lucide-react";

interface ChatBubbleProps {
  message: string;
  timestamp: string;
  isOwn: boolean;
  isRead?: boolean;
}

export function ChatBubble({ message, timestamp, isOwn, isRead }: ChatBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `há ${diffMins} min`;
    
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={cn(
        "flex flex-col max-w-[80%] animate-in fade-in slide-in-from-bottom-2 duration-200",
        isOwn ? "self-end items-end" : "self-start items-start"
      )}
    >
      <div
        className={cn(
          "px-3 py-2 rounded-2xl break-words",
          isOwn
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted text-foreground rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap">{message}</p>
      </div>
      <div className={cn(
        "flex items-center gap-1 mt-0.5 px-1",
        isOwn ? "flex-row-reverse" : "flex-row"
      )}>
        <span className="text-[10px] text-muted-foreground">
          {formatTime(timestamp)}
        </span>
        {isOwn && (
          isRead ? (
            <CheckCheck className="w-3 h-3 text-blue-500" />
          ) : (
            <Check className="w-3 h-3 text-muted-foreground" />
          )
        )}
      </div>
    </div>
  );
}
