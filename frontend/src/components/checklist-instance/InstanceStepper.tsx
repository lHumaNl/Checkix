import { motion } from 'framer-motion'
import { Button, Card, Checkbox, Steps, Tag, Typography } from 'antd'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { ChecklistInstance, ChecklistItemInstance } from '@/types'

const { Text, Title } = Typography

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

  if (!currentItem) return null

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
        <Title level={2} className="!m-0 !text-lg">
          {t('checklistInstance.stepOf', { current: currentStep + 1, total: totalSteps })}
        </Title>
        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrev}
            disabled={currentStep === 0}
            icon={<ChevronLeft size={20} />}
          />
          <Button
            onClick={handleNext}
            disabled={currentStep === totalSteps - 1 || !canProceed}
            icon={<ChevronRight size={20} />}
          />
        </div>
      </div>

      <Steps
        current={currentStep}
        items={items.map((item) => ({
          status: item.is_completed ? 'finish' : 'wait',
          title: '',
        }))}
        onChange={onStepChange}
        responsive={false}
        size="small"
      />

      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        <Card>
          <div className="flex items-start gap-4">
            <Checkbox
              checked={currentResponse?.is_completed}
              onChange={() => onResponseUpdate(currentItem.id, !currentResponse?.is_completed)}
            />

            <div className="flex-1 min-w-0">
              <Title
                level={3}
                className={`!mb-0 !text-lg ${currentResponse?.is_completed ? 'line-through opacity-60' : ''}`}
              >
                {currentItem.title}
              </Title>

              {currentItem.description && (
                <Text className="mt-2 block" type="secondary">
                  {currentItem.description}
                </Text>
              )}

              {currentItem.is_required && (
                <Tag color="red" className="mt-2">{t('checklists.required')}</Tag>
              )}

              {currentResponse?.completed_at && (
                <Text className="mt-3 block text-xs" type="secondary">
                  {t('checklistInstance.completedAt', { date: new Date(currentResponse.completed_at).toLocaleTimeString() })}
                </Text>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="flex justify-between">
        <Button
          onClick={handlePrev}
          disabled={currentStep === 0}
        >
          {t('checklistInstance.previous')}
        </Button>
        <Button
          onClick={handleNext}
          disabled={currentStep === totalSteps - 1 || !canProceed}
          type="primary"
        >
          {currentStep === totalSteps - 1 ? t('checklistInstance.finish') : t('checklistInstance.next')}
        </Button>
      </div>
    </div>
  )
}
