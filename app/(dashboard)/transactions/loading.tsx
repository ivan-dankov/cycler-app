import { Skeleton } from '@/components/ui'

export default function TransactionsLoading() {
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-40" />
        
        {/* Filter/Search bar */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Transactions list */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-4 flex-1">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-5 w-20 ml-auto" />
                <Skeleton className="h-4 w-16 ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


