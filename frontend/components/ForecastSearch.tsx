'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { forecastData } from '../app/data';

type Props = {
  dateValue: string;
  onDateChange: (value: string) => void;
};

type CalendarMonth = { year: number; month: number };

const weekdayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatIsoDate(date: Date) {
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

function monthFromDate(date: Date): CalendarMonth {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function compareMonths(left: CalendarMonth, right: CalendarMonth) {
  return left.year * 12 + left.month - (right.year * 12 + right.month);
}

function monthTitle(month: CalendarMonth) {
  const label = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(month.year, month.month, 1)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dateTitle(date: Date | null) {
  return date ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date) : 'Выберите дату';
}

function weekdayTitle(date: Date | null) {
  if (!date) return 'Выберите дату';
  const label = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', timeZone: 'UTC' }).format(date);
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`;
}

function sameDate(left: Date | null, right: Date | null) {
  return Boolean(left && right && formatIsoDate(left) === formatIsoDate(right));
}

export function ForecastSearch({ dateValue, onDateChange }: Props) {
  const data = forecastData.day;
  const minDate = parseIsoDate(data.min);
  const maxDate = parseIsoDate(data.max);
  const selectedDate = parseIsoDate(dateValue) ?? parseIsoDate(data.inputValue);
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState<CalendarMonth>(monthFromDate(selectedDate ?? new Date()));
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const minMonth = minDate ? monthFromDate(minDate) : visibleMonth;
  const maxMonth = maxDate ? monthFromDate(maxDate) : visibleMonth;
  const calendarDays = useMemo(() => {
    const offset = (new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)).getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + 1, 0)).getUTCDate();
    const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, index) => {
      const day = index - offset + 1;
      return day < 1 || day > daysInMonth ? null : new Date(Date.UTC(visibleMonth.year, visibleMonth.month, day));
    });
  }, [visibleMonth]);

  function moveMonth(delta: number) {
    const next = { year: visibleMonth.year, month: visibleMonth.month + delta };
    if (compareMonths(next, minMonth) < 0 || compareMonths(next, maxMonth) > 0) return;
    setVisibleMonth(next);
  }

  function chooseDate(date: Date) {
    if (minDate && date < minDate) return;
    if (maxDate && date > maxDate) return;
    onDateChange(formatIsoDate(date));
    setOpen(false);
  }

  function shiftDate(delta: number) {
    if (!selectedDate) return;
    const nextDate = new Date(selectedDate);
    nextDate.setUTCDate(nextDate.getUTCDate() + delta);
    if ((minDate && nextDate < minDate) || (maxDate && nextDate > maxDate)) return;
    onDateChange(formatIsoDate(nextDate));
    setVisibleMonth(monthFromDate(nextDate));
  }

  const atMinDate = Boolean(selectedDate && minDate && sameDate(selectedDate, minDate));
  const atMaxDate = Boolean(selectedDate && maxDate && sameDate(selectedDate, maxDate));
  const rangeLabel = minDate && maxDate ? `${dateTitle(minDate)} — ${dateTitle(maxDate)}` : 'Доступный период прогноза';

  return (
    <section className="query-panel" aria-labelledby="query-title">
      <div className="content-width">
        <div className="query-heading"><h1 id="query-title">Где ожидается пиковый пассажиропоток?</h1></div>
        <div className="query-form">
          <div className="field date-field date-field-expanded"><div className="date-field-heading"><span>{data.dateLabel} прогноза</span><small>Доступный период: {rangeLabel}</small></div><div className="date-control-row">
            <button className="date-step-button" type="button" aria-label="Предыдущий день" disabled={atMinDate} onClick={() => shiftDate(-1)}><ChevronLeft size={22} aria-hidden="true" /></button>
            <div className="date-picker" ref={pickerRef}>
            <button className="date-picker-trigger date-picker-trigger-expanded" type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span className="date-picker-copy"><strong>{dateTitle(selectedDate)}</strong><small>{weekdayTitle(selectedDate)}</small></span><CalendarDays size={22} aria-hidden="true" /></button>
            {open && <div className="date-picker-popover" role="dialog" aria-label="Выбор даты">
              <div className="date-picker-toolbar"><button type="button" aria-label="Предыдущий месяц" disabled={compareMonths(visibleMonth, minMonth) <= 0} onClick={() => moveMonth(-1)}><ChevronLeft size={18} aria-hidden="true" /></button><strong>{monthTitle(visibleMonth)}</strong><button type="button" aria-label="Следующий месяц" disabled={compareMonths(visibleMonth, maxMonth) >= 0} onClick={() => moveMonth(1)}><ChevronRight size={18} aria-hidden="true" /></button></div>
              <div className="date-picker-weekdays" aria-hidden="true">{weekdayLabels.map((label) => <span key={label}>{label}</span>)}</div>
              <div className="date-picker-grid" role="grid">{calendarDays.map((date, index) => {
                if (!date) return <span className="date-picker-empty" key={`empty-${index}`} aria-hidden="true" />;
                const disabled = Boolean((minDate && date < minDate) || (maxDate && date > maxDate));
                return <button className={`date-picker-day${sameDate(date, selectedDate) ? ' selected' : ''}`} key={formatIsoDate(date)} type="button" role="gridcell" aria-selected={sameDate(date, selectedDate)} disabled={disabled} onClick={() => chooseDate(date)}>{date.getUTCDate()}</button>;
              })}</div>
            </div>}
            </div>
            <button className="date-step-button" type="button" aria-label="Следующий день" disabled={atMaxDate} onClick={() => shiftDate(1)}><ChevronRight size={22} aria-hidden="true" /></button>
          </div></div>
        </div>
      </div>
    </section>
  );
}
