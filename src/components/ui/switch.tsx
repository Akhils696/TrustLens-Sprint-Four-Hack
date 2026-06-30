import * as React from "react";

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className = "", label, id, checked, onChange, ...props }, ref) => {
    return (
      <div className="flex items-center gap-3">
        <label htmlFor={id} className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            id={id}
            ref={ref}
            checked={checked}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div className="w-9 h-5 bg-border rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary transition-colors duration-200"></div>
        </label>
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium leading-none cursor-pointer select-none text-foreground"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);
Switch.displayName = "Switch";
