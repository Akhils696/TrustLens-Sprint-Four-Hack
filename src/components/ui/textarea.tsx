import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  label?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", error, label, id, ...props }, ref) => {
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
        <textarea
          id={id}
          ref={ref}
          className={`flex min-h-[80px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 ${
            error ? "border-destructive focus-visible:ring-destructive" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";
