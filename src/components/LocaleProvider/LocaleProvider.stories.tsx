import type { Meta, StoryObj } from '@storybook/react'
import Mail from '@material-symbols/svg-400/outlined/mail.svg?react'
import { LocaleProvider, type LocaleLabels } from './LocaleProvider'
import { Badge } from '../Badge'
import { DatePicker } from '../DatePicker'
import { Snackbar } from '../Snackbar'
import { TimePicker } from '../TimePicker'

/** The Japanese example from the i18n guide (site/docs/i18n.mdx). */
const ja: LocaleLabels = {
  Badge: {
    getLabel: (count) => (count == null ? '新しい通知' : `新しい通知 ${count} 件`),
  },
  DatePicker: {
    titleLabel: '日付を選択',
    rangeTitleLabel: '期間を選択',
    rangeInputTitleLabel: '期間を入力',
    noSelectionLabel: '日付',
    inputNoSelectionLabel: '日付',
    previousMonthLabel: '前の月',
    nextMonthLabel: '次の月',
    selectYearLabel: '年を選択',
    todayLabel: '今日',
    switchToInputLabel: 'テキスト入力に切り替え',
    switchToCalendarLabel: 'カレンダーに切り替え',
    okLabel: 'OK',
    cancelLabel: 'キャンセル',
  },
  Snackbar: { dismissLabel: '閉じる' },
  TimePicker: {
    titleLabel: '時刻を選択',
    inputTitleLabel: '時刻を入力',
    hourLabel: '時',
    minuteLabel: '分',
    okLabel: 'OK',
    cancelLabel: 'キャンセル',
  },
}

const meta = {
  title: 'Components/LocaleProvider',
  component: LocaleProvider,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof LocaleProvider>

export default meta
type Story = StoryObj<typeof meta>

/** ja-JP: month / weekday names, Sunday-first weeks, a 24-hour clock and Japanese labels. */
export const Japanese: Story = {
  args: { locale: 'ja-JP', labels: ja },
  render: (args) => (
    <LocaleProvider {...args}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
        <DatePicker
          defaultValue={new Date(2026, 9, 15)}
          referenceDate={new Date(2026, 9, 15)}
          onAccept={() => {}}
        />
        <TimePicker defaultValue={{ hour: 18, minute: 30 }} onAccept={() => {}} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Badge value={3}>
            <Mail width={24} height={24} aria-label="メール" role="img" />
          </Badge>
          <Snackbar message="保存しました" onDismiss={() => {}} />
        </div>
      </div>
    </LocaleProvider>
  ),
}
