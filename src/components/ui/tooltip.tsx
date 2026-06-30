import * as React from "react";

export interface TooltipProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "content"> {
  content: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({
  children,
  content,
  position = "top",
  delay = 200,
  className = "",
  ...props
}: TooltipProps) {
  const [visible, setVisible] = React.useState(false);
  const timer = React.useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    timer.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timer.current) {
      clearTimeout(timer.current);
    }
    setVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const positionStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      {...props}
    >
      {children}
      {visible && (
        <div
          className={`absolute z-50 rounded-md bg-slate-950 dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-50 dark:text-slate-100 shadow-md animate-fade-in whitespace-nowrap border border-slate-800 dark:border-slate-700 ${positionStyles[position]} ${className}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
