import browser from "webextension-polyfill";
import { onMessage } from "../common/messaging";
import {
  appendErrorLog,
  clearErrorLog,
  deleteOverride,
  getErrorLog,
  getOverride,
  getOverrides,
  getSettings,
  saveOverride,
  saveSettings,
  sweepErrorLog,
} from "../common/storage";
import {
  ERROR_LOG_PRUNE_ALARM,
  ERROR_LOG_PRUNE_PERIOD_MINUTES,
  MEDIA_LOOKUP_CONFIDENCE_THRESHOLD,
} from "../common/constants";
import { mapRommPlatformToZaparooSystem } from "../common/platform-map";
import type { RomMRomSummary, RuntimeResponse, ZaparooSettings } from "../common/types";
import {
  ZaparooApiError,
  listSystems,
  mediaLookup,
  mediaSearch,
  run as runZapScript,
  testConnection,
} from "../common/zaparoo-client";

const CONTENT_SCRIPT_ID = "zaparomm-romm-content-script";

async function registerRommContentScript(origin: string): Promise<void> {
  const scripting = (browser as unknown as { scripting?: any }).scripting;
  if (!scripting?.registerContentScripts) {
    console.warn("scripting.registerContentScripts unavailable; content script must be added manually.");
    return;
  }

  const matches = [`${origin.replace(/\/$/, "")}/*`];

  try {
    const existing: Array<{ id: string }> = await scripting.getRegisteredContentScripts?.({
      ids: [CONTENT_SCRIPT_ID],
    }) ?? [];
    if (existing.length > 0) {
      await scripting.unregisterContentScripts({ ids: [CONTENT_SCRIPT_ID] });
    }
  } catch {
    // no prior registration; ignore
  }

  await scripting.registerContentScripts([
    {
      id: CONTENT_SCRIPT_ID,
      js: ["content.js"],
      matches,
      runAt: "document_idle",
    },
  ]);
}

async function reassertRegistration(): Promise<void> {
  const settings = await getSettings();
  if (settings?.rommOrigin) {
    try {
      await registerRommContentScript(settings.rommOrigin);
    } catch (err) {
      console.error("Failed to register RomM content script", err);
    }
  }
}

browser.runtime.onInstalled.addListener(() => {
  browser.alarms.create(ERROR_LOG_PRUNE_ALARM, { periodInMinutes: ERROR_LOG_PRUNE_PERIOD_MINUTES });
  void reassertRegistration();
});

browser.runtime.onStartup.addListener(() => {
  browser.alarms.create(ERROR_LOG_PRUNE_ALARM, { periodInMinutes: ERROR_LOG_PRUNE_PERIOD_MINUTES });
  void reassertRegistration();
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ERROR_LOG_PRUNE_ALARM) {
    void sweepErrorLog();
  }
});

browser.action.onClicked.addListener(() => {
  void browser.runtime.openOptionsPage();
});

async function requireSettings(): Promise<ZaparooSettings> {
  const settings = await getSettings();
  if (!settings?.zaparooHost) {
    throw new ZaparooApiError("not_configured", "Zaparoo connection is not configured yet.");
  }
  return settings;
}

/**
 * Builds a direct-file-path ZapScript command, when a Zaparoo roms root is configured.
 * Only correct when Zaparoo's filesystem and RomM's library point at the same underlying
 * folder structure (e.g. both reading the same shared ROM storage) — see the settings page.
 */
function buildPathLaunchScript(settings: ZaparooSettings, rom: RomMRomSummary): string | null {
  if (!settings.zaparooRomsRoot) return null;

  const root = settings.zaparooRomsRoot.replace(/\/+$/, "");
  let relative = rom.fullPath.replace(/^\/+/, "");
  const stripPrefix = settings.rommPathStripPrefix?.replace(/^\/+/, "");
  if (stripPrefix && relative.startsWith(stripPrefix)) {
    relative = relative.slice(stripPrefix.length).replace(/^\/+/, "");
  }
  const absolutePath = `${root}/${relative}`;

  const systemId = mapRommPlatformToZaparooSystem(rom.platformSlug);
  const suffix = systemId ? `?system=${systemId}` : "";
  return `**launch:${absolutePath}${suffix}`;
}

async function handleLaunch(
  romId: number,
  rommOrigin: string,
  rom: RomMRomSummary
): Promise<RuntimeResponse> {
  const key = `${rommOrigin}:${romId}`;
  try {
    const settings = await requireSettings();
    const override = await getOverride(key);

    if (override) {
      await runZapScript(settings, override.zapScript);
      return { ok: true, data: null };
    }

    const pathScript = buildPathLaunchScript(settings, rom);
    if (pathScript) {
      try {
        await runZapScript(settings, pathScript);
        return { ok: true, data: null };
      } catch (err) {
        const category = err instanceof ZaparooApiError ? err.category : "execution_failed";
        const message = err instanceof Error ? err.message : String(err);
        await appendErrorLog({
          category: `path_launch_${category}`,
          message: `Direct path launch failed, falling back to name lookup: ${message}`,
          romId,
          romName: rom.name,
          platformName: rom.platformDisplayName,
        });
      }
    }

    const systemQuery = mapRommPlatformToZaparooSystem(rom.platformSlug) ?? rom.platformDisplayName;
    const lookup = await mediaLookup(settings, systemQuery, rom.name);
    if (!lookup || lookup.confidence < MEDIA_LOOKUP_CONFIDENCE_THRESHOLD) {
      await appendErrorLog({
        category: "no_confident_match",
        message: `No confident Zaparoo match for "${rom.name}" on ${rom.platformDisplayName}.`,
        romId,
        romName: rom.name,
        platformName: rom.platformDisplayName,
      });
      return {
        ok: false,
        error: { category: "no_confident_match", message: "No confident match found." },
      };
    }

    await runZapScript(settings, lookup.zapScript);
    return { ok: true, data: null };
  } catch (err) {
    const category = err instanceof ZaparooApiError ? err.category : "execution_failed";
    const message = err instanceof Error ? err.message : String(err);
    await appendErrorLog({
      category,
      message,
      romId,
      romName: rom.name,
      platformName: rom.platformDisplayName,
    });
    return { ok: false, error: { category, message } };
  }
}

onMessage((message) => {
  switch (message.type) {
    case "LAUNCH_REQUEST":
      return handleLaunch(message.romId, message.rommOrigin, message.rom);

    case "GET_SYSTEMS":
      return requireSettings()
        .then((settings) => listSystems(settings))
        .then((systems) => ({ ok: true, data: systems }) as RuntimeResponse)
        .catch((err) => toErrorResponse(err));

    case "SEARCH_MEDIA":
      return requireSettings()
        .then((settings) => mediaSearch(settings, message.query, message.systemId))
        .then((results) => ({ ok: true, data: results }) as RuntimeResponse)
        .catch((err) => toErrorResponse(err));

    case "LOOKUP_MEDIA":
      return requireSettings()
        .then((settings) => mediaLookup(settings, message.system, message.name))
        .then((result) => ({ ok: true, data: result }) as RuntimeResponse)
        .catch((err) => toErrorResponse(err));

    case "SAVE_OVERRIDE":
      return saveOverride(message.key, message.record).then(
        () => ({ ok: true, data: null }) as RuntimeResponse
      );

    case "GET_OVERRIDE":
      return getOverride(message.key).then(
        (record) => ({ ok: true, data: record ?? null }) as RuntimeResponse
      );

    case "DELETE_OVERRIDE":
      return deleteOverride(message.key).then(() => ({ ok: true, data: null }) as RuntimeResponse);

    case "LIST_OVERRIDES":
      return getOverrides().then((overrides) => ({ ok: true, data: overrides }) as RuntimeResponse);

    case "HAS_MEDIA_IN_SYSTEM":
      return requireSettings()
        .then((settings) => listSystems(settings))
        .then((systems) => {
          const match = systems.find((system) => system.id === message.systemId);
          const hasMedia = match ? match.mediaCount === undefined || match.mediaCount > 0 : false;
          return { ok: true, data: hasMedia } as RuntimeResponse;
        })
        .catch((err) => toErrorResponse(err));

    case "LOG_ERROR":
      return appendErrorLog(message.entry).then(() => ({ ok: true, data: null }) as RuntimeResponse);

    case "GET_ERROR_LOG":
      return getErrorLog().then((entries) => ({ ok: true, data: entries }) as RuntimeResponse);

    case "CLEAR_ERROR_LOG":
      return clearErrorLog().then(() => ({ ok: true, data: null }) as RuntimeResponse);

    case "TEST_CONNECTION":
      return requireSettings()
        .then((settings) => testConnection(settings))
        .then(() => ({ ok: true, data: null }) as RuntimeResponse)
        .catch((err) => toErrorResponse(err));

    case "GET_SETTINGS":
      return getSettings().then((settings) => ({ ok: true, data: settings ?? null }) as RuntimeResponse);

    case "SAVE_SETTINGS":
      return saveSettings(message.settings).then(() => ({ ok: true, data: null }) as RuntimeResponse);

    case "REGISTER_ROMM_CONTENT_SCRIPT":
      return registerRommContentScript(message.origin)
        .then(() => ({ ok: true, data: null }) as RuntimeResponse)
        .catch((err) => toErrorResponse(err));

    default:
      return undefined;
  }
});

function toErrorResponse(err: unknown): RuntimeResponse {
  const category = err instanceof ZaparooApiError ? err.category : "execution_failed";
  const message = err instanceof Error ? err.message : String(err);
  return { ok: false, error: { category, message } };
}
