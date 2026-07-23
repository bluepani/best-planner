export const DEFAULT_TYPE_DEFINITIONS = [
  { name: "Study", color: "#2563eb" },
  { name: "Break", color: "#64748b" },
  { name: "Food", color: "#15803d" },
  { name: "Fun", color: "#b45309" },
  { name: "Other", color: "#475569" },
  { name: "Custom", color: "#7c3aed" },
];

export const DEFAULT_SETTINGS = {
  startTime: "07:30",
  endTime: "21:30",
  typeDefinitions: DEFAULT_TYPE_DEFINITIONS,
  freeBlockIndex: null,
  autoFunBlock: false,
};

export const BLOCK_TYPES = DEFAULT_TYPE_DEFINITIONS.map((type) => type.name);

export const TYPE_COLORS = DEFAULT_TYPE_DEFINITIONS.reduce((colors, type) => {
  colors[type.name] = type.color;
  return colors;
}, {});

export function createId(prefix = "block") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function parseTimeToMinutes(time) {
  if (!time || typeof time !== "string" || !time.includes(":")) return 0;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

export function normalizeEndMinutes(startTime, endTime) {
  const start = parseTimeToMinutes(startTime);
  let end = parseTimeToMinutes(endTime);
  if (end <= start) end += 24 * 60;
  return end;
}

export function formatTime(minutes) {
  const normalized = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

export function formatDuration(minutes) {
  const rounded = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

export function getProgressStatus(dateKey, block, now = new Date()) {
  if (!dateKey || !block) return "upcoming";
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return "upcoming";

  const dayStart = new Date(year, month - 1, day).getTime();
  const blockStart = dayStart + Math.round(Number(block.start) || 0) * 60 * 1000;
  const blockEnd = dayStart + Math.round(Number(block.end) || 0) * 60 * 1000;
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (currentTime >= blockEnd) return "complete";
  if (currentTime >= blockStart && currentTime < blockEnd) return "current";
  return "upcoming";
}

export function normalizeTypeDefinitions(typeDefinitions) {
  const source = Array.isArray(typeDefinitions) && typeDefinitions.length
    ? typeDefinitions
    : DEFAULT_TYPE_DEFINITIONS;
  const seen = new Set();
  const normalized = [];

  source.forEach((type, index) => {
    const name = String(type?.name || "").trim();
    if (!name || seen.has(name)) return;
    seen.add(name);
    normalized.push({
      name,
      color: type?.color || DEFAULT_TYPE_DEFINITIONS[index]?.color || "#475569",
    });
  });

  return normalized.length ? normalized : [...DEFAULT_TYPE_DEFINITIONS];
}

export function normalizeSettings(settings = {}) {
  const hasFreeBlockIndex =
    settings.freeBlockIndex !== null && settings.freeBlockIndex !== undefined;
  const freeBlockIndex = Number(settings.freeBlockIndex);

  return {
    startTime: settings.startTime || DEFAULT_SETTINGS.startTime,
    endTime: settings.endTime || DEFAULT_SETTINGS.endTime,
    typeDefinitions: normalizeTypeDefinitions(settings.typeDefinitions),
    freeBlockIndex: hasFreeBlockIndex && Number.isFinite(freeBlockIndex) && freeBlockIndex >= 0
      ? Math.round(freeBlockIndex)
      : null,
    autoFunBlock: Boolean(
      settings.autoFunBlock ?? DEFAULT_SETTINGS.autoFunBlock,
    ),
  };
}

export function getTypeNames(typeDefinitions) {
  return normalizeTypeDefinitions(typeDefinitions).map((type) => type.name);
}

export function getTypeColor(typeName, typeDefinitions) {
  const type = normalizeTypeDefinitions(typeDefinitions).find((item) => item.name === typeName);
  return type?.color || TYPE_COLORS[typeName] || TYPE_COLORS.Other;
}

export function getFallbackType(typeDefinitions) {
  const names = getTypeNames(typeDefinitions);
  return names.includes("Other") ? "Other" : names[0];
}

export function normalizeBlock(block, typeDefinitions = DEFAULT_TYPE_DEFINITIONS) {
  const names = getTypeNames(typeDefinitions);
  const fallbackType = getFallbackType(typeDefinitions);

  return {
    id: block.id || createId(),
    label: typeof block.label === "string" ? block.label : "Untitled block",
    duration: Math.max(0, Number(block.duration) || 0),
    type: names.includes(block.type) ? block.type : fallbackType,
    notes: block.notes || "",
    color: "",
    locked: Boolean(block.locked),
  };
}

export function createExampleBlocks() {
  return [
    {
      id: createId(),
      label: "Physics F=MA Paper",
      duration: 180,
      type: "Study",
      notes: "Deep work block",
      color: "",
      locked: false,
    },
    {
      id: createId(),
      label: "Short Break",
      duration: 20,
      type: "Break",
      notes: "Reset",
      color: "",
      locked: false,
    },
    {
      id: createId(),
      label: "SAT Practice",
      duration: 120,
      type: "Study",
      notes: "Timed sections",
      color: "",
      locked: false,
    },
    {
      id: createId(),
      label: "Lunch",
      duration: 45,
      type: "Food",
      notes: "",
      color: "",
      locked: false,
    },
    {
      id: createId(),
      label: "Vocabulary",
      duration: 45,
      type: "Study",
      notes: "Word review",
      color: "",
      locked: false,
    },
    {
      id: createId(),
      label: "Fun Time",
      duration: 60,
      type: "Fun",
      notes: "Exercise, tennis, or chill",
      color: "",
      locked: false,
    },
  ];
}

export function calculateSchedule(blocks, settings) {
  const normalizedSettings = normalizeSettings(settings);
  const start = parseTimeToMinutes(normalizedSettings.startTime);
  const end = normalizeEndMinutes(normalizedSettings.startTime, normalizedSettings.endTime);
  const normalizedBlocks = blocks.map((block) =>
    normalizeBlock(block, normalizedSettings.typeDefinitions),
  );
  const totalPlannedTime = normalizedBlocks.reduce(
    (total, block) => total + Number(block.duration || 0),
    0,
  );
  const totalAvailableTime = Math.max(0, end - start);
  const overtime = Math.max(0, totalPlannedTime - totalAvailableTime);
  const freeTime = Math.max(0, totalAvailableTime - totalPlannedTime);
  const autoFunBlock = normalizedSettings.autoFunBlock && freeTime > 0;
  const freeBlockIndex = !autoFunBlock
    ? null
    : normalizedSettings.freeBlockIndex === null
      ? normalizedBlocks.length
      : Math.min(normalizedSettings.freeBlockIndex, normalizedBlocks.length);
  let cursor = start;
  let freeBlock = null;

  function createFreeBlock() {
    if (!autoFunBlock || freeBlock) return;
    const blockStart = cursor;
    const blockEnd = blockStart + freeTime;
    freeBlock = {
      id: "auto-fun-block",
      label: "Fun Time",
      duration: freeTime,
      type: "Fun",
      notes: "Automatically fills unplanned time.",
      locked: false,
      start: blockStart,
      end: blockEnd,
      orderIndex: freeBlockIndex,
    };
    cursor = blockEnd;
  }

  const scheduledBlocks = normalizedBlocks.map((normalized, index) => {
    if (autoFunBlock && index === freeBlockIndex) {
      createFreeBlock();
    }

    const blockStart = cursor;
    const blockEnd = blockStart + normalized.duration;
    cursor = blockEnd;

    return {
      ...normalized,
      start: blockStart,
      end: blockEnd,
      overflows: blockEnd > end,
    };
  });

  if (autoFunBlock && freeBlockIndex === normalizedBlocks.length) {
    createFreeBlock();
  }

  const countedFreeTime = autoFunBlock ? freeTime : 0;
  const totalStudyTime = scheduledBlocks.reduce(
    (total, block) =>
      block.type.toLowerCase() === "study" ? total + Number(block.duration || 0) : total,
    0,
  );
  const totalNonStudyTime = totalPlannedTime - totalStudyTime + countedFreeTime;

  return {
    blocks: scheduledBlocks,
    stats: {
      totalAvailableTime,
      totalStudyTime,
      totalNonStudyTime,
      totalPlannedTime,
      freeTime,
      overtime,
      blockCount: scheduledBlocks.length,
    },
    freeBlock,
    warning:
      overtime > 0
        ? `Blocks run ${formatDuration(overtime)} past the sleep/end time.`
        : "",
  };
}

export function getTimelineItems(schedule) {
  const items = schedule.blocks.map((block) => ({
    id: block.id,
    kind: "block",
    block,
  }));

  if (schedule.freeBlock && schedule.freeBlock.duration > 0) {
    const index = Math.min(
      Math.max(0, Number(schedule.freeBlock.orderIndex) || 0),
      items.length,
    );
    items.splice(index, 0, {
      id: "auto-fun-block",
      kind: "free",
      block: schedule.freeBlock,
    });
  }

  return items;
}

export function getCurrentActivity(schedule, dateKey, now = new Date()) {
  if (!dateKey || !schedule) {
    return { status: "empty", block: null, nextBlock: null };
  }

  const items = getTimelineItems(schedule);
  if (!items.length) {
    return { status: "empty", block: null, nextBlock: null };
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const dayStart = new Date(year, month - 1, day).getTime();
  const currentTime = now instanceof Date ? now.getTime() : new Date(now).getTime();

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const blockStart = dayStart + Math.round(Number(item.block.start) || 0) * 60 * 1000;
    const blockEnd = dayStart + Math.round(Number(item.block.end) || 0) * 60 * 1000;
    if (currentTime >= blockStart && currentTime < blockEnd) {
      return {
        status: "current",
        block: item.block,
        nextBlock: items[index + 1]?.block || null,
      };
    }
    if (currentTime < blockStart) {
      return {
        status: index === 0 ? "before" : "gap",
        block: null,
        nextBlock: item.block,
      };
    }
  }

  return {
    status: "after",
    block: null,
    nextBlock: null,
  };
}
