import * as React from "react";
import { ChevronDown } from "lucide-react";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  label?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", options, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={id}
            ref={ref}
            className={`flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 cursor-pointer pr-10 text-foreground ${
              error ? "border-destructive focus-visible:ring-destructive" : ""
            } ${className}`}
            {...props}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
