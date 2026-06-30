import * as React from "react";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items, className = "", ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex ${className}`} {...props}>
      <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;

          return (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />}
              <li className="flex items-center">
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    className="hover:text-foreground transition-colors duration-150 font-medium"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className={`font-semibold ${isLast ? "text-foreground" : ""}`}>
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
