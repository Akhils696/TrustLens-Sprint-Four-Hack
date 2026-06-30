import * as React from "react";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id={id}
            ref={ref}
            className={`peer h-4 w-4 shrink-0 rounded border border-border bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 cursor-pointer accent-primary ${className}`}
            {...props}
          />
          {label && (
            <label
              htmlFor={id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none text-foreground"
            >
              {label}
            </label>
          )}
        </div>
        {error && <p className="text-xs font-medium text-destructive pl-6.5">{error}</p>}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";
