import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Star, BookOpen, TrendingUp, Medal } from "lucide-react";
import { toast } from "sonner";

interface LeaderboardEntry {
  id: string;
  full_name: string;
  avatar_initials: string;
  total_sessions: number;
  average_rating: number;
  total_reviews: number;
  skills_to_teach: string[];
  satisfaction_score: number;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [sortBy, setSortBy] = useState<"satisfaction" | "sessions" | "rating">("satisfaction");

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);

      // Fetch all completed sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("teacher_id")
        .eq("status", "completed");

      if (sessionsError) throw sessionsError;

      // Fetch all reviews
      const { data: reviews, error: reviewsError } = await supabase
        .from("reviews")
        .select("reviewee_id, rating");

      if (reviewsError) throw reviewsError;

      // Fetch all profiles with completed profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, skills_to_teach")
        .eq("profile_completed", true);

      if (profilesError) throw profilesError;

      // Calculate stats for each teacher
      const teacherStats = new Map<string, LeaderboardEntry>();

      profiles?.forEach((profile) => {
        // Count sessions taught
        const sessionsCount = sessions?.filter((s) => s.teacher_id === profile.id).length || 0;

        // Calculate average rating
        const teacherReviews = reviews?.filter((r) => r.reviewee_id === profile.id) || [];
        const avgRating =
          teacherReviews.length > 0
            ? teacherReviews.reduce((sum, r) => sum + r.rating, 0) / teacherReviews.length
            : 0;

        // Calculate satisfaction score (weighted combination)
        // Formula: (avgRating * 0.5) + (sessionsCount * 0.3) + (reviewCount * 0.2)
        const satisfactionScore =
          avgRating * 10 + Math.min(sessionsCount * 2, 30) + Math.min(teacherReviews.length * 5, 20);

        if (sessionsCount > 0 || teacherReviews.length > 0) {
          teacherStats.set(profile.id, {
            id: profile.id,
            full_name: profile.full_name || "Anonymous",
            avatar_initials: (profile.full_name || "A")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2),
            total_sessions: sessionsCount,
            average_rating: avgRating,
            total_reviews: teacherReviews.length,
            skills_to_teach: profile.skills_to_teach || [],
            satisfaction_score: satisfactionScore,
          });
        }
      });

      setLeaderboard(Array.from(teacherStats.values()));
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getSortedLeaderboard = () => {
    const sorted = [...leaderboard];
    switch (sortBy) {
      case "sessions":
        return sorted.sort((a, b) => b.total_sessions - a.total_sessions);
      case "rating":
        return sorted.sort((a, b) => b.average_rating - a.average_rating);
      case "satisfaction":
      default:
        return sorted.sort((a, b) => b.satisfaction_score - a.satisfaction_score);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0)
      return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (index === 1)
      return <Medal className="h-6 w-6 text-gray-400" />;
    if (index === 2)
      return <Medal className="h-6 w-6 text-amber-600" />;
    return <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500 hover:bg-yellow-600">🏆 Champion</Badge>;
    if (index === 1) return <Badge className="bg-gray-400 hover:bg-gray-500">🥈 Elite</Badge>;
    if (index === 2) return <Badge className="bg-amber-600 hover:bg-amber-700">🥉 Expert</Badge>;
    if (index < 10) return <Badge variant="secondary">Top 10</Badge>;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 md:py-16 mt-16">
          <Skeleton className="h-12 w-64 mx-auto mb-8" />
          <div className="space-y-4 max-w-4xl mx-auto">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const sortedLeaderboard = getSortedLeaderboard();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16 mt-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-bold md:text-5xl">
                Teacher <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">Leaderboard</span>
              </h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Celebrating our top educators and their impact on the community
            </p>
          </div>

          <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)} className="mb-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="satisfaction" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Overall</span>
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span className="hidden sm:inline">Sessions</span>
              </TabsTrigger>
              <TabsTrigger value="rating" className="flex items-center gap-2">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Rating</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {sortedLeaderboard.length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No Teachers Yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to complete a session and earn your place on the leaderboard!
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedLeaderboard.map((entry, index) => (
                <Card
                  key={entry.id}
                  className={`p-6 transition-smooth hover:shadow-soft ${
                    index < 3 ? "border-2 border-primary/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 flex items-center justify-center w-16">
                      {getRankIcon(index)}
                    </div>

                    <Avatar 
                      className="h-16 w-16 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => navigate(`/profile/${entry.id}`)}
                    >
                      <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                        {entry.avatar_initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 
                            className="text-xl font-bold cursor-pointer hover:text-primary transition-colors"
                            onClick={() => navigate(`/profile/${entry.id}`)}
                          >
                            {entry.full_name}
                          </h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {getRankBadge(index)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                            <Star className="h-4 w-4" />
                            Rating
                          </div>
                          <div className="text-xl font-bold">
                            {entry.average_rating > 0 ? entry.average_rating.toFixed(1) : "N/A"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.total_reviews} {entry.total_reviews === 1 ? "review" : "reviews"}
                          </div>
                        </div>

                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                            <BookOpen className="h-4 w-4" />
                            Sessions
                          </div>
                          <div className="text-xl font-bold">{entry.total_sessions}</div>
                          <div className="text-xs text-muted-foreground">completed</div>
                        </div>

                        <div className="text-center p-2 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-1">
                            <TrendingUp className="h-4 w-4" />
                            Score
                          </div>
                          <div className="text-xl font-bold">
                            {entry.satisfaction_score.toFixed(0)}
                          </div>
                          <div className="text-xs text-muted-foreground">satisfaction</div>
                        </div>
                      </div>

                      {entry.skills_to_teach.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {entry.skills_to_teach.slice(0, 5).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {entry.skills_to_teach.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{entry.skills_to_teach.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Leaderboard;
