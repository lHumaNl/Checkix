export function InstanceSkeleton() {
  return (
    <div className="flex h-full animate-pulse">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div>
              <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 flex gap-2">
                <div className="h-5 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
            <div className="h-10 w-24 rounded-lg bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="ml-4 h-10 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center p-4 gap-4">
              <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-1">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
