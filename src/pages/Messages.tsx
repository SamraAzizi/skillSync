import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Inbox } from "lucide-react";
import { toast } from "sonner";
import { ChatDialog } from "@/components/ChatDialog";

interface Conversation {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  last_message_at: string | null;
  other_user: {
    id: string;
    full_name: string;
  };
  unread_count: number;
  last_message: string | null;
}

const Messages = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>("");

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please sign in to view messages");
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const channel = supabase
      .channel("messages-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchConversations = async () => {
    try {
      setLoading(true);

      // Fetch conversations
      const { data: convData, error: convError } = await supabase
        .from("conversations")
        .select("*")
        .or(`participant_1_id.eq.${user?.id},participant_2_id.eq.${user?.id}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (convError) throw convError;

      // Fetch profiles for other participants
      const otherUserIds = (convData || []).map((conv) =>
        conv.participant_1_id === user?.id
          ? conv.participant_2_id
          : conv.participant_1_id
      );

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", otherUserIds);

      if (profilesError) throw profilesError;

      // Fetch last messages and unread counts
      const conversationsWithData = await Promise.all(
        (convData || []).map(async (conv) => {
          const otherUserId =
            conv.participant_1_id === user?.id
              ? conv.participant_2_id
              : conv.participant_1_id;

          const otherUser = profilesData?.find((p) => p.id === otherUserId);

          // Get last message
          const { data: lastMessageData } = await supabase
            .from("messages")
            .select("content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const { count } = await supabase
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("conversation_id", conv.id)
            .eq("read", false)
            .neq("sender_id", user?.id);

          return {
            ...conv,
            other_user: {
              id: otherUserId,
              full_name: otherUser?.full_name || "Unknown User",
            },
            unread_count: count || 0,
            last_message: lastMessageData?.content || null,
          };
        })
      );

      setConversations(conversationsWithData);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
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

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleConversationClick = (conv: Conversation) => {
    setSelectedConversation(conv.id);
    setSelectedUserId(conv.other_user.id);
    setSelectedUserName(conv.other_user.full_name);
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />

      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <MessageSquare className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Messages</h1>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <Inbox className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No messages yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start a conversation by messaging a teacher from their profile
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => (
                <Card
                  key={conv.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleConversationClick(conv)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(conv.other_user.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold truncate">
                            {conv.other_user.full_name}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(conv.last_message_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {conv.last_message || "No messages yet"}
                        </p>
                      </div>

                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="ml-2">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {selectedConversation && selectedUserId && (
        <ChatDialog
          open={!!selectedConversation}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedConversation(null);
              setSelectedUserId(null);
              setSelectedUserName("");
              fetchConversations();
            }
          }}
          conversationId={selectedConversation}
          otherUserId={selectedUserId}
          otherUserName={selectedUserName}
        />
      )}
    </div>
  );
};

export default Messages;