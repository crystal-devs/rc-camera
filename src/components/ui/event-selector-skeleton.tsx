// components/ui/event-selector-skeleton.tsx
import { Skeleton } from './skeleton';

export function EventSelectorSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EventSelectorTriggerSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-4" />
      <Skeleton className="h-4 flex-1" />
    </>
  );
}