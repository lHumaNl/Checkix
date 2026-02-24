export function ChecklistsSkeleton() {
  return (
    <div className="flex-1 animate-pulse">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="h-8 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-36 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
