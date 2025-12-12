import { Button } from "@/components/ui/button";
import { ArrowRight, Users, BookOpen, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 gradient-hero opacity-5" />
      
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Trophy className="h-4 w-4" />
            Join the Skill Exchange Revolution
          </div>
          
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Learn Anything,{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Teach Everything
            </span>
          </h1>
          
          <p className="mb-10 text-lg text-muted-foreground sm:text-xl md:text-2xl">
            SkillSync connects students who want to exchange skills without spending money. 
            Teach what you know, learn what you need.
          </p>
          
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="group shadow-soft transition-smooth hover:shadow-lg" asChild>
              <Link to="/auth">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="transition-smooth" asChild>
              <a href="#how-it-works">How It Works</a>
            </Button>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border bg-card p-6 shadow-card transition-smooth hover:shadow-soft">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Find Your Match</h3>
              <p className="text-muted-foreground">
                Connect with students who have the skills you need and want to learn what you teach
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-card transition-smooth hover:shadow-soft">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10">
                <BookOpen className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Schedule Sessions</h3>
              <p className="text-muted-foreground">
                Plan learning sessions that work for both partners with built-in scheduling tools
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-card transition-smooth hover:shadow-soft">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Trophy className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-xl font-bold">Track Progress</h3>
              <p className="text-muted-foreground">
                Build your portfolio while gaining new skills and teaching experience
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;