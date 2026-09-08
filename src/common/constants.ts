export const DEFAULT_ZAPAROO_PORT = 7497;
export const ERROR_LOG_RETENTION_MS = 24 * 60 * 60 * 1000;
export const ERROR_LOG_PRUNE_ALARM = "zaparomm-prune-error-log";
export const ERROR_LOG_PRUNE_PERIOD_MINUTES = 60;
export const MEDIA_LOOKUP_CONFIDENCE_THRESHOLD = 0.75;
export const SEARCH_DEBOUNCE_MS = 250;

export const STORAGE_KEYS = {
  overrides: "overrides",
  errorLog: "errorLog",
  settings: "settings",
} as const;

export const INJECTED_BUTTON_ATTR = "data-zaparomm-btn";
