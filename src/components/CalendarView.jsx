import { useMemo, useState } from "react";
import SummaryStats from "./SummaryStats";
import {
  calculateSchedule,
  formatDuration,
  formatTime,
  getProgressStatus,
  getTypeColor,
  normalizeSettings,
} from "../utils/time";

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateHeading(dateKey) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(fromDateKey(dateKey));
}

function buildCalendarDays(monthDate) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

function getScheduleItems(schedule) {
  const items = schedule.blocks.map((block) => ({
    id: block.id,
    kind: "block",
    block,
  }));

  if (schedule.freeBlock) {
    const index = Math.min(
      Math.max(0, Number(schedule.freeBlock.orderIndex) || 0),
      items.length,
    );
    items.splice(index, 0, {
      id: "auto-fun-block",
      kind: "free",
      block: {
        ...schedule.freeBlock,
        label: "Fun Time",
        type: "Fun",
      },
    });
  }

  return items;
}

export default function CalendarView({
  days,
  selectedDate,
  currentTime,
  onSelectDate,
  onOpenPlanner,
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => fromDateKey(selectedDate));
  const todayKey = toDateKey(currentTime || new Date());
  const selectedDay = days[selectedDate] || {
    blocks: [],
    settings: normalizeSettings(),
  };
  const selectedSchedule = useMemo(
    () => calculateSchedule(selectedDay.blocks || [], selectedDay.settings || {}),
    [selectedDay],
  );
  const scheduleItems = getScheduleItems(selectedSchedule);
  const calendarDays = buildCalendarDays(visibleMonth);
  const visibleMonthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const typeDefinitions = selectedDay.settings?.typeDefinitions;

  function shiftMonth(direction) {
    setVisibleMonth((current) => new Date(
      current.getFullYear(),
      current.getMonth() + direction,
      1,
    ));
  }

  function selectDate(dateKey) {
    onSelectDate(dateKey);
  }

  return (
    <section className="calendar-layout">
      <div className="panel calendar-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Calendar</p>
            <h2>{visibleMonthLabel}</h2>
          </div>
          <div className="month-actions">
            <button type="button" className="icon-button" onClick={() => shiftMonth(-1)}>
              Previous
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setVisibleMonth(fromDateKey(todayKey))}
            >
              Today
            </button>
            <button type="button" className="icon-button" onClick={() => shiftMonth(1)}>
              Next
            </button>
          </div>
        </div>

        <div className="calendar-weekdays" aria-hidden="true">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="calendar-grid">
          {calendarDays.map((date) => {
            const dateKey = toDateKey(date);
            const dayData = days[dateKey];
            const daySchedule = dayData
              ? calculateSchedule(dayData.blocks || [], dayData.settings || {})
              : null;
            const isSelected = dateKey === selectedDate;
            const isToday = dateKey === todayKey;
            const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
            const hasBlocks = Boolean(dayData?.blocks?.length);

            return (
              <button
                type="button"
                className={`calendar-day ${isSelected ? "selected" : ""} ${isToday ? "today" : ""} ${isCurrentMonth ? "" : "muted-day"} ${hasBlocks ? "has-plan" : ""}`}
                key={dateKey}
                onClick={() => selectDate(dateKey)}
                aria-current={isToday ? "date" : undefined}
                aria-pressed={isSelected}
              >
                <span>{date.getDate()}</span>
                {daySchedule ? (
                  <strong>{formatDuration(daySchedule.stats.totalStudyTime)}</strong>
                ) : isToday ? (
                  <strong>Today</strong>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="calendar-preview">
        <div className="preview-header">
          <div>
            <p className="eyebrow">Selected day</p>
            <h2>{formatDateHeading(selectedDate)}</h2>
          </div>
          <button type="button" className="primary-button" onClick={onOpenPlanner}>
            Edit Day
          </button>
        </div>

        <SummaryStats stats={selectedSchedule.stats} />

        <div className="calendar-schedule">
          {scheduleItems.length === 0 ? (
            <div className="empty-state">No blocks for this day.</div>
          ) : (
            scheduleItems.map((item) => {
              const block = item.block;
              const color = getTypeColor(block.type, typeDefinitions);
              const progressStatus = getProgressStatus(selectedDate, block, currentTime);

              return (
                <article
                  className={`block-card progress-${progressStatus} ${item.kind === "free" ? "auto-fun-block" : ""} ${block.overflows ? "overflowing" : ""}`}
                  key={item.id}
                  style={{ "--block-color": color }}
                >
                  <span className="block-color-dot" style={{ backgroundColor: color }} />
                  <div className="block-time">
                    <strong>
                      {formatTime(block.start)}-{formatTime(block.end)}
                    </strong>
                  </div>
                  <div className="block-summary">
                    <h3>{block.label || "Untitled block"}</h3>
                  </div>
                  <span className="type-chip" style={{ "--chip-color": color }}>
                    {block.type}
                  </span>
                </article>
              );
            })
          )}
        </div>
      </aside>
    </section>
  );
}
