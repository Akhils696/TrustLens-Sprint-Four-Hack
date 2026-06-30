import * as React from "react";
import { FolderOpen, AlertOctagon } from "lucide-react";
import { Button } from "./button";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className = "",
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-card space-y-6 ${className}`}
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
        <FolderOpen className="h-6 w-6" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h4 className="text-lg font-bold text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title,
  description,
  retryLabel,
  onRetry,
  className = "",
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 border border-destructive/20 rounded-2xl bg-destructive/5 space-y-6 ${className}`}
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
        <AlertOctagon className="h-6 w-6" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h4 className="text-lg font-bold text-destructive">{title}</h4>
        <p className="text-sm text-destructive/80 leading-relaxed">{description}</p>
      </div>
      {retryLabel && onRetry && (
        <Button variant="destructive" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
