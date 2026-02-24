export function ChecklistDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div>
            <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 flex gap-2">
              <div className="h-5 w-14 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-5 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-20 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="space-y-1">
                  <div className="h-3 w-12 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-5 w-8 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
          <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                <div className="h-6 w-6 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
