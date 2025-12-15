import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Clock, BookOpen, Star, TrendingUp, Users, Calendar, Trophy } from "lucide-react";
import { toast } from "sonner";

interface Session {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  skill: string;
  status: string;
  teacher_id: string;
  learner_id: string;
  teacher_name?: string;
  learner_name?: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer_name?: string;
}

interface Stats {
  hoursTaught: number;
  hoursLearned: number;
  totalSessions: number;
  averageRating: number;
  skillsTaught: { name: string; hours: number }[];
  skillsLearned: { name: string; hours: number }[];
  sessionsOverTime: { month: string; taught: number; learned: number }[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<Stats>({
    hoursTaught: 0,
    hoursLearned: 0,
    totalSessions: 0,
    averageRating: 0,
    skillsTaught: [],
    skillsLearned: [],
    sessionsOverTime: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .or(`teacher_id.eq.${user?.id},learner_id.eq.${user?.id}`)
        .order("scheduled_at", { ascending: false });

      if (sessionsError) throw sessionsError;

      // Fetch profile names for sessions
      const teacherIds = [...new Set(sessionsData?.map(s => s.teacher_id) || [])];
      const learnerIds = [...new Set(sessionsData?.map(s => s.learner_id) || [])];
      const allIds = [...new Set([...teacherIds, ...learnerIds])];

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);

      const enrichedSessions = sessionsData?.map(session => ({
        ...session,
        teacher_name: profilesMap.get(session.teacher_id) || "Unknown",
        learner_name: profilesMap.get(session.learner_id) || "Unknown",
      })) || [];

      setSessions(enrichedSessions);

      // Fetch reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewee_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reviewsError) throw reviewsError;

      // Fetch reviewer names
      const reviewerIds = [...new Set(reviewsData?.map(r => r.reviewer_id) || [])];
      const { data: reviewerProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", reviewerIds);

      const reviewerMap = new Map(reviewerProfiles?.map(p => [p.id, p.full_name]) || []);

      const enrichedReviews = reviewsData?.map(review => ({
        ...review,
        reviewer_name: reviewerMap.get(review.reviewer_id) || "Anonymous",
      })) || [];

      setReviews(enrichedReviews);

      // Calculate stats
      calculateStats(enrichedSessions, enrichedReviews);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sessionsData: Session[], reviewsData: Review[]) => {
    const completed = sessionsData.filter(s => s.status === "completed");
    
    const taught = completed.filter(s => s.teacher_id === user?.id);
    const learned = completed.filter(s => s.learner_id === user?.id);

    const hoursTaught = taught.reduce((sum, s) => sum + s.duration_minutes / 60, 0);
    const hoursLearned = learned.reduce((sum, s) => sum + s.duration_minutes / 60, 0);

    // Skills breakdown
    const skillsTaughtMap = new Map<string, number>();
    taught.forEach(s => {
      const current = skillsTaughtMap.get(s.skill) || 0;
      skillsTaughtMap.set(s.skill, current + s.duration_minutes / 60);
    });

    const skillsLearnedMap = new Map<string, number>();
    learned.forEach(s => {
      const current = skillsLearnedMap.get(s.skill) || 0;
      skillsLearnedMap.set(s.skill, current + s.duration_minutes / 60);
    });

    const skillsTaught = Array.from(skillsTaughtMap.entries())
      .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    const skillsLearned = Array.from(skillsLearnedMap.entries())
      .map(([name, hours]) => ({ name, hours: Math.round(hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    // Sessions over time (last 6 months)
    const monthsMap = new Map<string, { taught: number; learned: number }>();
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      monthsMap.set(key, { taught: 0, learned: 0 });
    }

    completed.forEach(s => {
      const date = new Date(s.scheduled_at);
      const key = date.toLocaleDateString('en-US', { month: 'short' });
      const current = monthsMap.get(key);
      
      if (current) {
        if (s.teacher_id === user?.id) {
          current.taught++;
        } else {
          current.learned++;
        }
      }
    });

    const sessionsOverTime = Array.from(monthsMap.entries()).map(([month, data]) => ({
      month,
      ...data,
    }));

    // Average rating
    const avgRating = reviewsData.length > 0
      ? reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length
      : 0;

    setStats({
      hoursTaught: Math.round(hoursTaught * 10) / 10,
      hoursLearned: Math.round(hoursLearned * 10) / 10,
      totalSessions: completed.length,
      averageRating: Math.round(avgRating * 10) / 10,
      skillsTaught,
      skillsLearned,
      sessionsOverTime,
    });
  };

  const COLORS = ['hsl(16 90% 58%)', 'hsl(175 60% 45%)', 'hsl(280 60% 58%)', 'hsl(45 93% 58%)', 'hsl(142 76% 36%)'];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Learn & Teach Dashboard</h1>
            <p className="text-muted-foreground">Track your learning journey and teaching impact</p>
          </div>
          <Button 
            variant="outline" 
            className="shadow-card transition-smooth hover:shadow-soft"
            onClick={() => navigate("/leaderboard")}
          >
            <Trophy className="mr-2 h-4 w-4" />
            View Leaderboard
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Taught</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.hoursTaught}h</div>
              <p className="text-xs text-muted-foreground mt-1">Knowledge shared</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hours Learned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{stats.hoursLearned}h</div>
              <p className="text-xs text-muted-foreground mt-1">Skills acquired</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
              <p className="text-xs text-muted-foreground mt-1">Completed sessions</p>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                {stats.averageRating > 0 ? stats.averageRating : "N/A"}
                {stats.averageRating > 0 && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{reviews.length} reviews</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Sessions Over Time */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Sessions Over Time</CardTitle>
              <CardDescription>Your teaching and learning activity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.sessionsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="taught" stroke="hsl(16 90% 58%)" name="Taught" strokeWidth={2} />
                  <Line type="monotone" dataKey="learned" stroke="hsl(175 60% 45%)" name="Learned" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Skills Balance */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Knowledge Exchange</CardTitle>
              <CardDescription>Balance between teaching and learning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Teaching</span>
                    <span className="text-sm text-muted-foreground">{stats.hoursTaught}h</span>
                  </div>
                  <Progress value={(stats.hoursTaught / (stats.hoursTaught + stats.hoursLearned)) * 100 || 0} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Learning</span>
                    <span className="text-sm text-muted-foreground">{stats.hoursLearned}h</span>
                  </div>
                  <Progress value={(stats.hoursLearned / (stats.hoursTaught + stats.hoursLearned)) * 100 || 0} className="h-2" />
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {stats.hoursTaught > stats.hoursLearned
                      ? "You're sharing more knowledge! Consider learning new skills."
                      : stats.hoursLearned > stats.hoursTaught
                      ? "You're learning a lot! Share your expertise with others."
                      : "Perfect balance between teaching and learning!"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Skills Breakdown */}
        <Tabs defaultValue="taught" className="mb-8">
          <TabsList>
            <TabsTrigger value="taught">Skills I Teach</TabsTrigger>
            <TabsTrigger value="learned">Skills I Learn</TabsTrigger>
          </TabsList>

          <TabsContent value="taught">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Top Skills You Teach</CardTitle>
                <CardDescription>Your most shared expertise</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.skillsTaught.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.skillsTaught}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hours" fill="hsl(16 90% 58%)" name="Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No teaching sessions completed yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="learned">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Top Skills You Learn</CardTitle>
                <CardDescription>Areas of growth and development</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.skillsLearned.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.skillsLearned}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hours" fill="hsl(175 60% 45%)" name="Hours" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No learning sessions completed yet
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Recent Reviews */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
            <CardDescription>What others say about your teaching</CardDescription>
          </CardHeader>
          <CardContent>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.reviewer_name}</span>
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                          {review.rating}/5
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No reviews yet. Complete more teaching sessions to receive feedback!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
