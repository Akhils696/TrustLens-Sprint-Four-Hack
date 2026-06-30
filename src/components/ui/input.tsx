import * as React from "react";
import { Eye, EyeOff, Search } from "lucide-react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", error, label, id, ...props }, ref) => {
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
        <input
          id={id}
          type={type}
          ref={ref}
          className={`flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 ${
            error ? "border-destructive focus-visible:ring-destructive" : ""
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, label, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

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
          <input
            id={id}
            type={showPassword ? "text" : "password"}
            ref={ref}
            className={`flex h-10 w-full rounded-lg border border-border bg-background pl-3 pr-10 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 ${
              error ? "border-destructive focus-visible:ring-destructive" : ""
            } ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

export const SearchInput = React.forwardRef<HTMLInputElement, InputProps>(
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            id={id}
            type="search"
            ref={ref}
            className={`flex h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200 ${
              error ? "border-destructive focus-visible:ring-destructive" : ""
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    );
  }
);
SearchInput.displayName = "SearchInput";
