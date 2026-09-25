'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Role } from '@/types/database';
import { getSupabaseClient } from '@/lib/supabase/client';

export interface CalendarEventItem {
  id: string;
  type: 'role' | 'interview';
  title: string;
  company?: string;
  date: Date;
  roleId: string;
  badgeText: string;
  primaryActionText: string;
  primaryUrl: string;
}

interface CalendarWidgetProps {
  roles?: Role[];
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function CalendarWidget({ roles = [] }: CalendarWidgetProps) {
  // 1. Initial State from sessionStorage (Requirement 7: Session persistence & tab stability)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('rolewise_calendar_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.selectedDate) {
            const d = new Date(parsed.selectedDate);
            if (!isNaN(d.getTime())) return d;
          }
        }
      } catch {
        // Ignore
      }
    }
    return new Date();
  });

  const [currentYear, setCurrentYear] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('rolewise_calendar_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.year === 'number') return parsed.year;
        }
      } catch {
        // Ignore
      }
    }
    return new Date().getFullYear();
  });

  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('rolewise_calendar_state');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.month === 'number') return parsed.month;
        }
      } catch {
        // Ignore
      }
    }
    return new Date().getMonth();
  });

  // Additional interview records loaded directly from Supabase (Requirement 4)
  const [dbInterviews, setDbInterviews] = useState<Array<{ id: string; role_id: string; started_at: string; status: string }>>([]);

  useEffect(() => {
    let isCancelled = false;
    async function loadInterviews() {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) return;

        const { data, error } = await supabase
          .from('interviews')
          .select('id, role_id, started_at, status')
          .eq('user_id', user.id);

        if (!error && data && !isCancelled) {
          setDbInterviews(data);
        }
      } catch {
        // Table may not have rows or migration; continue with roles data
      }
    }
    loadInterviews();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Save calendar state to sessionStorage on changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          'rolewise_calendar_state',
          JSON.stringify({
            selectedDate: selectedDate.toISOString(),
            year: currentYear,
            month: currentMonth,
          })
        );
      } catch {
        // Ignore
      }
    }
  }, [selectedDate, currentYear, currentMonth]);

  // Month navigation (Requirement 2: Handles Dec -> Jan and Jan -> Dec)
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  // Today button handler (Requirement 3: Navigates to actual current date)
  const handleToday = () => {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
    setSelectedDate(today);
  };

  // Build real user events from roles and interviews (Requirement 4 & 5)
  const allEvents = useMemo<CalendarEventItem[]>(() => {
    const list: CalendarEventItem[] = [];

    // Map real user roles
    roles.forEach((r) => {
      if (r.created_at) {
        const d = new Date(r.created_at);
        if (!isNaN(d.getTime())) {
          list.push({
            id: `role-${r.id}`,
            type: 'role',
            title: r.title,
            company: r.company,
            date: d,
            roleId: r.id,
            badgeText: 'Target Role',
            primaryActionText: 'Start Interview',
            primaryUrl: `/roles/${r.id}/interview`,
          });
        }
      }
    });

    // Map real interview sessions
    dbInterviews.forEach((intv) => {
      if (intv.started_at) {
        const d = new Date(intv.started_at);
        if (!isNaN(d.getTime())) {
          const matchedRole = roles.find((r) => r.id === intv.role_id);
          list.push({
            id: `interview-${intv.id}`,
            type: 'interview',
            title: matchedRole ? `${matchedRole.title} Practice` : 'AI Interview Practice',
            company: matchedRole?.company,
            date: d,
            roleId: intv.role_id,
            badgeText: intv.status === 'completed' ? 'Completed' : 'Practice Session',
            primaryActionText: 'Resume Interview',
            primaryUrl: `/roles/${intv.role_id}/interview`,
          });
        }
      }
    });

    return list;
  }, [roles, dbInterviews]);

  // Real events on currently selected date
  const eventsOnSelectedDate = useMemo(() => {
    return allEvents.filter((ev) => isSameDay(ev.date, selectedDate));
  }, [allEvents, selectedDate]);

  // Calendar days grid computation
  const { monthName, calendarCells } = useMemo(() => {
    const mName = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(
      new Date(currentYear, currentMonth, 1)
    );

    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    interface CellInfo {
      day: number;
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasEvents: boolean;
      ariaLabel: string;
    }

    const cells: CellInfo[] = [];
    const today = new Date();

    // 1. Previous month trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const d = new Date(prevYear, prevMonth, dNum);
      const isSel = isSameDay(d, selectedDate);
      const hasEv = allEvents.some((e) => isSameDay(e.date, d));

      cells.push({
        day: dNum,
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
        isSelected: isSel,
        hasEvents: hasEv,
        ariaLabel: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(d),
      });
    }

    // 2. Current month days
    for (let dNum = 1; dNum <= daysInCurrentMonth; dNum++) {
      const d = new Date(currentYear, currentMonth, dNum);
      const isSel = isSameDay(d, selectedDate);
      const hasEv = allEvents.some((e) => isSameDay(e.date, d));

      cells.push({
        day: dNum,
        date: d,
        isCurrentMonth: true,
        isToday: isSameDay(d, today),
        isSelected: isSel,
        hasEvents: hasEv,
        ariaLabel: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(d),
      });
    }

    // 3. Next month leading days (fill out row to complete 35 or 42 grid cells)
    const totalCurrentCells = cells.length;
    const remainingSlots = (7 - (totalCurrentCells % 7)) % 7;
    for (let nextDay = 1; nextDay <= remainingSlots; nextDay++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const d = new Date(nextYear, nextMonth, nextDay);
      const isSel = isSameDay(d, selectedDate);
      const hasEv = allEvents.some((e) => isSameDay(e.date, d));

      cells.push({
        day: nextDay,
        date: d,
        isCurrentMonth: false,
        isToday: isSameDay(d, today),
        isSelected: isSel,
        hasEvents: hasEv,
        ariaLabel: new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(d),
      });
    }

    return { monthName: mName, calendarCells: cells };
  }, [currentYear, currentMonth, selectedDate, allEvents]);

  // Click on a date cell (handles month transition if clicking previous/next month days)
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    if (date.getMonth() !== currentMonth) {
      setCurrentMonth(date.getMonth());
      setCurrentYear(date.getFullYear());
    }
  };

  // Formatted date string for selected date display
  const formattedSelectedDate = useMemo(() => {
    const today = new Date();
    if (isSameDay(selectedDate, today)) {
      return `Today, ${new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(selectedDate)}`;
    }
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(selectedDate);
  }, [selectedDate]);

  return (
    <div className="rolewise-card p-5 space-y-4">
      {/* Month Navigation & Today Controls */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#252525]">
          {monthName} {currentYear}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleToday}
            aria-label="Go to today"
            className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-[#FFD84D] hover:bg-[#FFF2B8] transition-colors cursor-pointer"
          >
            Today
          </button>
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="p-1 rounded-md text-[#73757A] hover:text-[#252525] hover:bg-[#FAF9F4] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label="Next month"
            className="p-1 rounded-md text-[#73757A] hover:text-[#252525] hover:bg-[#FAF9F4] transition-colors cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Weekday Header */}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, idx) => (
          <span key={idx} className="text-[#9A9B9E] font-medium py-0.5">
            {d}
          </span>
        ))}

        {/* Days Grid (Requirement 1 & 8) */}
        {calendarCells.map((cell, idx) => {
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectDate(cell.date)}
              aria-label={cell.ariaLabel}
              aria-pressed={cell.isSelected}
              aria-current={cell.isToday ? 'date' : undefined}
              className={`py-1.5 px-0.5 rounded-md text-[11px] flex flex-col items-center justify-center transition-all cursor-pointer relative group ${
                cell.isSelected
                  ? 'bg-[#FFD84D] text-[#252525] font-semibold shadow-xs'
                  : cell.isToday
                  ? 'border border-[#FFD84D] text-[#FFD84D] font-semibold hover:bg-[#FFF2B8]'
                  : cell.isCurrentMonth
                  ? 'text-[#252525] hover:bg-[#F3F2EE]'
                  : 'text-[#9A9B9E]/50 hover:bg-[#F3F2EE]'
              }`}
            >
              <span>{cell.day}</span>
              {/* Event indicator dot */}
              {cell.hasEvents && (
                <span
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    cell.isSelected ? 'bg-[#252525]' : 'bg-[#FFD84D]'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Date Details & Real Event List (Requirement 5 & 6) */}
      <div className="pt-3 border-t border-[#D9D8D2] space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#252525]">{formattedSelectedDate}</span>
          {eventsOnSelectedDate.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#FFF2B8] text-[#FFD84D] text-[10px] font-semibold">
              {eventsOnSelectedDate.length} {eventsOnSelectedDate.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        {eventsOnSelectedDate.length > 0 ? (
          <div className="space-y-1.5">
            {eventsOnSelectedDate.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-xl border border-[#D9D8D2] bg-[#FAF9F4] hover:border-[#FFD84D] transition-all space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-[#252525] leading-snug">{ev.title}</p>
                    {ev.company && <p className="text-[11px] text-[#73757A]">{ev.company}</p>}
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white border border-[#D9D8D2] text-[#FFD84D] shrink-0">
                    {ev.badgeText}
                  </span>
                </div>
                <div className="pt-1 flex items-center justify-between text-[11px]">
                  <Link
                    href={`/roles/${ev.roleId}/fit`}
                    className="text-[#73757A] hover:text-[#252525] font-medium transition-colors"
                  >
                    View Fit
                  </Link>
                  <Link
                    href={ev.primaryUrl}
                    className="font-semibold text-[#FFD84D] hover:underline flex items-center gap-1"
                  >
                    <span>{ev.primaryActionText}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-2.5 px-3 rounded-xl bg-[#FAF9F4] border border-[#D9D8D2] text-center space-y-1">
            <p className="text-xs text-[#73757A]">No activity scheduled</p>
            <div className="flex items-center justify-center gap-2 text-[11px]">
              <Link
                href="/jobs/new"
                className="font-semibold text-[#FFD84D] hover:underline flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>Add job</span>
              </Link>
              <span className="text-[#D0D5DD]">·</span>
              <Link
                href="/communication-practice"
                className="font-semibold text-[#FFD84D] hover:underline"
              >
                Practice
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
