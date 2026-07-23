import { useEffect, useMemo, useRef, useState } from "react";
import BlockForm from "./components/BlockForm";
import CalendarView from "./components/CalendarView";
import BlockList from "./components/BlockList";
import Modal, { resetBodyScrollLock } from "./components/Modal";
import NowNudge from "./components/NowNudge";
import SummaryStats from "./components/SummaryStats";
import TypeBreakdown from "./components/TypeBreakdown";
import TypeEditor from "./components/TypeEditor";
import {
  DEFAULT_SETTINGS,
  calculateSchedule,
  createId,
  getCurrentActivity,
  normalizeBlock,
  normalizeSettings,
  normalizeTypeDefinitions,
} from "./utils/time";
import {
  STORAGE_KEYS,
  clearPlannerStorage,
  loadFromStorage,
  saveToStorage,
} from "./utils/storage";

function moveItem(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || toIndex >= items.length) {
    return items;
  }
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function getFreeBlockIndex(settings, blockCount) {
  return settings.freeBlockIndex === null
    ? blockCount
    : Math.min(settings.freeBlockIndex, blockCount);
}

function getVisualOrder(blockIds, freeBlockIndex, includeFreeBlock) {
  const order = [...blockIds];
  if (!includeFreeBlock) return order;
  const index = Math.min(Math.max(0, freeBlockIndex), blockIds.length);
  order.splice(index, 0, "auto-fun-block");
  return order;
}

function lockedPositionsChanged(currentBlocks, nextBlocks, currentSettings, nextFreeBlockIndex, includeFreeBlock) {
  const currentFreeBlockIndex = getFreeBlockIndex(currentSettings, currentBlocks.length);
  const currentOrder = getVisualOrder(
    currentBlocks.map((block) => block.id),
    currentFreeBlockIndex,
    includeFreeBlock,
  );
  const nextOrder = getVisualOrder(
    nextBlocks.map((block) => block.id),
    nextFreeBlockIndex,
    includeFreeBlock,
  );

  return currentBlocks.some((block) => (
    block.locked && currentOrder.indexOf(block.id) !== nextOrder.indexOf(block.id)
  ));
}

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  return getDateKey(new Date());
}

function getSettingsForNewDay(days, preferredDateKey, fallbackSettings = DEFAULT_SETTINGS) {
  if (preferredDateKey && days[preferredDateKey]?.settings) {
    return days[preferredDateKey].settings;
  }

  const latestDay = Object.entries(days)
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([, dayData]) => dayData)[0];

  return latestDay?.settings || fallbackSettings;
}

function formatSelectedDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function normalizeDayData(dayData = {}, fallbackSettings = DEFAULT_SETTINGS) {
  const settings = normalizeSettings({
    ...fallbackSettings,
    ...(dayData.settings || {}),
  });
  const blocks = Array.isArray(dayData.blocks)
    ? dayData.blocks.map((block) => normalizeBlock(block, settings.typeDefinitions))
    : [];

  return {
    settings,
    blocks,
    updatedAt: dayData.updatedAt || "",
  };
}

function createBlankDay(settings = DEFAULT_SETTINGS) {
  return {
    settings: normalizeSettings(settings),
    blocks: [],
    updatedAt: "",
  };
}

function createInitialPlannerState() {
  const todayKey = getTodayKey();
  const storedSelectedDate = loadFromStorage(STORAGE_KEYS.selectedDate, todayKey);
  const legacySettings = normalizeSettings({
    ...DEFAULT_SETTINGS,
    ...loadFromStorage(STORAGE_KEYS.settings, {}),
  });
  const legacyBlocks = loadFromStorage(STORAGE_KEYS.blocks, []).map((block) =>
    normalizeBlock(block, legacySettings.typeDefinitions),
  );
  const storedDays = loadFromStorage(STORAGE_KEYS.days, {});
  const normalizedDays = {};

  Object.entries(storedDays || {}).forEach(([dateKey, dayData]) => {
    normalizedDays[dateKey] = normalizeDayData(dayData, legacySettings);
  });

  // Keep any previously selected day in the calendar, then always open on today.
  if (storedSelectedDate && !normalizedDays[storedSelectedDate] && storedSelectedDate !== todayKey) {
    normalizedDays[storedSelectedDate] = {
      settings: legacySettings,
      blocks: legacyBlocks,
      updatedAt: legacyBlocks.length ? new Date().toISOString() : "",
    };
  }

  if (!normalizedDays[todayKey]) {
    const inheritedSettings = getSettingsForNewDay(
      normalizedDays,
      storedSelectedDate,
      legacySettings,
    );
    normalizedDays[todayKey] = createBlankDay(inheritedSettings);
  }

  saveToStorage(STORAGE_KEYS.days, normalizedDays);
  saveToStorage(STORAGE_KEYS.selectedDate, todayKey);
  saveToStorage(STORAGE_KEYS.blocks, normalizedDays[todayKey].blocks);
  saveToStorage(STORAGE_KEYS.settings, normalizedDays[todayKey].settings);

  return {
    days: normalizedDays,
    selectedDate: todayKey,
  };
}

export default function App() {
  const [plannerState, setPlannerState] = useState(createInitialPlannerState);
  const [activeTab, setActiveTab] = useState("planner");
  const [saveMessage, setSaveMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [nudgeEnabled, setNudgeEnabled] = useState(() =>
    Boolean(loadFromStorage(STORAGE_KEYS.nudgeEnabled, true)),
  );
  const [nudgeOpen, setNudgeOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const followedDateRef = useRef(getTodayKey());
  const nudgeReadyRef = useRef(false);
  const nudgeEnabledRef = useRef(nudgeEnabled);
  const todayBlockCountRef = useRef(0);
  const { days, selectedDate } = plannerState;
  const currentDay = days[selectedDate] || createBlankDay();
  const settings = currentDay.settings;
  const blocks = currentDay.blocks;
  const todayKey = useMemo(() => getDateKey(currentTime), [currentTime]);
  const todayDay = days[todayKey] || createBlankDay(settings);
  nudgeEnabledRef.current = nudgeEnabled;
  todayBlockCountRef.current = todayDay.blocks.length;

  const schedule = useMemo(
    () => calculateSchedule(blocks, settings),
    [blocks, settings],
  );
  const todaySchedule = useMemo(
    () => calculateSchedule(todayDay.blocks, todayDay.settings),
    [todayDay],
  );
  const todayActivity = useMemo(
    () => getCurrentActivity(todaySchedule, todayKey, currentTime),
    [todaySchedule, todayKey, currentTime],
  );

  useEffect(() => {
    function tryShowNudge() {
      if (!nudgeEnabledRef.current) return;
      if (!todayBlockCountRef.current) return;
      setNudgeOpen(true);
    }

    const timer = window.setInterval(() => setCurrentTime(new Date()), 1000);

    function syncClock() {
      setCurrentTime(new Date());
    }

    function handleVisibility() {
      syncClock();
      if (document.visibilityState === "visible" && nudgeReadyRef.current) {
        tryShowNudge();
      }
    }

    window.addEventListener("focus", syncClock);
    document.addEventListener("visibilitychange", handleVisibility);

    const bootTimer = window.setTimeout(() => {
      nudgeReadyRef.current = true;
      tryShowNudge();
    }, 250);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(bootTimer);
      window.removeEventListener("focus", syncClock);
      document.removeEventListener("visibilitychange", handleVisibility);
      resetBodyScrollLock();
    };
  }, []);

  useEffect(() => {
    const previousToday = followedDateRef.current;
    followedDateRef.current = todayKey;

    setPlannerState((current) => {
      const shouldAdvance =
        previousToday !== todayKey && current.selectedDate === previousToday;
      const needsToday = !current.days[todayKey];

      if (!shouldAdvance && !needsToday) {
        return current;
      }

      let nextDays = current.days;
      if (needsToday) {
        nextDays = {
          ...nextDays,
          [todayKey]: createBlankDay(
            getSettingsForNewDay(nextDays, previousToday || current.selectedDate),
          ),
        };
      }

      const nextSelectedDate = shouldAdvance ? todayKey : current.selectedDate;
      const nextDay = normalizeDayData(
        nextDays[nextSelectedDate],
        getSettingsForNewDay(nextDays, nextSelectedDate),
      );

      saveToStorage(STORAGE_KEYS.days, nextDays);
      saveToStorage(STORAGE_KEYS.selectedDate, nextSelectedDate);
      saveToStorage(STORAGE_KEYS.blocks, nextDay.blocks);
      saveToStorage(STORAGE_KEYS.settings, nextDay.settings);

      return {
        days: nextDays,
        selectedDate: nextSelectedDate,
      };
    });
  }, [todayKey]);

  function showSavedMessage(message) {
    setSaveMessage(message);
    window.setTimeout(() => setSaveMessage(""), 1600);
  }

  function handleToggleNudge() {
    const nextValue = !nudgeEnabled;
    setNudgeEnabled(nextValue);
    saveToStorage(STORAGE_KEYS.nudgeEnabled, nextValue);
    if (!nextValue) {
      setNudgeOpen(false);
    }
  }

  function handleToggleAutoFunBlock() {
    const nextEnabled = !settings.autoFunBlock;
    setAndSaveSettings({
      ...settings,
      autoFunBlock: nextEnabled,
      freeBlockIndex: nextEnabled ? null : settings.freeBlockIndex,
    });
  }

  function savePlannerState(nextDays, nextSelectedDate, currentBlocks, currentSettings) {
    saveToStorage(STORAGE_KEYS.days, nextDays);
    saveToStorage(STORAGE_KEYS.selectedDate, nextSelectedDate);
    saveToStorage(STORAGE_KEYS.blocks, currentBlocks);
    saveToStorage(STORAGE_KEYS.settings, currentSettings);
  }

  function persist(nextBlocks = blocks, nextSettings = settings) {
    const normalizedSettings = normalizeSettings(nextSettings);
    const normalizedBlocks = nextBlocks.map((block) =>
      normalizeBlock(block, normalizedSettings.typeDefinitions),
    );
    const nextDays = {
      ...days,
      [selectedDate]: {
        settings: normalizedSettings,
        blocks: normalizedBlocks,
        updatedAt: new Date().toISOString(),
      },
    };

    setPlannerState({
      days: nextDays,
      selectedDate,
    });
    savePlannerState(nextDays, selectedDate, normalizedBlocks, normalizedSettings);
  }

  function setAndSaveBlocks(nextBlocks) {
    const normalized = nextBlocks.map((block) => normalizeBlock(block, settings.typeDefinitions));
    persist(normalized);
  }

  function setAndSaveSettings(nextSettings) {
    const normalizedSettings = normalizeSettings(nextSettings);
    persist(blocks, normalizedSettings);
  }

  function handleSelectDate(dateKey) {
    const nextDays = days[dateKey]
      ? days
      : {
          ...days,
          [dateKey]: createBlankDay(settings),
        };
    const nextDay = normalizeDayData(nextDays[dateKey], settings);

    if (dateKey === todayKey) {
      followedDateRef.current = todayKey;
    }

    setPlannerState({
      days: nextDays,
      selectedDate: dateKey,
    });
    savePlannerState(nextDays, dateKey, nextDay.blocks, nextDay.settings);
  }

  function handleAddBlock(block) {
    setAndSaveBlocks([
      ...blocks,
      {
        id: createId(),
        ...block,
      },
    ]);
  }

  function handleUpdateBlock(blockId, updates) {
    setAndSaveBlocks(
      blocks.map((block) =>
        block.id === blockId
          ? normalizeBlock({
              ...block,
              ...updates,
            }, settings.typeDefinitions)
          : block,
      ),
    );
  }

  function handleSaveTypeDefinitions(nextTypeDefinitions) {
    const draftTypeDefinitions = Array.isArray(nextTypeDefinitions)
      ? nextTypeDefinitions
      : [];
    const normalizedTypeDefinitions = normalizeTypeDefinitions(nextTypeDefinitions);
    const validTypes = new Set(normalizedTypeDefinitions.map((type) => type.name));
    const fallbackType = validTypes.has("Other")
      ? "Other"
      : normalizedTypeDefinitions[0].name;
    const renameMap = new Map();

    draftTypeDefinitions.forEach((oldType, index) => {
      const nextType = normalizedTypeDefinitions[index];
      if (nextType && oldType.originalName && oldType.originalName !== nextType.name) {
        renameMap.set(oldType.originalName, nextType.name);
      }
    });

    const nextBlocks = blocks.map((block) => {
      const renamedType = renameMap.get(block.type) || block.type;
      return {
        ...block,
        type: validTypes.has(renamedType) ? renamedType : fallbackType,
      };
    });
    const nextSettings = {
      ...settings,
      typeDefinitions: normalizedTypeDefinitions,
    };
    const normalizedBlocks = nextBlocks.map((block) =>
      normalizeBlock(block, normalizedTypeDefinitions),
    );
    const nextDays = {
      ...days,
      [selectedDate]: {
        settings: normalizeSettings(nextSettings),
        blocks: normalizedBlocks,
        updatedAt: new Date().toISOString(),
      },
    };

    setPlannerState({
      days: nextDays,
      selectedDate,
    });
    savePlannerState(nextDays, selectedDate, normalizedBlocks, normalizeSettings(nextSettings));
    showSavedMessage("Types saved.");
  }

  function handleDeleteBlock(blockId) {
    const deletedIndex = blocks.findIndex((block) => block.id === blockId);
    const nextBlocks = blocks.filter((block) => block.id !== blockId);
    if (settings.freeBlockIndex === null || deletedIndex < 0) {
      setAndSaveBlocks(nextBlocks);
      return;
    }

    const nextSettings = {
      ...settings,
      freeBlockIndex: Math.min(
        settings.freeBlockIndex > deletedIndex
          ? settings.freeBlockIndex - 1
          : settings.freeBlockIndex,
        nextBlocks.length,
      ),
    };
    persist(nextBlocks, nextSettings);
  }

  function handleDuplicateBlock(blockId) {
    const index = blocks.findIndex((block) => block.id === blockId);
    if (index < 0) return;
    const duplicate = {
      ...blocks[index],
      id: createId(),
      label: `${blocks[index].label} copy`,
      locked: false,
    };
    const next = [...blocks];
    next.splice(index + 1, 0, duplicate);
    if (settings.freeBlockIndex !== null && settings.freeBlockIndex > index) {
      const nextSettings = {
        ...settings,
        freeBlockIndex: settings.freeBlockIndex + 1,
      };
      persist(next, nextSettings);
      return;
    }
    setAndSaveBlocks(next);
  }

  function handleMoveBlock(index, direction) {
    const targetIndex = index + direction;
    const block = blocks[index];
    const target = blocks[targetIndex];
    if (!block || !target || block.locked || target.locked) return;
    setAndSaveBlocks(moveItem(blocks, index, targetIndex));
  }

  function handleCommitScheduleOrder(orderedBlockIds, freeBlockIndex) {
    const blockById = new Map(blocks.map((block) => [block.id, block]));
    const usedIds = new Set();
    const nextBlocks = [];

    orderedBlockIds.forEach((blockId) => {
      const block = blockById.get(blockId);
      if (!block || usedIds.has(blockId)) return;
      usedIds.add(blockId);
      nextBlocks.push(block);
    });

    blocks.forEach((block) => {
      if (!usedIds.has(block.id)) {
        nextBlocks.push(block);
      }
    });

    const nextFreeBlockIndex = Math.min(
      Math.max(0, Number(freeBlockIndex) || 0),
      nextBlocks.length,
    );

    if (
      lockedPositionsChanged(
        blocks,
        nextBlocks,
        settings,
        nextFreeBlockIndex,
        schedule.freeBlock && schedule.freeBlock.duration > 0,
      )
    ) {
      return;
    }

    const nextSettings = {
      ...settings,
      freeBlockIndex: nextFreeBlockIndex === nextBlocks.length ? null : nextFreeBlockIndex,
    };

    persist(nextBlocks, nextSettings);
  }

  function handleClearAll() {
    setClearConfirmOpen(true);
  }

  function confirmClearAll() {
    const nextSelectedDate = getTodayKey();
    const nextDay = createBlankDay(DEFAULT_SETTINGS);
    const nextDays = {
      [nextSelectedDate]: nextDay,
    };

    clearPlannerStorage();
    setPlannerState({
      days: nextDays,
      selectedDate: nextSelectedDate,
    });
    savePlannerState(nextDays, nextSelectedDate, nextDay.blocks, nextDay.settings);
    setClearConfirmOpen(false);
    setNudgeOpen(false);
    setActiveTab("planner");
    showSavedMessage("Cleared.");
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Day from time blocks</p>
          <h1>BestPlanner</h1>
        </div>
        <div className="header-actions">
          <span className="selected-date-pill">{formatSelectedDate(selectedDate)}</span>
          <button
            type="button"
            className={`ghost-button ${nudgeEnabled ? "toggle-on" : ""}`}
            onClick={handleToggleNudge}
            aria-pressed={nudgeEnabled}
            title="Show a big reminder of the current block when you open or return to this page"
          >
            {nudgeEnabled ? "Nudge On" : "Nudge Off"}
          </button>
          <button type="button" className="ghost-button" onClick={handleClearAll}>
            Clear All
          </button>
        </div>
      </header>

      {saveMessage ? <p className="save-toast">{saveMessage}</p> : null}

      <div className="tab-bar" role="tablist" aria-label="Planner views">
        <button
          type="button"
          className={activeTab === "planner" ? "active" : ""}
          onClick={() => setActiveTab("planner")}
          role="tab"
          aria-selected={activeTab === "planner"}
        >
          Planner
        </button>
        <button
          type="button"
          className={activeTab === "calendar" ? "active" : ""}
          onClick={() => setActiveTab("calendar")}
          role="tab"
          aria-selected={activeTab === "calendar"}
        >
          Calendar
        </button>
      </div>

      {activeTab === "planner" ? (
        <div className="planner-grid">
        <aside className="left-column">
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{formatSelectedDate(selectedDate)}</p>
                <h2>Start and End</h2>
              </div>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Wake-up / start</span>
                <input
                  type="time"
                  value={settings.startTime}
                  onChange={(event) =>
                    setAndSaveSettings({
                      ...settings,
                      startTime: event.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Sleep / end</span>
                <input
                  type="time"
                  value={settings.endTime}
                  onChange={(event) =>
                    setAndSaveSettings({
                      ...settings,
                      endTime: event.target.value,
                    })
                  }
                />
              </label>
            </div>

            <label className="feature-toggle">
              <input
                type="checkbox"
                checked={settings.autoFunBlock}
                onChange={handleToggleAutoFunBlock}
              />
              <span>
                <strong>Auto Fun block</strong>
                <small>Fill leftover time with Fun at the end of the day</small>
              </span>
            </label>
          </section>
          <TypeBreakdown
            blocks={schedule.blocks}
            freeTime={schedule.stats.freeTime}
            autoFunBlock={settings.autoFunBlock}
            typeDefinitions={settings.typeDefinitions}
          />
          <TypeEditor
            typeDefinitions={settings.typeDefinitions}
            onSave={handleSaveTypeDefinitions}
          />
        </aside>

        <section className="right-column">
          <SummaryStats stats={schedule.stats} />
          <BlockForm onAdd={handleAddBlock} typeDefinitions={settings.typeDefinitions} />
          <BlockList
            blocks={schedule.blocks}
            freeBlock={schedule.freeBlock}
            warning={schedule.warning}
            selectedDate={selectedDate}
            currentTime={currentTime}
            onUpdate={handleUpdateBlock}
            onDelete={handleDeleteBlock}
            onDuplicate={handleDuplicateBlock}
            onMove={handleMoveBlock}
            onCommitOrder={handleCommitScheduleOrder}
            typeDefinitions={settings.typeDefinitions}
          />
        </section>
      </div>
      ) : (
        <CalendarView
          days={days}
          selectedDate={selectedDate}
          currentTime={currentTime}
          onSelectDate={handleSelectDate}
          onOpenPlanner={() => setActiveTab("planner")}
        />
      )}

      <NowNudge
        isOpen={nudgeOpen}
        onClose={() => setNudgeOpen(false)}
        activity={todayActivity}
        typeDefinitions={todayDay.settings.typeDefinitions}
      />

      <Modal isOpen={clearConfirmOpen} onClose={() => setClearConfirmOpen(false)}>
        <section
          className="block-modal confirm-modal"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm clear all"
        >
          <div className="modal-header">
            <div>
              <p className="eyebrow">Danger zone</p>
              <h2>Clear everything?</h2>
              <span>This deletes all saved days, blocks, and settings. You can&apos;t undo it.</span>
            </div>
          </div>
          <div className="card-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setClearConfirmOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ghost-button danger-button"
              onClick={confirmClearAll}
            >
              Yes, clear all
            </button>
          </div>
        </section>
      </Modal>
    </main>
  );
}
