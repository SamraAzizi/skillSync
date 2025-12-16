import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ChatDialog } from "@/components/ChatDialog";
import { 
  Star, 
  BookOpen, 
  GraduationCap, 
  Calendar,
  Award,
  TrendingUp,
  ArrowLeft,
  MessageSquare
} from "lucide-react";

interface ProfileData {
  id: string;
  full_name: string;
  bio: string;
  skills_to_teach: string[];
  skills_to_learn: string[];
  availability: any;
  email: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_id: string;
  session_id: string;
  reviewer_name: string;
  skill: string;
}

interface Stats {
  avgRating: number;
  totalReviews: number;
  totalSessions: number;
  satisfactionScore: number;
}

const PublicProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats>({
    avgRating: 0,
    totalReviews: 0,
    totalSessions: 0,
    satisfactionScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchProfileData();
    }
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .eq("profile_completed", true)
        .single();

      if (profileError) throw profileError;
      if (!profileData) {
        toast.error("Profile not found");
        navigate("/");
        return;
      }

      setProfile(profileData);

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*, reviewer:profiles!reviews_reviewer_id_fkey(full_name), session:sessions!reviews_session_id_fkey(skill)")
        .eq("reviewee_id", userId)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;

      const formattedReviews = (reviewsData || []).map((review: any) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        created_at: review.created_at,
        reviewer_id: review.reviewer_id,
        session_id: review.session_id,
        reviewer_name: review.reviewer?.full_name || "Anonymous",
        skill: review.session?.skill || "Unknown",
      }));

      setReviews(formattedReviews);

      // Calculate stats
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("*")
        .eq("teacher_id", userId)
        .eq("status", "completed");

      const totalSessions = sessionsData?.length || 0;
      const totalReviews = formattedReviews.length;
      const avgRating = totalReviews > 0
        ? formattedReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;
      
      const satisfactionScore = totalReviews > 0 && totalSessions > 0
        ? ((avgRating / 5) * 0.6 + (totalSessions / 100) * 0.4) * 100
        : 0;

      setStats({
        avgRating,
        totalReviews,
        totalSessions,
        satisfactionScore: Math.min(satisfactionScore, 100),
      });
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted"
        }`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header Card */}
        <Card className="mb-8 overflow-hidden border-2">
          <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-accent/20"></div>
          <CardContent className="pt-0">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end -mt-16 md:-mt-12">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
                  {getInitials(profile.full_name || "User")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{profile.full_name}</h1>
                
                {/* Stats Row */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold text-lg">
                      {stats.avgRating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      ({stats.totalReviews} reviews)
                    </span>
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <span className="font-semibold">{stats.totalSessions}</span>
                    <span className="text-muted-foreground text-sm">sessions</span>
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">
                      {stats.satisfactionScore.toFixed(0)}%
                    </span>
                    <span className="text-muted-foreground text-sm">satisfaction</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    onClick={() => navigate(`/match?teacher=${userId}`)}
                    className="shadow-lg"
                  >
                    <Calendar className="mr-2 h-5 w-5" />
                    Book a Session
                  </Button>
                  
                  {user && user.id !== userId && (
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setChatOpen(true)}
                      className="shadow-lg"
                    >
                      <MessageSquare className="mr-2 h-5 w-5" />
                      Send Message
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Left Column - Bio & Skills */}
          <div className="md:col-span-2 space-y-6">
            {/* Bio */}
            {profile.bio && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    About
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {profile.bio}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Skills to Teach */}
            {profile.skills_to_teach && profile.skills_to_teach.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    Teaching Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills_to_teach.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="px-4 py-2 text-sm font-medium cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                        onClick={() => navigate(`/match?skill=${skill}`)}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills to Learn */}
            {profile.skills_to_learn && profile.skills_to_learn.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Learning Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills_to_learn.map((skill, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="px-4 py-2 text-sm"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Reviews ({reviews.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length > 0 ? (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b pb-4 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-semibold">{review.reviewer_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="secondary">{review.skill}</Badge>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          {renderStars(review.rating)}
                        </div>
                        {review.comment && (
                          <p className="text-muted-foreground leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No reviews yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Stats */}
          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-2">
              <CardHeader>
                <CardTitle className="text-center">Achievement Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {stats.avgRating.toFixed(1)}
                  </div>
                  <div className="text-sm text-muted-foreground">Average Rating</div>
                  <div className="flex justify-center mt-2">
                    {renderStars(Math.round(stats.avgRating))}
                  </div>
                </div>

                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {stats.totalSessions}
                  </div>
                  <div className="text-sm text-muted-foreground">Sessions Completed</div>
                </div>

                <div className="text-center p-4 bg-background/50 rounded-lg">
                  <div className="text-4xl font-bold text-primary mb-1">
                    {stats.satisfactionScore.toFixed(0)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Satisfaction Score</div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Card */}
            <Card>
              <CardHeader>
                <CardTitle>Get in Touch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/match?teacher=${userId}`)}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Session
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/skills")}
                >
                  <BookOpen className="mr-2 h-4 w-4" />
                  Browse Skills
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {chatOpen && userId && profile && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          conversationId={conversationId}
          otherUserId={userId}
          otherUserName={profile.full_name}
        />
      )}
    </div>
  );
};

export default PublicProfile;