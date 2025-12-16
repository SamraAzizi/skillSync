import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ReviewDialog from '@/components/ReviewDialog';

interface Session {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  teacher_id: string;
  learner_id: string;
  skill: string;
  status: string;
  notes: string | null;
  meeting_link: string | null;
  teacherName?: string;
  learnerName?: string;
}

const Schedule = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [sessionToReview, setSessionToReview] = useState<Session | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please sign in to view your schedule');
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .or(`teacher_id.eq.${user?.id},learner_id.eq.${user?.id}`)
        .order('scheduled_at', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch profile names separately
      const teacherIds = [...new Set(sessionsData?.map(s => s.teacher_id) || [])];
      const learnerIds = [...new Set(sessionsData?.map(s => s.learner_id) || [])];
      const allUserIds = [...new Set([...teacherIds, ...learnerIds])];

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', allUserIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profilesData?.map(p => [p.id, p.full_name]) || []);

      const enrichedSessions = sessionsData?.map(session => ({
        ...session,
        teacherName: profilesMap.get(session.teacher_id) || 'Unknown User',
        learnerName: profilesMap.get(session.learner_id) || 'Unknown User',
      })) || [];

      setSessions(enrichedSessions);
    } catch (error) {
      toast.error('Failed to load sessions');
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (sessionId: string, newStatus: string) => {
    try {
      const session = sessions.find(s => s.id === sessionId);
      if (!session) throw new Error('Session not found');

      // If confirming a session, create a Whereby meeting room
      let meetingLink = session.meeting_link;
      if (newStatus === 'confirmed' && !meetingLink) {
        toast.info('Creating video meeting room...');
        
        const scheduledAt = new Date(session.scheduled_at);
        const endDate = new Date(scheduledAt.getTime() + session.duration_minutes * 60000);
        
        const { data: meetingData, error: meetingError } = await supabase.functions.invoke(
          'create-whereby-meeting',
          {
            body: {
              sessionId,
              startDate: scheduledAt.toISOString(),
              endDate: endDate.toISOString(),
            },
          }
        );

        if (meetingError) {
          console.error('Error creating meeting:', meetingError);
          toast.error('Failed to create video meeting room');
          return;
        }

        meetingLink = meetingData.roomUrl;
      }

      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: newStatus,
          meeting_link: meetingLink 
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      toast.success(`Session ${newStatus}${meetingLink ? ' - Video room created!' : ''}`);
      
      // Send email notification for confirmed or declined sessions
      if (newStatus === 'confirmed' || newStatus === 'declined') {
        supabase.functions.invoke('send-session-notification', {
          body: { sessionId, status: newStatus }
        }).catch(err => {
          console.error('Failed to send notification email:', err);
          // Don't show error to user, email notification is not critical
        });
      }
      
      // If completing a session, prompt for review
      if (newStatus === 'completed') {
        if (session) {
          setSessionToReview(session);
          setReviewDialogOpen(true);
        }
      }
      
      fetchSessions();
    } catch (error) {
      toast.error('Failed to update session');
      console.error('Error updating session:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const filterSessionsByStatus = (status: string) => {
    return sessions.filter(s => s.status === status);
  };

  const getUpcomingSessions = () => {
    const now = new Date();
    return sessions.filter(s => 
      (s.status === 'confirmed' || s.status === 'pending') && 
      new Date(s.scheduled_at) > now
    );
  };

  const SessionCard = ({ session }: { session: Session }) => {
    const isTeacher = session.teacher_id === user?.id;
    const partnerName = isTeacher 
      ? session.learnerName || 'Unknown User'
      : session.teacherName || 'Unknown User';

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{session.skill}</CardTitle>
              <CardDescription>
                {isTeacher ? 'Teaching' : 'Learning'} with {partnerName}
              </CardDescription>
            </div>
            <Badge variant={getStatusColor(session.status)}>
              {session.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>{format(new Date(session.scheduled_at), 'PPP')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(session.scheduled_at), 'p')} ({session.duration_minutes} mins)
            </span>
          </div>
          {session.notes && (
            <p className="text-sm text-muted-foreground">{session.notes}</p>
          )}
          {session.meeting_link && session.status === 'confirmed' && (
            <Button
              size="sm"
              className="w-full bg-primary hover:bg-primary/90"
              onClick={() => window.open(session.meeting_link!, '_blank')}
            >
              🎥 Join Video Meeting
            </Button>
          )}
          {session.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => handleStatusUpdate(session.id, 'confirmed')}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => handleStatusUpdate(session.id, 'declined')}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Decline
              </Button>
            </div>
          )}
          {session.status === 'confirmed' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleStatusUpdate(session.id, 'completed')}
            >
              Mark as Completed
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-foreground">My Schedule</h1>
            <p className="text-muted-foreground">
              Manage your learning sessions and upcoming meetings
            </p>
          </div>

          <Button 
            onClick={() => navigate('/match')} 
            className="mb-8"
          >
            Schedule New Session
          </Button>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  No sessions scheduled yet. Find a match to book your first session!
                </p>
                <Button onClick={() => navigate('/match')}>
                  Find Matches
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Tabs defaultValue="upcoming" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="upcoming">
                      Upcoming ({getUpcomingSessions().length})
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                      Pending ({filterSessionsByStatus('pending').length})
                    </TabsTrigger>
                    <TabsTrigger value="confirmed">
                      Confirmed ({filterSessionsByStatus('confirmed').length})
                    </TabsTrigger>
                    <TabsTrigger value="completed">
                      Completed ({filterSessionsByStatus('completed').length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upcoming" className="space-y-4 mt-6">
                    {getUpcomingSessions().map(session => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </TabsContent>

                  <TabsContent value="pending" className="space-y-4 mt-6">
                    {filterSessionsByStatus('pending').map(session => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </TabsContent>

                  <TabsContent value="confirmed" className="space-y-4 mt-6">
                    {filterSessionsByStatus('confirmed').map(session => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </TabsContent>

                  <TabsContent value="completed" className="space-y-4 mt-6">
                    {filterSessionsByStatus('completed').map(session => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Calendar</CardTitle>
                    <CardDescription>View your schedule</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-md border"
                      modifiers={{
                        booked: sessions.map(s => new Date(s.scheduled_at))
                      }}
                      modifiersStyles={{
                        booked: {
                          fontWeight: 'bold',
                          textDecoration: 'underline'
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />

      {/* Review Dialog */}
      {sessionToReview && (
        <ReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          sessionId={sessionToReview.id}
          revieweeId={
            sessionToReview.teacher_id === user?.id
              ? sessionToReview.learner_id
              : sessionToReview.teacher_id
          }
          revieweeName={
            sessionToReview.teacher_id === user?.id
              ? sessionToReview.learnerName || "Unknown User"
              : sessionToReview.teacherName || "Unknown User"
          }
          skill={sessionToReview.skill}
          onReviewSubmitted={() => {
            setSessionToReview(null);
          }}
        />
      )}
    </div>
  );
};

export default Schedule;
