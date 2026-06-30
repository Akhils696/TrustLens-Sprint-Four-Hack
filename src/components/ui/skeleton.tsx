import * as React from "react";

export function Skeleton({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`animate-pulse rounded-md bg-secondary ${className}`} {...props} />;
}

export function PageSkeleton() {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-[300px] w-full rounded-xl" />
    </div>
  );
}

export function DocumentSkeleton() {
  return (
    <div className="border border-border rounded-xl p-6 bg-card space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <Skeleton className="h-5 w-[150px]" />
        <Skeleton className="h-8 w-[80px]" />
      </div>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/6" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/5" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-4 w-1/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}
