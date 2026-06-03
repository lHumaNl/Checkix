import { useState } from 'react'
import { Button, Dropdown, Select, Space, Typography } from 'antd'
import { Settings } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { MessageKey } from '@/i18n/messages'
import type { AppLayoutSettings, AppLayoutMode, AppNavTheme } from './useLayoutSettings'

interface LayoutSettingsDropdownProps {
  settings: AppLayoutSettings
  onChange: (settings: Partial<AppLayoutSettings>) => void
}

const layoutOptions: Array<{ labelKey: MessageKey; value: AppLayoutMode }> = [
  { labelKey: 'layoutSettings.sideMenu', value: 'side' },
  { labelKey: 'layoutSettings.topMenu', value: 'top' },
]

const navThemeOptions: Array<{ labelKey: MessageKey; value: AppNavTheme }> = [
  { labelKey: 'theme.light', value: 'light' },
  { labelKey: 'theme.dark', value: 'realDark' },
]

export function LayoutSettingsDropdown({ settings, onChange }: LayoutSettingsDropdownProps) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const title = t('layoutSettings.title')

  return (
    <Dropdown
      open={open}
      trigger={['click']}
      placement="bottomRight"
      menu={{ items: [] }}
      onOpenChange={setOpen}
      popupRender={renderSettingsPanel}
    >
      <Button
        aria-label={title}
        className="!inline-flex !items-center !justify-center !leading-none"
        icon={<Settings className="block" size={18} aria-hidden="true" />}
        shape="circle"
        title={title}
        type="text"
      />
    </Dropdown>
  )

  function renderSettingsPanel() {
    return (
      <div className="w-72 rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-800 dark:bg-gray-950">
        <Space direction="vertical" size={14} className="w-full">
          <Typography.Text strong>{title}</Typography.Text>
          <SettingSelect
            label={t('layoutSettings.layoutMode')}
            value={settings.layout}
            options={localizedOptions(layoutOptions)}
            onChange={(layout) => onChange({ layout })}
          />
          <SettingSelect
            label={t('layoutSettings.navTheme')}
            value={settings.navTheme}
            options={localizedOptions(navThemeOptions)}
            onChange={(navTheme) => onChange({ navTheme })}
          />
        </Space>
      </div>
    )
  }

  function localizedOptions<T extends string>(options: Array<{ labelKey: MessageKey; value: T }>) {
    return options.map((option) => ({ label: t(option.labelKey), value: option.value }))
  }
}

interface SettingSelectProps<T extends string> {
  label: string
  value: T
  options: Array<{ label: string; value: T }>
  onChange: (value: T) => void
}

function SettingSelect<T extends string>(props: SettingSelectProps<T>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">{props.label}</span>
      <Select
        className="w-full"
        value={props.value}
        options={props.options}
        onChange={props.onChange}
        aria-label={props.label}
      />
    </label>
  )
}
