import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Play, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { isAxiosError } from 'axios'
import { useExecuteRunLink } from '@/api/useRunLinks'

const getErrorMessage = (error: unknown) => {
  if (isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? 'Failed to execute run link'
  }

  return 'Failed to execute run link'
}

export function RunLinkExecutePage() {
  const { uniqueId } = useParams<{ uniqueId: string }>()
  const [instanceId, setInstanceId] = useState<string | null>(null)
  const executeRunLink = useExecuteRunLink()

  const handleExecute = () => {
    if (!uniqueId) return
    executeRunLink.mutate(uniqueId, {
      onSuccess: (result) => {
        setInstanceId(result.instance_id)
      },
    })
  }

  if (instanceId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="text-green-600 dark:text-green-400" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Checklist Started!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Your checklist instance has been created successfully.
          </p>
          <Link
            to={`/instances/${instanceId}`}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <ExternalLink size={18} />
            Open Checklist
          </Link>
        </div>
      </div>
    )
  }

  const errorMessage = executeRunLink.error ? getErrorMessage(executeRunLink.error) : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-6">
          <Play className="text-blue-600 dark:text-blue-400 ml-1" size={32} />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Run Checklist
        </h1>

        <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-6 break-all">
          {uniqueId}
        </p>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm mb-6 text-left">
            <AlertTriangle size={16} className="flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Click the button below to start a new checklist instance from this run link.
        </p>

        <button
          onClick={handleExecute}
          disabled={executeRunLink.isPending}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={20} />
          {executeRunLink.isPending ? 'Starting…' : 'Start Checklist'}
        </button>

        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
          Powered by{' '}
          <Link to="/" className="underline hover:text-gray-600 dark:hover:text-gray-300">
            Checkix
          </Link>
        </p>
      </div>
    </div>
  )
}
