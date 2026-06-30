import * as React from "react";
import { AlertCircle, CheckCircle2, Info, XCircle } from "lucide-react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "info" | "success" | "warning" | "destructive";
  title?: string;
}

export function Alert({ className = "", variant = "info", title, children, ...props }: AlertProps) {
  const baseStyles = "relative w-full rounded-lg border p-4 flex gap-3 text-sm";

  const variants = {
    info: "bg-sky-500/10 border-sky-500/20 text-sky-700 dark:text-sky-400",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400",
    destructive:
      "bg-destructive/10 border-destructive/20 text-destructive dark:text-destructive-foreground",
  };

  const icons = {
    info: <Info className="h-5 w-5 shrink-0" />,
    success: <CheckCircle2 className="h-5 w-5 shrink-0" />,
    warning: <AlertCircle className="h-5 w-5 shrink-0" />,
    destructive: <XCircle className="h-5 w-5 shrink-0" />,
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} role="alert" {...props}>
      {icons[variant]}
      <div className="flex-1 space-y-1">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        <div className="text-muted-foreground [&_p]:leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
