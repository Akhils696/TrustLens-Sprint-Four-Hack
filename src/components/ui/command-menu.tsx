"use client";

import * as React from "react";
import { Search } from "lucide-react";

export interface CommandItem {
  id: string;
  label: string;
  category: string;
  action: () => void;
}

export interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
}

export function CommandMenu({ isOpen, onClose, items }: CommandMenuProps) {
  const [search, setSearch] = React.useState("");

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden animate-slide-up">
        <div className="flex items-center border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground mr-2" />
          <input
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex h-12 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-secondary flex items-center justify-between text-foreground transition-all duration-155 cursor-pointer"
              >
                <span>{item.label}</span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase font-semibold">
                  {item.category}
                </span>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No commands found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
