import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

const Navigation = () => {
  const { user, signOut } = useAuth();
  
  const publicNavLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Skills", href: "#skills" },
    { label: "About", href: "#about" },
  ];

  const userNavLinks = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "My Profile", href: "/profile" },
    { label: "Find Matches", href: "/match" },
    { label: "Schedule", href: "/schedule" },
    { label: "Messages", href: "/messages" },
    { label: "Leaderboard", href: "/leaderboard" },
  ];

  const navLinks = user ? userNavLinks : publicNavLinks;

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 transition-smooth hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">SkillSync</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            link.href.startsWith('#') ? (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-primary hover:scale-110 hover:-translate-y-0.5"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm font-medium text-muted-foreground transition-all duration-200 hover:text-primary hover:scale-110 hover:-translate-y-0.5"
              >
                {link.label}
              </Link>
            )
          ))}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground md:inline-flex">
                {user.email}
              </span>
              <Button variant="ghost" className="hidden md:inline-flex" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" className="hidden md:inline-flex" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button className="shadow-soft transition-smooth hover:shadow-lg animate-pulse hover:animate-none" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </>
          )}

          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="mt-8 flex flex-col gap-4">
                {navLinks.map((link) => (
                  link.href.startsWith('#') ? (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-lg font-medium transition-all duration-200 hover:text-primary hover:scale-105 hover:translate-x-1"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      key={link.label}
                      to={link.href}
                      className="text-lg font-medium transition-all duration-200 hover:text-primary hover:scale-105 hover:translate-x-1"
                    >
                      {link.label}
                    </Link>
                  )
                ))}
                {user ? (
                  <>
                    <div className="px-2 py-2 text-sm text-muted-foreground">
                      {user.email}
                    </div>
                    <Button variant="ghost" className="justify-start" onClick={signOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" className="justify-start" asChild>
                    <Link to="/auth">Sign In</Link>
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;