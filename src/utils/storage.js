export const STORAGE_KEYS = {
  blocks: "block-day-planner:blocks",
  settings: "block-day-planner:settings",
  days: "block-day-planner:days",
  selectedDate: "block-day-planner:selected-date",
  nudgeEnabled: "block-day-planner:nudge-enabled",
};

export function loadFromStorage(key, fallback) {
  try {
    const rawValue = window.localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch (error) {
    console.warn(`Could not load ${key} from localStorage`, error);
    return fallback;
  }
}

export function saveToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Could not save ${key} to localStorage`, error);
  }
}

export function clearPlannerStorage() {
  Object.values(STORAGE_KEYS).forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Could not clear ${key} from localStorage`, error);
    }
  });
}
