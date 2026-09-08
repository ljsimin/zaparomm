import browser from "webextension-polyfill";
import { ERROR_LOG_RETENTION_MS, STORAGE_KEYS } from "./constants";
import type { ErrorLogEntry, OverrideRecord, ZaparooSettings } from "./types";

export function pruneErrorLog(entries: ErrorLogEntry[], now = Date.now()): ErrorLogEntry[] {
  return entries.filter((entry) => now - entry.timestamp <= ERROR_LOG_RETENTION_MS);
}

export async function getOverrides(): Promise<Record<string, OverrideRecord>> {
  const result = await browser.storage.local.get(STORAGE_KEYS.overrides);
  return (result[STORAGE_KEYS.overrides] as Record<string, OverrideRecord>) ?? {};
}

export async function getOverride(key: string): Promise<OverrideRecord | undefined> {
  const overrides = await getOverrides();
  return overrides[key];
}

export async function saveOverride(key: string, record: OverrideRecord): Promise<void> {
  const overrides = await getOverrides();
  overrides[key] = record;
  await browser.storage.local.set({ [STORAGE_KEYS.overrides]: overrides });
}

export async function deleteOverride(key: string): Promise<void> {
  const overrides = await getOverrides();
  delete overrides[key];
  await browser.storage.local.set({ [STORAGE_KEYS.overrides]: overrides });
}

export async function getErrorLog(): Promise<ErrorLogEntry[]> {
  const result = await browser.storage.local.get(STORAGE_KEYS.errorLog);
  return (result[STORAGE_KEYS.errorLog] as ErrorLogEntry[]) ?? [];
}

export async function appendErrorLog(entry: Omit<ErrorLogEntry, "timestamp">): Promise<void> {
  const existing = await getErrorLog();
  const pruned = pruneErrorLog(existing);
  pruned.push({ ...entry, timestamp: Date.now() });
  await browser.storage.local.set({ [STORAGE_KEYS.errorLog]: pruned });
}

export async function clearErrorLog(): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.errorLog]: [] });
}

export async function sweepErrorLog(): Promise<void> {
  const existing = await getErrorLog();
  const pruned = pruneErrorLog(existing);
  if (pruned.length !== existing.length) {
    await browser.storage.local.set({ [STORAGE_KEYS.errorLog]: pruned });
  }
}

export async function getSettings(): Promise<ZaparooSettings | undefined> {
  const result = await browser.storage.local.get(STORAGE_KEYS.settings);
  return result[STORAGE_KEYS.settings] as ZaparooSettings | undefined;
}

export async function saveSettings(settings: ZaparooSettings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEYS.settings]: settings });
}
