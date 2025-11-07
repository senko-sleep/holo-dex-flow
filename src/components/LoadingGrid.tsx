import { Skeleton } from '@/components/ui/skeleton';

interface LoadingGridProps {
  count?: number;
  type?: 'card' | 'character' | 'list';
}

export const LoadingGrid = ({ count = 12, type = 'card' }: LoadingGridProps) => {
  if (type === 'list') {
    return (
      <div className="space-y-4">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-card rounded-xl">
            <Skeleton className="w-16 h-20 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'character') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[3/4] rounded-xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="space-y-3 animate-pulse">
          <Skeleton className="aspect-[2/3] rounded-xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
};
