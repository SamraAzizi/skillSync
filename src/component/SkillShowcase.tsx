import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Code, Palette, Music, Languages, Calculator, Mic } from "lucide-react";

const categoryIcons = {
  "Technical Skills": { icon: Code, keywords: ["web", "programming", "python", "javascript", "react", "data", "mobile", "app", "code", "software"] },
  "Creative Arts": { icon: Palette, keywords: ["design", "art", "photography", "video", "editing", "ui", "ux", "graphic"] },
  "Music & Performance": { icon: Music, keywords: ["music", "guitar", "piano", "singing", "performance", "production", "instrument"] },
  "Languages": { icon: Languages, keywords: ["spanish", "french", "mandarin", "language", "english", "sign", "translation"] },
  "Academic": { icon: Calculator, keywords: ["math", "physics", "science", "writing", "research", "academic", "study"] },
  "Professional": { icon: Mic, keywords: ["speaking", "resume", "interview", "networking", "business", "career", "professional"] },
};

interface SkillCategory {
  icon: typeof Code;
  name: string;
  skills: string[];
  color: string;
}

const categorizeSkill = (skill: string): string => {
  const lowerSkill = skill.toLowerCase();
  for (const [category, { keywords }] of Object.entries(categoryIcons)) {
    if (keywords.some(keyword => lowerSkill.includes(keyword))) {
      return category;
    }
  }
  return "Professional";
};

const SkillShowcase = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  useEffect(() => {
    fetchPopularSkills();
  }, []);

  const fetchPopularSkills = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("skills_to_teach")
        .eq("profile_completed", true);

      if (error) throw error;

      const skillCount = new Map<string, number>();
      profiles?.forEach((profile) => {
        profile.skills_to_teach?.forEach((skill: string) => {
          skillCount.set(skill, (skillCount.get(skill) || 0) + 1);
        });
      });

      const categoryMap = new Map<string, string[]>();
      skillCount.forEach((count, skill) => {
        const category = categorizeSkill(skill);
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        categoryMap.get(category)!.push(skill);
      });

      const categories: SkillCategory[] = [];
      let colorIndex = 0;
      
      Object.entries(categoryIcons).forEach(([categoryName, { icon }]) => {
        const skills = categoryMap.get(categoryName) || [];
        if (skills.length > 0) {
          categories.push({
            icon,
            name: categoryName,
            skills: skills.slice(0, 4),
            color: colorIndex % 2 === 0 ? "primary" : "secondary",
          });
          colorIndex++;
        }
      });

      setSkillCategories(categories);
    } catch (error) {
      console.error("Error fetching skills:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-16 max-w-3xl text-center">
            <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
            Explore{" "}
            <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              Popular Skills
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Discover the diverse range of skills students are teaching and learning
          </p>
        </div>

        {skillCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No skills available yet. Be the first to add your skills!
            </p>
            <Button className="mt-4" onClick={() => navigate("/profile")}>
              Create Profile
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {skillCategories.map((category, index) => {
                const Icon = category.icon;
                const isPrimary = category.color === "primary";
                return (
                  <Card
                    key={index}
                    className="group overflow-hidden border-2 p-6 shadow-card transition-smooth hover:border-primary/20 hover:shadow-soft"
                  >
                    <div className="mb-4 flex items-center gap-3">
                      <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl transition-smooth group-hover:scale-110 ${
                        isPrimary ? "bg-primary/10" : "bg-secondary/10"
                      }`}>
                        <Icon className={`h-6 w-6 ${isPrimary ? "text-primary" : "text-secondary"}`} />
                      </div>
                      <h3 className="text-xl font-bold">{category.name}</h3>
                    </div>
                    
                    <div className="mb-4 flex flex-wrap gap-2">
                      {category.skills.map((skill, skillIndex) => (
                        <Badge
                          key={skillIndex}
                          variant="secondary"
                          className="cursor-pointer transition-smooth hover:bg-primary hover:text-primary-foreground"
                          onClick={() => navigate("/skills")}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full transition-smooth hover:bg-primary/10 hover:text-primary"
                      onClick={() => navigate("/skills")}
                    >
                      View All
                    </Button>
                  </Card>
                );
              })}
            </div>

            <div className="mt-12 text-center">
              <Button 
                size="lg" 
                variant="outline" 
                className="shadow-card transition-smooth hover:shadow-soft"
                onClick={() => navigate("/skills")}
              >
                Browse All Skills
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default SkillShowcase;