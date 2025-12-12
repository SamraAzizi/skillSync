import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read: boolean;
}

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string | null;
  otherUserId: string;
  otherUserName: string;
}

export const ChatDialog = ({
  open,
  onOpenChange,
  conversationId,
  otherUserId,
  otherUserName,
}: ChatDialogProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && conversationId) {
      fetchMessages();
      markMessagesAsRead();
    }
  }, [open, conversationId]);

  useEffect(() => {
    if (!open || !conversationId) return;

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          
          // Mark as read if not sent by current user
          if (newMsg.sender_id !== user?.id) {
            setTimeout(() => markMessagesAsRead(), 100);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, conversationId, user?.id]);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!conversationId || !user) return;

    try {
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", conversationId)
        .eq("read", false)
        .neq("sender_id", user.id);
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || sending) return;

    try {
      setSending(true);

      let currentConversationId = conversationId;

      // Create conversation if it doesn't exist
      if (!currentConversationId) {
        const participant1 = user.id < otherUserId ? user.id : otherUserId;
        const participant2 = user.id < otherUserId ? otherUserId : user.id;

        const { data: existingConv, error: convCheckError } = await supabase
          .from("conversations")
          .select("id")
          .eq("participant_1_id", participant1)
          .eq("participant_2_id", participant2)
          .single();

        if (convCheckError && convCheckError.code !== "PGRST116") {
          throw convCheckError;
        }

        if (existingConv) {
          currentConversationId = existingConv.id;
        } else {
          const { data: newConv, error: createError } = await supabase
            .from("conversations")
            .insert({
              participant_1_id: participant1,
              participant_2_id: participant2,
            })
            .select()
            .single();

          if (createError) throw createError;
          currentConversationId = newConv.id;
        }
      }

      // Send message
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: currentConversationId,
        sender_id: user.id,
        content: newMessage.trim(),
      });

      if (messageError) throw messageError;

      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[600px] flex flex-col p-0">
        <DialogHeader className="border-b p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(otherUserName)}
              </AvatarFallback>
            </Avatar>
            <DialogTitle>{otherUserName}</DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwnMessage
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatMessageTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <form onSubmit={sendMessage} className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={sending}
              className="flex-1"
            />
            <Button type="submit" disabled={!newMessage.trim() || sending}>
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};