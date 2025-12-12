import { Brain, Calendar, Sparkles, Award, Users2, Target } from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "Smart Matching",
    description: "Our intelligent algorithm pairs you with ideal learning partners based on skills, schedules, and learning styles.",
    color: "primary",
  },
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description: "Built-in calendar tools make coordinating sessions effortless with automated reminders.",
    color: "secondary",
  },
  {
    icon: Sparkles,
    title: "Zero Cost",
    description: "Exchange skills freely without financial barriers. Your knowledge is your currency.",
    color: "primary",
  },
  {
    icon: Award,
    title: "Build Your Portfolio",
    description: "Document your teaching experience and learning achievements to showcase your growth.",
    color: "secondary",
  },
  {
    icon: Users2,
    title: "Campus Community",
    description: "Connect with fellow students from your university in a trusted, supportive environment.",
    color: "primary",
  },
  {
    icon: Target,
    title: "Track Progress",
    description: "Monitor your skill development with milestones, feedback, and achievement badges.",
    color: "secondary",
  },
];

const Features = () => {
  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl md:text-5xl">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              Exchange Skills
            </span>
          </h2>
          <p className="text-lg text-muted-foreground">
            SkillSync provides all the tools you need for successful peer-to-peer learning
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isPrimary = feature.color === "primary";
            return (
              <div
                key={index}
                className="group gradient-border rounded-2xl border bg-card p-8 shadow-card transition-smooth hover:shadow-soft hover:-translate-y-1"
              >
                <div className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl transition-smooth group-hover:scale-110 ${
                  isPrimary ? "bg-primary/10" : "bg-secondary/10"
                }`}>
                  <Icon className={`h-7 w-7 ${isPrimary ? "text-primary" : "text-secondary"}`} />
                </div>
                <h3 className="mb-3 text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;