export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <Skeleton className="h-7 w-16" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="glass rounded-xl p-4 flex items-start gap-4">
      <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-full max-w-xs" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-16 flex-shrink-0" />
    </div>
  );
}
