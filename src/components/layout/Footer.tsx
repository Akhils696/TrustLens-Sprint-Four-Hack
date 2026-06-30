import * as React from "react";
import { Shield } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card py-12 text-muted-foreground">
      <div className="container grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-foreground text-lg">
            <Shield className="h-6 w-6 text-primary" />
            <span>TrustLens</span>
          </div>
          <p className="text-sm">
            AI document anonymization that builds trust through transparent explanations.
          </p>
        </div>
        <div>
          <h5 className="font-semibold text-foreground text-sm mb-4">Product</h5>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#features" className="hover:text-foreground transition-colors duration-155">
                Features
              </a>
            </li>
            <li>
              <a
                href="#how-it-works"
                className="hover:text-foreground transition-colors duration-155"
              >
                How It Works
              </a>
            </li>
            <li>
              <a href="#security" className="hover:text-foreground transition-colors duration-155">
                Security
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-semibold text-foreground text-sm mb-4">Resources</h5>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="https://github.com/Akhils696/TrustLens-Sprint-Four-Hack"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors duration-155"
              >
                GitHub
              </a>
            </li>
            <li>
              <a href="#docs" className="hover:text-foreground transition-colors duration-155">
                Documentation
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-semibold text-foreground text-sm mb-4">Legal</h5>
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="hover:text-foreground transition-colors duration-155">
                Privacy Policy
              </a>
            </li>
            <li>
              <a href="#" className="hover:text-foreground transition-colors duration-155">
                Terms of Service
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container mt-12 pt-8 border-t border-border/60 flex flex-col md:flex-row items-center justify-between text-xs gap-4">
        <span>© {new Date().getFullYear()} TrustLens. All rights reserved.</span>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-foreground transition-colors duration-155">
            Privacy
          </a>
          <a href="#" className="hover:text-foreground transition-colors duration-155">
            About
          </a>
        </div>
      </div>
    </footer>
  );
}
