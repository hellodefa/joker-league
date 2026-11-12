'use client';

interface SkeletonListProps {
  count?: number;
  type?: 'card' | 'table-row';
}

export default function SkeletonList({ count = 3, type = 'card' }: SkeletonListProps) {
  if (type === 'card') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white/5 rounded-xl p-4 animate-pulse"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="h-5 bg-white/10 rounded w-32 mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-48 mb-1"></div>
                <div className="h-3 bg-white/10 rounded w-24"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-9 bg-white/10 rounded-lg w-20"></div>
                <div className="h-9 bg-white/10 rounded-lg w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'table-row') {
    return (
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="bg-white/5 rounded-lg p-3 animate-pulse flex items-center gap-3"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="h-4 bg-white/10 rounded w-16"></div>
            <div className="h-4 bg-white/10 rounded flex-1"></div>
            <div className="h-4 bg-white/10 rounded w-20"></div>
            <div className="h-4 bg-white/10 rounded w-20"></div>
            <div className="h-4 bg-white/10 rounded w-12"></div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}