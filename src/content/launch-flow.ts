import { sendMessage } from "../common/messaging";
import { mapRommPlatformToZaparooSystem } from "../common/platform-map";
import type { MediaLookupResult, OverrideRecord, RomMRomSummary } from "../common/types";
import { fetchRomData } from "./rom-data";
import { showFailoverUI } from "./overlay/failover-ui";

function setButtonState(buttonEl: HTMLButtonElement, label: string, disabled: boolean): void {
  const labelEl = buttonEl.querySelector(".label");
  if (labelEl) labelEl.textContent = label;
  buttonEl.disabled = disabled;
}

function overrideKey(romId: number): string {
  return `${location.origin}:${romId}`;
}

async function fetchExistingOverride(romId: number): Promise<OverrideRecord | null> {
  const response = await sendMessage<OverrideRecord | null>({
    type: "GET_OVERRIDE",
    key: overrideKey(romId),
  });
  return response.ok ? response.data : null;
}

async function guessTarget(rom: RomMRomSummary): Promise<{ systemId?: string; query: string }> {
  const mappedSystem = mapRommPlatformToZaparooSystem(rom.platformSlug);
  const guess = await sendMessage<MediaLookupResult | null>({
    type: "LOOKUP_MEDIA",
    system: mappedSystem ?? rom.platformDisplayName,
    name: rom.name,
  });
  if (guess.ok && guess.data) {
    return { systemId: guess.data.system.id, query: guess.data.name };
  }
  return { systemId: mappedSystem, query: rom.name };
}

/**
 * Whether the Launch button should be shown at all: hidden when we can tell in advance that
 * Zaparoo has no media for the target platform, since a launch would just fail. Only gates on
 * an override's or our static platform-map's system id — an unrecognized platform fails open
 * (button stays visible) rather than hiding a feature based on an uncertain guess.
 */
export async function shouldShowLaunchButton(rom: RomMRomSummary): Promise<boolean> {
  const override = await fetchExistingOverride(rom.id);
  const systemId = override?.systemId ?? mapRommPlatformToZaparooSystem(rom.platformSlug);
  if (!systemId) return true;

  const response = await sendMessage<boolean>({ type: "HAS_MEDIA_IN_SYSTEM", systemId });
  return response.ok ? response.data : true;
}

export async function launchGame(
  romId: number,
  buttonEl: HTMLButtonElement,
  onOverlayClosed?: () => void
): Promise<void> {
  const rom = await fetchRomData(romId);
  if (!rom) {
    await sendMessage({
      type: "LOG_ERROR",
      entry: { category: "romm_fetch_failed", message: `Could not load rom data for rom ${romId}`, romId },
    });
    return;
  }

  const originalLabel = buttonEl.querySelector(".label")?.textContent ?? "Launch on Zaparoo";
  setButtonState(buttonEl, "Launching…", true);

  const response = await sendMessage({
    type: "LAUNCH_REQUEST",
    romId,
    rommOrigin: location.origin,
    rom,
  });

  if (response.ok) {
    setButtonState(buttonEl, "Launched!", true);
    setTimeout(() => setButtonState(buttonEl, originalLabel, false), 1500);
    return;
  }

  setButtonState(buttonEl, originalLabel, false);

  const [guess, existing] = await Promise.all([guessTarget(rom), fetchExistingOverride(romId)]);

  await showFailoverUI({
    romId,
    rommOrigin: location.origin,
    romName: rom.name,
    romPlatformName: rom.platformDisplayName,
    initialSystemId: guess.systemId,
    initialQuery: guess.query,
    autoLaunchOnSave: true,
    hasExistingOverride: !!existing,
    onClose: onOverlayClosed,
  });
}

export async function openConfigureOverlay(romId: number, onOverlayClosed?: () => void): Promise<void> {
  const rom = await fetchRomData(romId);
  if (!rom) return;

  const existing = await fetchExistingOverride(romId);

  if (existing) {
    await showFailoverUI({
      romId,
      rommOrigin: location.origin,
      romName: rom.name,
      romPlatformName: rom.platformDisplayName,
      initialSystemId: existing.systemId,
      initialQuery: existing.gameName,
      autoLaunchOnSave: false,
      hasExistingOverride: true,
      onClose: onOverlayClosed,
    });
    return;
  }

  const guess = await guessTarget(rom);

  await showFailoverUI({
    romId,
    rommOrigin: location.origin,
    romName: rom.name,
    romPlatformName: rom.platformDisplayName,
    initialSystemId: guess.systemId,
    initialQuery: guess.query,
    autoLaunchOnSave: false,
    hasExistingOverride: false,
    onClose: onOverlayClosed,
  });
}
