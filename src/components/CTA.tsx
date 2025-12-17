import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="relative overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 gradient-hero opacity-10" />
      
      <div className="container relative mx-auto px-4">
        <div className="mx-auto max-w-4xl rounded-3xl border-2 bg-card p-8 shadow-soft md:p-12 lg:p-16">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Join thousands of students already learning
            </div>
            
            <h2 className="mb-6 text-3xl font-bold sm:text-4xl md:text-5xl">
              Ready to Start Your{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Skill Exchange Journey?
              </span>
            </h2>
            
            <p className="mb-10 text-lg text-muted-foreground md:text-xl">
              Create your free profile today and discover the power of peer-to-peer learning. 
              No credit card required, no hidden fees—just pure knowledge exchange.
            </p>
            
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button size="lg" className="group shadow-soft transition-smooth hover:shadow-lg" asChild>
                <Link to="/auth">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="transition-smooth" asChild>
                <Link to="/leaderboard">View Leaderboard</Link>
              </Button>
            </div>

            <p className="mt-6 text-sm text-muted-foreground">
              Join 10,000+ students already exchanging skills on SkillSync
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;