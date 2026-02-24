export function CalendarSkeleton() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-4 animate-pulse">
      <div className="lg:w-64 shrink-0 space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
          <div className="grid grid-cols-7 gap-1">
            {[...Array(7)].map((_, i) => (
              <div key={`h-${i}`} className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
            ))}
            {[...Array(35)].map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-gray-200 dark:bg-gray-700" />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="h-5 w-36 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-700" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="h-full bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 w-40 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="flex gap-2">
              <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-8 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            {[...Array(7)].map((_, i) => (
              <div key={`hd-${i}`} className="h-8 bg-gray-100 dark:bg-gray-800" />
            ))}
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-white dark:bg-gray-900" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
