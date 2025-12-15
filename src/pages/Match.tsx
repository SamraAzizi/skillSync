import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Search, BookOpen, GraduationCap, MessageSquare } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { BookSessionDialog } from '@/components/BookSessionDialog';
import { ChatDialog } from '@/components/ChatDialog';

interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
  skills_to_teach: string[] | null;
  skills_to_learn: string[] | null;
}

const Match = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserName, setSelectedUserName] = useState<string>('');

  // Initialize filters from navigation state
  useEffect(() => {
    if (location.state?.skillFilter) {
      setSkillFilter(location.state.skillFilter);
    }
  }, [location.state]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please sign in to find matches');
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfiles();
    }
  }, [user]);

  useEffect(() => {
    filterProfiles();
  }, [searchQuery, skillFilter, profiles]);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, bio, skills_to_teach, skills_to_learn')
        .eq('profile_completed', true)
        .neq('id', user?.id);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      toast.error('Failed to load profiles');
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    let filtered = [...profiles];

    if (searchQuery) {
      filtered = filtered.filter(
        (profile) =>
          profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          profile.bio?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (skillFilter) {
      filtered = filtered.filter((profile) => {
        const allSkills = [
          ...(profile.skills_to_teach || []),
          ...(profile.skills_to_learn || []),
        ];
        return allSkills.some((skill) =>
          skill.toLowerCase().includes(skillFilter.toLowerCase())
        );
      });
    }

    setFilteredProfiles(filtered);
  };

  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navigation />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 text-foreground">Find Your Match</h1>
            <p className="text-muted-foreground">
              Connect with learners and teachers who share your interests
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by name or bio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Filter by skill..."
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <p className="text-muted-foreground">
                  {profiles.length === 0
                    ? 'No profiles found. Be the first to complete your profile!'
                    : 'No matches found. Try adjusting your search filters.'}
                </p>
                {profiles.length === 0 && (
                  <Button onClick={() => navigate('/profile')} className="mt-4">
                    Complete Your Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProfiles.map((profile) => (
                <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle 
                      className="text-xl cursor-pointer hover:text-primary transition-colors"
                      onClick={() => navigate(`/profile/${profile.id}`)}
                    >
                      {profile.full_name || 'Anonymous User'}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {profile.bio || 'No bio provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.skills_to_teach && profile.skills_to_teach.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">Can Teach</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills_to_teach.map((skill, idx) => (
                            <Badge key={idx} variant="default">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {profile.skills_to_learn && profile.skills_to_learn.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-4 w-4 text-secondary" />
                          <span className="text-sm font-medium text-foreground">Wants to Learn</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills_to_learn.map((skill, idx) => (
                            <Badge key={idx} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      {profile.skills_to_teach && profile.skills_to_teach.length > 0 && (
                        <BookSessionDialog 
                          teacherId={profile.id}
                          teacherName={profile.full_name || 'Unknown User'}
                          skills={profile.skills_to_teach}
                        />
                      )}
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedUserId(profile.id);
                          setSelectedUserName(profile.full_name || 'Unknown User');
                          setChatOpen(true);
                        }}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {chatOpen && selectedUserId && (
        <ChatDialog
          open={chatOpen}
          onOpenChange={setChatOpen}
          conversationId={null}
          otherUserId={selectedUserId}
          otherUserName={selectedUserName}
        />
      )}
    </div>
  );
};

export default Match;
