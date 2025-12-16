import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Search, User } from "lucide-react";
import { toast } from "sonner";

interface UserSkill {
  skill: string;
  users: {
    id: string;
    full_name: string;
    bio: string;
  }[];
}

const Skills = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [teachSkills, setTeachSkills] = useState<UserSkill[]>([]);
  const [learnSkills, setLearnSkills] = useState<UserSkill[]>([]);
  const [activeTab, setActiveTab] = useState<"teach" | "learn">("teach");

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      setLoading(true);
      
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, bio, skills_to_teach, skills_to_learn")
        .eq("profile_completed", true);

      if (error) throw error;

      // Aggregate skills
      const teachMap = new Map<string, UserSkill>();
      const learnMap = new Map<string, UserSkill>();

      profiles?.forEach((profile) => {
        profile.skills_to_teach?.forEach((skill: string) => {
          if (!teachMap.has(skill)) {
            teachMap.set(skill, { skill, users: [] });
          }
          teachMap.get(skill)!.users.push({
            id: profile.id,
            full_name: profile.full_name || "Unknown",
            bio: profile.bio || "",
          });
        });

        profile.skills_to_learn?.forEach((skill: string) => {
          if (!learnMap.has(skill)) {
            learnMap.set(skill, { skill, users: [] });
          }
          learnMap.get(skill)!.users.push({
            id: profile.id,
            full_name: profile.full_name || "Unknown",
            bio: profile.bio || "",
          });
        });
      });

      setTeachSkills(Array.from(teachMap.values()).sort((a, b) => b.users.length - a.users.length));
      setLearnSkills(Array.from(learnMap.values()).sort((a, b) => b.users.length - a.users.length));
    } catch (error) {
      console.error("Error fetching skills:", error);
      toast.error("Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachSkills = teachSkills.filter((item) =>
    item.skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLearnSkills = learnSkills.filter((item) =>
    item.skill.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-3xl font-bold md:text-5xl">
            Explore <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">All Skills</span>
          </h1>
          <p className="text-lg text-muted-foreground">
            Find skills to learn and people who can teach them
          </p>
        </div>

        <div className="mb-8 mx-auto max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search skills..."
              className="pl-10 h-12 text-lg"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "teach" | "learn")} className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="teach">Skills to Learn ({teachSkills.length})</TabsTrigger>
            <TabsTrigger value="learn">Looking for Teachers ({learnSkills.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="teach">
            {filteredTeachSkills.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No skills found matching your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTeachSkills.map((item) => (
                  <Card key={item.skill} className="p-6 shadow-card transition-smooth hover:shadow-soft">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold mb-2">{item.skill}</h3>
                      <Badge variant="secondary">
                        {item.users.length} {item.users.length === 1 ? "Teacher" : "Teachers"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {item.users.slice(0, 3).map((user) => (
                        <div key={user.id} className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      ))}
                      {item.users.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          +{item.users.length - 3} more
                        </p>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => navigate("/match", { state: { skillFilter: item.skill, mode: "learn" } })}
                    >
                      Find Teachers
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="learn">
            {filteredLearnSkills.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No skills found matching your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredLearnSkills.map((item) => (
                  <Card key={item.skill} className="p-6 shadow-card transition-smooth hover:shadow-soft">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold mb-2">{item.skill}</h3>
                      <Badge variant="secondary">
                        {item.users.length} {item.users.length === 1 ? "Learner" : "Learners"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {item.users.slice(0, 3).map((user) => (
                        <div key={user.id} className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user.full_name}</span>
                        </div>
                      ))}
                      {item.users.length > 3 && (
                        <p className="text-sm text-muted-foreground">
                          +{item.users.length - 3} more
                        </p>
                      )}
                    </div>

                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => navigate("/match", { state: { skillFilter: item.skill, mode: "teach" } })}
                    >
                      Offer to Teach
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Skills;
