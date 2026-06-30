/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import * as React from "react";
import { useTheme } from "@/providers/theme-provider";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-lg bg-secondary animate-pulse" />;
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="relative h-9 w-9 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4 text-amber-500 transition-all" />
      ) : (
        <Moon className="h-4 w-4 text-slate-700 transition-all" />
      )}
    </button>
  );
}
