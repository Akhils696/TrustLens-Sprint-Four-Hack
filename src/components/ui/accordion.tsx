"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

interface AccordionContextValue {
  openItem: string | null;
  toggleItem: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined);

export function Accordion({
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [openItem, setOpenItem] = React.useState<string | null>(null);

  const toggleItem = React.useCallback((value: string) => {
    setOpenItem((prev) => (prev === value ? null : value));
  }, []);

  return (
    <AccordionContext.Provider value={{ openItem, toggleItem }}>
      <div className={`space-y-2 ${className}`} {...props}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

interface AccordionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function AccordionItem({ value, className = "", children, ...props }: AccordionItemProps) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("AccordionItem must be used within Accordion");

  const isOpen = context.openItem === value;

  return (
    <div
      className={`border-b border-border transition-all duration-200 ${
        isOpen ? "pb-4" : "pb-0"
      } ${className}`}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return React.cloneElement(child, { value, isOpen } as any);
        }
        return child;
      })}
    </div>
  );
}

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value?: string;
  isOpen?: boolean;
}

export function AccordionTrigger({
  value,
  isOpen,
  className = "",
  children,
  ...props
}: AccordionTriggerProps) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("AccordionTrigger must be used within Accordion");

  const triggerValue = value!;
  const isTriggerOpen = isOpen !== undefined ? isOpen : context.openItem === triggerValue;

  return (
    <button
      type="button"
      onClick={() => context.toggleItem(triggerValue)}
      className={`flex w-full items-center justify-between py-4 font-medium transition-all hover:underline text-left text-foreground cursor-pointer ${className}`}
      aria-expanded={isTriggerOpen}
      {...props}
    >
      {children}
      <ChevronDown
        className={`h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground ${
          isTriggerOpen ? "rotate-180" : ""
        }`}
      />
    </button>
  );
}

interface AccordionContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  isOpen?: boolean;
}

export function AccordionContent({
  value,
  isOpen,
  className = "",
  children,
  ...props
}: AccordionContentProps) {
  const context = React.useContext(AccordionContext);
  if (!context) throw new Error("AccordionContent must be used within Accordion");

  const contentValue = value!;
  const isContentOpen = isOpen !== undefined ? isOpen : context.openItem === contentValue;

  if (!isContentOpen) return null;

  return (
    <div
      className={`overflow-hidden text-sm transition-all duration-200 animate-accordion-down ${className}`}
      {...props}
    >
      <div className="pb-4 pt-0 text-muted-foreground">{children}</div>
    </div>
  );
}
