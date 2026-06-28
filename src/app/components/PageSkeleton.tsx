import type { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded bg-muted ${className}`}
      {...props}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-[#EFF6FF]/60 rounded" />
          <div className="h-6 w-48 bg-[#EFF6FF] rounded-md" />
          <div className="h-4 w-32 bg-[#EFF6FF]/40 rounded" />
        </div>
        <div className="hidden sm:block h-8 w-28 bg-[#EFF6FF]/50 rounded-lg" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-4 sm:p-5 space-y-3">
            <div className="h-8 w-8 bg-[#EFF6FF] rounded-lg" />
            <div className="h-6 w-20 bg-[#EFF6FF]/80 rounded" />
            <div className="h-4 w-24 bg-[#EFF6FF]/50 rounded" />
            <div className="h-3 w-16 bg-[#EFF6FF]/30 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-[#EFF6FF]/80 rounded" />
              <div className="h-3 w-48 bg-[#EFF6FF]/40 rounded" />
            </div>
            <div className="h-4 w-24 bg-[#EFF6FF]/40 rounded" />
          </div>
          <div className="h-40 bg-[#EFF6FF]/30 rounded-lg" />
        </div>
        <div className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="h-4 w-28 bg-[#EFF6FF]/80 rounded" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 bg-[#EFF6FF] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-[#EFF6FF]/60 rounded" />
                  <div className="h-3 w-1/2 bg-[#EFF6FF]/40 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SkeletonProps {
  rows?: number;
}

export function ListSkeleton({ rows = 4 }: SkeletonProps) {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="flex gap-3 mb-5">
        <div className="h-9 w-48 bg-[#EFF6FF]/50 rounded-lg" />
        <div className="h-9 w-24 bg-[#EFF6FF]/40 rounded-lg" />
        <div className="h-9 w-24 bg-[#EFF6FF]/40 rounded-lg" />
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-4 sm:p-5 flex items-center gap-4">
          <div className="hidden sm:block w-1 h-12 bg-[#EFF6FF]/60 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-12 bg-[#EFF6FF] rounded" />
              <div className="h-3 w-20 bg-[#EFF6FF]/40 rounded" />
            </div>
            <div className="h-5 w-1/3 bg-[#EFF6FF]/80 rounded" />
            <div className="h-3.5 w-1/2 bg-[#EFF6FF]/40 rounded" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="h-5 w-20 bg-[#EFF6FF]/60 rounded-full" />
            <div className="h-3.5 w-16 bg-[#EFF6FF]/30 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: SkeletonProps) {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Overview Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-5 space-y-3">
            <div className="h-8 w-8 bg-[#EFF6FF] rounded-lg" />
            <div className="h-6 w-24 bg-[#EFF6FF]/80 rounded" />
            <div className="h-3 w-16 bg-[#EFF6FF]/50 rounded" />
          </div>
        ))}
      </div>

      {/* Progress bar Skeleton */}
      <div className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl p-5 space-y-2">
        <div className="h-4 w-28 bg-[#EFF6FF]/60 rounded" />
        <div className="h-2 w-full bg-[#EFF6FF]/30 rounded-full" />
      </div>

      {/* Invoice Table Skeleton */}
      <div className="bg-white border border-[rgba(15,23,42,0.06)] rounded-xl overflow-hidden divide-y divide-[rgba(15,23,42,0.04)]">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <div className="h-8 w-8 bg-[#EFF6FF] rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-[#EFF6FF]/80 rounded" />
              <div className="h-3 w-1/4 bg-[#EFF6FF]/40 rounded" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-12 bg-[#EFF6FF]/80 rounded" />
              <div className="h-5 w-16 bg-[#EFF6FF]/60 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
