import { Languages } from 'lucide-react'
import { Select } from 'antd'
import { languageOptions, type SupportedLanguage, useI18n } from '@/i18n'

export function LanguageSelector({ className = 'w-[4.5rem] sm:w-28' }: { className?: string }) {
  const { language, setLanguage, t } = useI18n()
  const selectorClassName = `checkix-language-selector ${className}`

  return (
    <Select
      aria-label={t('common.language')}
      className={selectorClassName}
      data-testid="language-select"
      options={languageOptions.map((option) => ({ label: option.label, value: option.code }))}
      prefix={<Languages size={16} aria-hidden="true" />}
      value={language}
      onChange={(value) => setLanguage(value as SupportedLanguage)}
    />
  )
}
