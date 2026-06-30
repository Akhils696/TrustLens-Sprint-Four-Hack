import * as React from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ui/button";
import { Shield, LayoutDashboard, FileText, Settings, LogOut } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const sidebarItems = [
    { label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, active: true },
    { label: "Documents", icon: <FileText className="h-4 w-4" />, active: false },
    { label: "Settings", icon: <Settings className="h-4 w-4" />, active: false },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4">
        <div className="flex items-center gap-2 font-bold text-lg mb-8 px-2">
          <Shield className="h-6 w-6 text-primary" />
          <span>TrustLens</span>
        </div>
        <nav className="flex-1 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-155 cursor-pointer ${
                item.active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="flex flex-col gap-2 pt-4 border-t border-border">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase">Theme</span>
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            className="justify-start gap-3 w-full cursor-pointer"
            leftIcon={<LogOut className="h-4 w-4" />}
          >
            Log Out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between px-6 border-b border-border bg-card md:bg-transparent">
          <div className="flex items-center gap-2 md:hidden">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">TrustLens</span>
          </div>
          <div className="hidden md:block">
            <h1 className="font-bold text-xl">Workspace</h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-sm text-foreground">
              M
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
