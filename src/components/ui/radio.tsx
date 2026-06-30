import * as React from "react";

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ className = "", label, id, ...props }, ref) => {
    return (
      <div className="flex items-center gap-2.5">
        <input
          type="radio"
          id={id}
          ref={ref}
          className={`peer h-4 w-4 rounded-full border border-border bg-background text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 cursor-pointer accent-primary ${className}`}
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
    );
  }
);
Radio.displayName = "Radio";
