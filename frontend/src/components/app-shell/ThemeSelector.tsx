import { useState } from 'react'
import { Button, Dropdown, Segmented, Space } from 'antd'
import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemeMode } from '@/hooks/useTheme'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'

const themeOptions: Array<{ labelKey: MessageKey; value: ThemeMode; icon: typeof Sun }> = [
  { labelKey: 'theme.light', value: 'light', icon: Sun },
  { labelKey: 'theme.dark', value: 'dark', icon: Moon },
  { labelKey: 'theme.system', value: 'system', icon: Monitor },
]

export function ThemeSelector() {
  const [open, setOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const { t } = useI18n()
  const currentTheme = themeOptions.find((option) => option.value === theme)
  const CurrentIcon = currentTheme?.icon ?? Monitor
  const currentLabel = currentTheme ? t(currentTheme.labelKey) : theme

  return (
    <Dropdown
      open={open}
      trigger={['click']}
      placement="bottomRight"
      menu={{ items: [] }}
      onOpenChange={setOpen}
      popupRender={() => (
        <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-800 dark:bg-gray-950">
          <Segmented
            aria-label={t('common.theme')}
            value={theme}
            onChange={(value) => {
              setTheme(value as ThemeMode)
              setOpen(false)
            }}
            options={themeOptions.map((option) => {
              const Icon = option.icon
              return {
                value: option.value,
                label: (
                  <Space size={6}>
                    <Icon size={14} aria-hidden="true" />
                    <span>{t(option.labelKey)}</span>
                  </Space>
                ),
              }
            })}
          />
        </div>
      )}
    >
      <Button
        aria-label={`${t('common.theme')}: ${currentLabel}`}
        className="!inline-flex !items-center !justify-center !leading-none"
        icon={<CurrentIcon className="block" size={18} aria-hidden="true" />}
        shape="circle"
        title={`${t('common.theme')}: ${currentLabel}`}
        type="text"
      />
    </Dropdown>
  )
}
