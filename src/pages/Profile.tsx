import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, X, Mail, Bell, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";

const profileSchema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(100),
  bio: z.string().trim().max(500, "Bio must be less than 500 characters").optional(),
});

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [skillsToTeach, setSkillsToTeach] = useState<string[]>([]);
  const [skillsToLearn, setSkillsToLearn] = useState<string[]>([]);
  const [newTeachSkill, setNewTeachSkill] = useState("");
  const [newLearnSkill, setNewLearnSkill] = useState("");
  const [emailDigestEnabled, setEmailDigestEnabled] = useState(true);
  const [sessionReminderEnabled, setSessionReminderEnabled] = useState(true);
  const [sessionNotificationEnabled, setSessionNotificationEnabled] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setSkillsToTeach(data.skills_to_teach || []);
        setSkillsToLearn(data.skills_to_learn || []);
        setEmailDigestEnabled(data.email_digest_enabled ?? true);
        setSessionReminderEnabled(data.session_reminder_enabled ?? true);
        setSessionNotificationEnabled(data.session_notification_enabled ?? true);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    }
  };

  const addSkill = (type: "teach" | "learn") => {
    const skill = type === "teach" ? newTeachSkill.trim() : newLearnSkill.trim();
    if (!skill) return;

    if (skill.length > 50) {
      toast.error("Skill name must be less than 50 characters");
      return;
    }

    if (type === "teach") {
      if (skillsToTeach.includes(skill)) {
        toast.error("Skill already added");
        return;
      }
      setSkillsToTeach([...skillsToTeach, skill]);
      setNewTeachSkill("");
    } else {
      if (skillsToLearn.includes(skill)) {
        toast.error("Skill already added");
        return;
      }
      setSkillsToLearn([...skillsToLearn, skill]);
      setNewLearnSkill("");
    }
  };

  const removeSkill = (type: "teach" | "learn", index: number) => {
    if (type === "teach") {
      setSkillsToTeach(skillsToTeach.filter((_, i) => i !== index));
    } else {
      setSkillsToLearn(skillsToLearn.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = profileSchema.parse({
        full_name: fullName,
        bio: bio || undefined,
      });

      if (skillsToTeach.length === 0 && skillsToLearn.length === 0) {
        toast.error("Please add at least one skill to teach or learn");
        return;
      }

      setLoading(true);

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: validated.full_name,
          bio: validated.bio || null,
          skills_to_teach: skillsToTeach,
          skills_to_learn: skillsToLearn,
          email_digest_enabled: emailDigestEnabled,
          session_reminder_enabled: sessionReminderEnabled,
          session_notification_enabled: sessionNotificationEnabled,
          profile_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      navigate("/");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error("Error updating profile:", error);
        toast.error("Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">Create Your Profile</h1>
          <p className="mb-8 text-muted-foreground">
            Tell us about your skills and what you'd like to learn
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  maxLength={100}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={4}
                  maxLength={500}
                />
                <p className="text-sm text-muted-foreground">
                  {bio.length}/500 characters
                </p>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
              <div className="space-y-2">
                <Label>Skills You Can Teach *</Label>
                <div className="flex gap-2">
                  <Input
                    value={newTeachSkill}
                    onChange={(e) => setNewTeachSkill(e.target.value)}
                    placeholder="e.g., React, Guitar, Spanish"
                    maxLength={50}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("teach"))}
                  />
                  <Button
                    type="button"
                    onClick={() => addSkill("teach")}
                    variant="secondary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {skillsToTeach.map((skill, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg bg-secondary/20 px-3 py-1.5 text-sm"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill("teach", index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
              <div className="space-y-2">
                <Label>Skills You Want to Learn *</Label>
                <div className="flex gap-2">
                  <Input
                    value={newLearnSkill}
                    onChange={(e) => setNewLearnSkill(e.target.value)}
                    placeholder="e.g., Photography, Python, Cooking"
                    maxLength={50}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("learn"))}
                  />
                  <Button
                    type="button"
                    onClick={() => addSkill("learn")}
                    variant="secondary"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {skillsToLearn.map((skill, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 rounded-lg bg-primary/20 px-3 py-1.5 text-sm"
                    >
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill("learn", index)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-6 shadow-card">
              <h2 className="text-lg font-semibold mb-4">Email Notifications</h2>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="session-notification" className="text-base font-medium">
                      Session Confirmations
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when sessions are confirmed or declined
                    </p>
                  </div>
                </div>
                <Switch
                  id="session-notification"
                  checked={sessionNotificationEnabled}
                  onCheckedChange={setSessionNotificationEnabled}
                />
              </div>
              
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="session-reminder" className="text-base font-medium">
                      Session Reminders
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive reminders 1 hour before your sessions
                    </p>
                  </div>
                </div>
                <Switch
                  id="session-reminder"
                  checked={sessionReminderEnabled}
                  onCheckedChange={setSessionReminderEnabled}
                />
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <Label htmlFor="email-digest" className="text-base font-medium">
                      Weekly Email Digest
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Receive weekly summaries of your learning progress
                    </p>
                  </div>
                </div>
                <Switch
                  id="email-digest"
                  checked={emailDigestEnabled}
                  onCheckedChange={setEmailDigestEnabled}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profile
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
