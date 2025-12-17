import { GraduationCap, Mail, Github, Twitter, Linkedin } from "lucide-react";

const Footer = () => {
  const footerLinks = {
    product: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Skills", href: "#skills" },
      { label: "Pricing", href: "#pricing" },
    ],
    company: [
      { label: "About", href: "#about" },
      { label: "Blog", href: "#blog" },
      { label: "Careers", href: "#careers" },
      { label: "Contact", href: "#contact" },
    ],
    legal: [
      { label: "Privacy", href: "#privacy" },
      { label: "Terms", href: "#terms" },
      { label: "Security", href: "#security" },
      { label: "FAQ", href: "#faq" },
    ],
  };

  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-bold">SkillSync</span>
            </div>
            <p className="mb-6 text-muted-foreground">
              Empowering students to learn and teach through meaningful skill exchanges. 
              Join the revolution of peer-to-peer education.
              </p>
              <div className="flex gap-4">
                {/* Removed Twitter since you don't have it */}
                <a
                  href="https://www.linkedin.com/in/samraazizi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-card transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label="LinkedIn Profile"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="https://github.com/SamraAzizi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-card transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label="GitHub Profile"
                >
                  <Github className="h-5 w-5" />
                </a>
                <a
                  href="mailto:samarraazizi@gmail.com"
                  className="flex h-10 w-10 items-center justify-center rounded-lg bg-card transition-colors hover:bg-primary hover:text-primary-foreground"
                  aria-label="Email"
                >
                  <Mail className="h-5 w-5" />
                </a>
              </div>
              </div>

              {/* Links */}
              <div>
                <h3 className="mb-4 font-bold">Product</h3>
                <ul className="space-y-2">
                  {footerLinks.product.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

          <div>
            <h3 className="mb-4 font-bold">Company</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-bold">Legal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SkillSync. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;