import { motion } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { ChecklistInstance, ChecklistItemInstance } from '@/types'

interface InstanceStepperProps {
  instance: ChecklistInstance
  currentStep: number
  onStepChange: (step: number) => void
  onResponseUpdate: (itemId: number, isChecked: boolean) => void
  canProceed: boolean
}

export function InstanceStepper({
  instance,
  currentStep,
  onStepChange,
  onResponseUpdate,
  canProceed,
}: InstanceStepperProps) {
  const { t } = useI18n()
  const items = instance.item_instances ?? []
  const totalSteps = items.length

  const currentItem = items[currentStep]
  const currentResponse: ChecklistItemInstance | undefined = currentItem

  const handleNext = () => {
    if (canProceed && currentStep < totalSteps - 1) {
      onStepChange(currentStep + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      onStepChange(currentStep - 1)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('checklistInstance.stepOf', { current: currentStep + 1, total: totalSteps })}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            disabled={currentStep === totalSteps - 1 || !canProceed}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {items.map((item, index) => {
          const isCompleted = item.is_completed
          const isCurrent = index === currentStep

          return (
            <button
              key={item.id}
              onClick={() => onStepChange(index)}
              className={`flex-shrink-0 w-8 h-2 rounded-full transition-all ${
                isCurrent
                  ? 'bg-blue-500 w-12'
                  : isCompleted
                  ? 'bg-green-500'
                  : 'bg-gray-300 dark:bg-gray-700'
              }`}
            />
          )
        })}
      </div>

      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
      >
        <div className="flex items-start gap-4">
          <button
            onClick={() => onResponseUpdate(currentItem.id, !currentResponse?.is_completed)}
            className={`flex-shrink-0 w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${
              currentResponse?.is_completed
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 dark:border-gray-600 hover:border-green-500'
            }`}
          >
            {currentResponse?.is_completed && <Check size={18} />}
          </button>

          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-medium ${
              currentResponse?.is_completed
                ? 'text-gray-400 dark:text-gray-500 line-through'
                : 'text-gray-900 dark:text-white'
            }`}>
              {currentItem.title}
            </h3>

            {currentItem.description && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {currentItem.description}
              </p>
            )}

            {currentItem.is_required && (
              <span className="mt-2 inline-block text-xs text-red-600 dark:text-red-400">
                * {t('checklists.required')}
              </span>
            )}

            {currentResponse?.completed_at && (
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                {t('checklistInstance.completedAt', { date: new Date(currentResponse.completed_at).toLocaleTimeString() })}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      <div className="flex justify-between">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {t('checklistInstance.previous')}
        </button>
        <button
          onClick={handleNext}
          disabled={currentStep === totalSteps - 1 || !canProceed}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {currentStep === totalSteps - 1 ? t('checklistInstance.finish') : t('checklistInstance.next')}
        </button>
      </div>
    </div>
  )
}
