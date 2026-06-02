import { Languages } from 'lucide-react'
import { languageOptions, type SupportedLanguage, useI18n } from '@/i18n'

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n()

  return (
    <label className="flex items-center gap-2 rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">
      <Languages size={18} aria-hidden="true" />
      <span className="sr-only">{t('common.language')}</span>
      <select
        aria-label={t('common.language')}
        data-testid="language-select"
        value={language}
        onChange={(event) => setLanguage(event.target.value as SupportedLanguage)}
        className="max-w-24 bg-transparent text-sm font-medium text-gray-700 outline-none dark:text-gray-200"
      >
        {languageOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
