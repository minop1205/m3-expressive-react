import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { LocaleProvider, useLocale, type LocaleLabels } from './LocaleProvider'
import { Badge } from '../Badge'
import { BottomSheet } from '../BottomSheet'
import { Chip } from '../Chip'
import { DatePicker, DatePickerField } from '../DatePicker'
import { Dialog } from '../Dialog'
import { NavigationBar, NavigationBarItem } from '../NavigationBar'
import { SearchBar } from '../SearchBar'
import { Snackbar } from '../Snackbar'
import { Tab, Tabs } from '../Tabs'
import { TimePicker } from '../TimePicker'

const july15 = new Date(2024, 6, 15)

const ja: LocaleLabels = {
  Badge: {
    getLabel: (count) => (count == null ? '新しい通知' : `新しい通知 ${count} 件`),
  },
  BottomSheet: { dragHandleLabel: 'シートを閉じる', fallbackLabel: 'ボトムシート' },
  Chip: { getRemoveLabel: (label) => `${label}を削除` },
  DatePicker: {
    titleLabel: '日付を選択',
    rangeTitleLabel: '期間を選択',
    noSelectionLabel: '選択した日付',
    previousMonthLabel: '前の月',
    nextMonthLabel: '次の月',
    okLabel: 'OK',
    cancelLabel: 'キャンセル',
  },
  DatePickerField: { label: '日付', openCalendarLabel: 'カレンダーを開く' },
  Dialog: { fallbackLabel: 'ダイアログ' },
  SearchBar: { placeholder: '検索' },
  Snackbar: { dismissLabel: '閉じる' },
  TimePicker: { titleLabel: '時刻を選択', inputTitleLabel: '時刻を入力', hourLabel: '時' },
}

const weekdayRow = () =>
  screen
    .getAllByRole('columnheader')
    .map((el) => el.querySelector('[aria-hidden]')?.textContent)
    .join('')

describe('LocaleProvider', () => {
  describe('without a provider', () => {
    it('keeps the English labels and en-US', () => {
      render(
        <>
          <DatePicker value={july15} onAccept={() => {}} />
          <TimePicker />
          <Badge value={3} data-testid="badge" />
          <Snackbar message="Saved" onDismiss={() => {}} />
        </>,
      )
      expect(screen.getByText('Select date')).toBeInTheDocument()
      expect(screen.getByRole('grid', { name: 'July 2024' })).toBeInTheDocument()
      expect(weekdayRow()).toBe('SMTWTFS')
      expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      // en-US is a 12-hour locale: the AM / PM group is shown.
      expect(screen.getByRole('radiogroup', { name: 'AM or PM' })).toBeInTheDocument()
      expect(screen.getByTestId('badge')).toHaveTextContent('3 new notifications')
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
    })

    it('reports the defaults from useLocale', () => {
      let result: ReturnType<typeof useLocale> | undefined
      function Probe() {
        result = useLocale()
        return null
      }
      render(<Probe />)
      expect(result).toEqual({ locale: 'en-US', ampm: true, labels: {} })
    })

    it('renders the same markup on the server as before (no navigator.language)', () => {
      const html = renderToString(<DatePicker value={july15} />)
      expect(html).toContain('July 2024')
    })
  })

  describe('locale', () => {
    it('sets the pickers’ locale, week start and hour cycle', () => {
      render(
        <LocaleProvider locale="en-GB">
          <DatePicker value={july15} />
          <TimePicker />
        </LocaleProvider>,
      )
      expect(weekdayRow()).toBe('MTWTFSS')
      // en-GB uses a 24-hour clock: no AM / PM.
      expect(screen.queryByRole('radiogroup', { name: 'AM or PM' })).toBeNull()
    })

    it('formats month names in the provider locale', () => {
      render(
        <LocaleProvider locale="ja-JP">
          <DatePicker value={july15} />
        </LocaleProvider>,
      )
      expect(screen.getByRole('grid', { name: '2024年7月' })).toBeInTheDocument()
    })

    it('sets DatePickerField’s typed-date format', () => {
      render(
        <LocaleProvider locale="ja-JP">
          <DatePickerField value={july15} />
        </LocaleProvider>,
      )
      expect(screen.getByRole('textbox')).toHaveValue('2024/07/15')
    })

    it('a component locale prop overrides the provider', () => {
      render(
        <LocaleProvider locale="en-GB">
          <DatePicker value={july15} locale="en-US" />
        </LocaleProvider>,
      )
      expect(weekdayRow()).toBe('SMTWTFS')
    })

    it('ampm overrides the locale hour cycle, and the prop overrides ampm', () => {
      const { unmount } = render(
        <LocaleProvider locale="en-US" ampm={false}>
          <TimePicker />
        </LocaleProvider>,
      )
      expect(screen.queryByRole('radiogroup', { name: 'AM or PM' })).toBeNull()
      unmount()
      render(
        <LocaleProvider locale="en-US" ampm={false}>
          <TimePicker ampm />
        </LocaleProvider>,
      )
      expect(screen.getByRole('radiogroup', { name: 'AM or PM' })).toBeInTheDocument()
    })

    it('useLocale resolves the hour cycle from the locale', () => {
      let result: ReturnType<typeof useLocale> | undefined
      function Probe() {
        result = useLocale()
        return null
      }
      render(
        <LocaleProvider locale="ja-JP">
          <Probe />
        </LocaleProvider>,
      )
      expect(result?.locale).toBe('ja-JP')
      expect(result?.ampm).toBe(false)
    })
  })

  describe('labels', () => {
    it('localizes the date picker, including the per-mode headlines', () => {
      const { unmount } = render(
        <LocaleProvider labels={ja}>
          <DatePicker defaultValue={null} referenceDate={july15} onAccept={() => {}} />
        </LocaleProvider>,
      )
      expect(screen.getByText('日付を選択')).toBeInTheDocument()
      expect(screen.getByText('選択した日付')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '前の月' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '次の月' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'キャンセル' })).toBeInTheDocument()
      unmount()
      render(
        <LocaleProvider labels={ja}>
          <DatePicker range referenceDate={july15} />
        </LocaleProvider>,
      )
      expect(screen.getByText('期間を選択')).toBeInTheDocument()
    })

    it('localizes the docked date picker field', () => {
      render(
        <LocaleProvider labels={ja}>
          <DatePickerField />
        </LocaleProvider>,
      )
      expect(screen.getByRole('textbox', { name: '日付' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'カレンダーを開く' })).toBeInTheDocument()
    })

    it('localizes the time picker headline per mode', () => {
      const { unmount } = render(
        <LocaleProvider labels={ja}>
          <TimePicker onAccept={() => {}} />
        </LocaleProvider>,
      )
      expect(screen.getByText('時刻を選択')).toBeInTheDocument()
      expect(screen.getByRole('group', { name: '時' })).toBeInTheDocument()
      unmount()
      render(
        <LocaleProvider labels={ja}>
          <TimePicker defaultMode="input" onAccept={() => {}} />
        </LocaleProvider>,
      )
      expect(screen.getByText('時刻を入力')).toBeInTheDocument()
    })

    it('localizes Badge, and the badges of navigation items and tabs', () => {
      render(
        <LocaleProvider labels={ja}>
          <Badge value={3} data-testid="count" />
          <Badge size="small" data-testid="dot" />
          <NavigationBar value="inbox">
            <NavigationBarItem value="inbox" icon={<span />} label="受信" badge="5" />
          </NavigationBar>
          <Tabs value="a">
            <Tab value="a" label="チャット" badge={<Badge value={2} />} />
          </Tabs>
        </LocaleProvider>,
      )
      expect(screen.getByTestId('count')).toHaveTextContent('新しい通知 3 件')
      expect(screen.getByTestId('dot')).toHaveTextContent('新しい通知')
      expect(screen.getByRole('button', { name: /新しい通知 5 件/ })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: 'チャット 新しい通知 2 件' })).toBeInTheDocument()
    })

    it('localizes Snackbar, Chip and SearchBar', () => {
      render(
        <LocaleProvider labels={ja}>
          <Snackbar message="保存しました" onDismiss={() => {}} />
          <Chip variant="input" label="東京" removable onRemove={() => {}} />
          <SearchBar />
        </LocaleProvider>,
      )
      expect(screen.getByRole('button', { name: '閉じる' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '東京を削除' })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('検索')).toBeInTheDocument()
    })

    it('localizes the fallback name of an untitled dialog', () => {
      render(
        <LocaleProvider labels={ja}>
          <Dialog open onClose={() => {}}>
            本文
          </Dialog>
        </LocaleProvider>,
      )
      expect(screen.getByRole('dialog', { name: 'ダイアログ' })).toBeInTheDocument()
    })

    it('localizes the bottom sheet drag handle and fallback name', () => {
      render(
        <LocaleProvider labels={ja}>
          <BottomSheet open onClose={() => {}}>
            内容
          </BottomSheet>
        </LocaleProvider>,
      )
      expect(screen.getByRole('dialog', { name: 'ボトムシート' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'シートを閉じる' })).toBeInTheDocument()
    })

    it('a component prop overrides the provider label', () => {
      render(
        <LocaleProvider labels={ja}>
          <Snackbar message="保存しました" onDismiss={() => {}} dismissLabel="消す" />
          <Badge value={3} label="3 件" data-testid="badge" />
          <DatePicker value={july15} titleLabel="いつ?" previousMonthLabel="戻る" onAccept={() => {}} />
        </LocaleProvider>,
      )
      expect(screen.getByRole('button', { name: '消す' })).toBeInTheDocument()
      expect(screen.getByTestId('badge')).toHaveTextContent('3 件')
      expect(screen.getByTestId('badge')).not.toHaveTextContent('新しい通知')
      expect(screen.getByText('いつ?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument()
      // Keys the provider does not set keep the English default.
      expect(screen.getByRole('button', { name: 'Switch to text input mode' })).toBeInTheDocument()
    })

    it('a nested provider overrides single keys and inherits the rest', () => {
      render(
        <LocaleProvider locale="ja-JP" labels={ja}>
          <LocaleProvider labels={{ DatePicker: { nextMonthLabel: '翌月' } }}>
            <DatePicker value={july15} />
          </LocaleProvider>
        </LocaleProvider>,
      )
      expect(screen.getByRole('grid', { name: '2024年7月' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '前の月' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '翌月' })).toBeInTheDocument()
    })
  })

  it('has no axe violations with Japanese labels', async () => {
    const { container } = render(
      <LocaleProvider locale="ja-JP" labels={ja}>
        <DatePicker value={july15} onAccept={() => {}} />
        <TimePicker onAccept={() => {}} />
        <Badge value={3}>
          <svg aria-label="メール" role="img" />
        </Badge>
        <Snackbar message="保存しました" onDismiss={() => {}} />
      </LocaleProvider>,
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
