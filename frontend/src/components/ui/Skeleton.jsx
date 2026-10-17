import React from 'react';

export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-[var(--color-surface-soft)] border border-[var(--color-border)] rounded-[var(--radius-md)] ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Aspect 4:3 image skeleton */}
      <div className="aspect-[4/3] w-full rounded-[var(--radius-lg)] bg-[var(--color-surface-soft)] border border-[var(--color-border)] animate-pulse" />
      {/* Title */}
      <div className="h-5 bg-[var(--color-surface-soft)] rounded-[var(--radius-sm)] w-3/4 animate-pulse" />
      {/* Subtitle */}
      <div className="h-4 bg-[var(--color-surface-soft)] rounded-[var(--radius-sm)] w-1/2 animate-pulse" />
      {/* Details/price */}
      <div className="h-4 bg-[var(--color-surface-soft)] rounded-[var(--radius-sm)] w-1/3 animate-pulse" />
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
