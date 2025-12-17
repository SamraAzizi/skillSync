import { UserPlus, Search, CalendarCheck, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const steps = [
  {
    icon: UserPlus,
    title: "Create Your Profile",
    description: "List the skills you can teach and what you want to learn. Set your availability and preferences.",
    step: "01",
  },
  {
    icon: Search,
    title: "Find Your Match",
    description: "Browse potential partners or let our smart algorithm suggest ideal skill exchange matches.",
    step: "02",
  },
  {
    icon: CalendarCheck,
    title: "Schedule Sessions",
    description: "Coordinate learning sessions with integrated scheduling tools and automated reminders.",
    step: "03",
  },
  {
    icon: GraduationCap,
    title: "Learn & Teach",
    description: "Exchange knowledge, track progress, and build your portfolio while gaining valuable experience.",
    step: "04",
  },
];

const HowItWorks = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStepClick = (stepNumber: string) => {
    if (!user) {
      toast.error("Please sign in to continue");
      navigate("/auth");
      return;
    }

    switch (stepNumber) {
      case "01":
        navigate("/profile");
        break;
      case "02":
        navigate("/match");
        break;
      case "03":
        navigate("/schedule");
        break;
      case "04":
        navigate("/dashboard");
        break;
    }
  };

  return (
    <section className="relative overflow-hidden bg-muted/30 py-20 md:py-32">
      <div className="absolute inset-0 gradient-secondary opacity-5" />
      
      <div className="container relative mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
            How SkillSync{" "}
            <span className="bg-gradient-to-r from-secondary to-secondary-light bg-clip-text text-transparent">
              Works
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Start exchanging skills in four simple steps
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={index}
                className="group relative rounded-2xl border bg-card p-8 shadow-card transition-smooth hover:shadow-soft cursor-pointer"
                onClick={() => handleStepClick(step.step)}
              >
                <div className="absolute -right-2 -top-2 text-6xl font-bold text-primary/5">
                  {step.step}
                </div>
                <div className="relative">
                  <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-secondary/10 transition-smooth group-hover:scale-110">
                    <Icon className="h-8 w-8 text-secondary" />
                  </div>
                  <h3 className="mb-3 text-2xl font-bold">{step.title}</h3>
                  <p className="mb-4 text-muted-foreground">{step.description}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStepClick(step.step);
                    }}
                  >
                    {step.step === "01" ? "Create Profile" : 
                     step.step === "02" ? "Browse Matches" : 
                     step.step === "03" ? "View Schedule" : 
                     "View Dashboard"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;