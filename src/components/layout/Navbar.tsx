"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Menu, X, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function Navbar() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Security", href: "#security" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <a
          href="#"
          className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground"
        >
          <Shield className="h-6 w-6 text-primary" />
          <span>TrustLens</span>
        </a>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-155"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://github.com/Akhils696/TrustLens-Sprint-Four-Hack"
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors duration-155"
            aria-label="GitHub Repository"
          >
            <GithubIcon className="h-5 w-5" />
          </a>
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => router.push("/sandbox")}>
            Log In
          </Button>
          <Button
            size="sm"
            onClick={() => router.push("/sandbox")}
            aria-label="Upload document to sandbox"
          >
            Upload Document
          </Button>
        </div>

        {/* Mobile menu and theme toggler controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-lg p-2 hover:bg-secondary text-foreground focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-b border-border bg-card p-4 space-y-4 animate-fade-in">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-155"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                router.push("/sandbox");
                setIsOpen(false);
              }}
            >
              Log In
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                router.push("/sandbox");
                setIsOpen(false);
              }}
            >
              Upload Document
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
