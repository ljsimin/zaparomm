import { sendMessage } from "../common/messaging";
import { INJECTED_BUTTON_ATTR } from "../common/constants";
import { extractRomId, fetchRomData } from "./rom-data";
import { BUTTON_STYLES, CONFIGURE_ICON_SVG, LAUNCH_ICON_SVG } from "./button-styles";
import { launchGame, openConfigureOverlay, shouldShowLaunchButton } from "./launch-flow";

type InjectionMode = "v2" | "legacy" | "floating";

let lastRomId: number | null = null;
let lastHost: HTMLElement | null = null;
let lastMode: InjectionMode | null = null;
let diagnosticLoggedForRomId: number | null = null;

function findV2ActionsContainer(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".game-actions");
}

function findLegacyActionsContainer(): HTMLElement | null {
  const playButton = document.querySelector<HTMLElement>('[aria-label="Play" i]');
  return playButton?.closest("div") ?? null;
}

async function refreshLaunchVisibility(romId: number, launchBtn: HTMLButtonElement): Promise<void> {
  const rom = await fetchRomData(romId);
  if (!rom) return;
  const visible = await shouldShowLaunchButton(rom);
  launchBtn.style.display = visible ? "" : "none";
}

function buildButtonHost(romId: number): HTMLElement {
  const host = document.createElement("span");
  host.setAttribute(INJECTED_BUTTON_ATTR, String(romId));
  const shadow = host.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = BUTTON_STYLES;
  shadow.appendChild(style);

  const launchBtn = document.createElement("button");
  launchBtn.className = "launch";
  // Hidden until refreshLaunchVisibility resolves, so we don't flash the button then hide it
  // when Zaparoo turns out to have no media for this platform.
  launchBtn.style.display = "none";
  launchBtn.innerHTML = `${LAUNCH_ICON_SVG}<span class="label">Launch on Zaparoo</span>`;
  launchBtn.addEventListener("click", () => {
    void launchGame(romId, launchBtn, () => void refreshLaunchVisibility(romId, launchBtn));
  });

  const configureBtn = document.createElement("button");
  configureBtn.className = "configure";
  configureBtn.setAttribute("aria-label", "Configure Zaparoo launch target");
  configureBtn.innerHTML = CONFIGURE_ICON_SVG;
  configureBtn.addEventListener("click", () => {
    void openConfigureOverlay(romId, () => void refreshLaunchVisibility(romId, launchBtn));
  });

  shadow.appendChild(launchBtn);
  shadow.appendChild(configureBtn);
  void refreshLaunchVisibility(romId, launchBtn);
  return host;
}

function removeInjectedHost(): void {
  if (lastHost?.isConnected) {
    lastHost.remove();
  }
  lastHost = null;
}

async function logDiagnostic(message: string): Promise<void> {
  await sendMessage({
    type: "LOG_ERROR",
    entry: { category: "injection_diagnostic", message },
  });
}

function insertFloatingFallback(romId: number): HTMLElement {
  const host = buildButtonHost(romId);
  host.style.position = "fixed";
  host.style.bottom = "24px";
  host.style.right = "24px";
  host.style.zIndex = "999999";
  document.body.appendChild(host);
  return host;
}

export async function tryInject(): Promise<void> {
  const romId = extractRomId(location.pathname);

  if (romId === null) {
    removeInjectedHost();
    lastRomId = null;
    lastMode = null;
    return;
  }

  // Once we have a stable (non-floating) button for this romId, there's nothing more to do.
  // A floating fallback is provisional: keep re-checking on every DOM mutation so that if
  // RomM's own action bar mounts later (slow page, big media grid, etc.), we swap over to it
  // instead of leaving the floating button stuck forever.
  if (romId === lastRomId && lastHost?.isConnected && lastMode !== "floating") {
    return;
  }

  const v2Container = findV2ActionsContainer();
  if (v2Container && !v2Container.querySelector(`[${INJECTED_BUTTON_ATTR}]`)) {
    removeInjectedHost();
    lastRomId = romId;
    const host = buildButtonHost(romId);
    const spacer = v2Container.querySelector(".game-actions__spacer");
    if (spacer) {
      v2Container.insertBefore(host, spacer);
    } else {
      v2Container.appendChild(host);
    }
    lastHost = host;
    lastMode = "v2";
    return;
  }

  const legacyContainer = findLegacyActionsContainer();
  if (legacyContainer && !legacyContainer.querySelector(`[${INJECTED_BUTTON_ATTR}]`)) {
    removeInjectedHost();
    lastRomId = romId;
    const host = buildButtonHost(romId);
    legacyContainer.appendChild(host);
    lastHost = host;
    lastMode = "legacy";
    return;
  }

  // Neither real container found (yet). Only (re)insert the floating fallback if we don't
  // already have one showing for this romId, to avoid flicker/duplicate hosts on every mutation.
  if (romId !== lastRomId || lastMode !== "floating" || !lastHost?.isConnected) {
    removeInjectedHost();
    lastRomId = romId;
    lastHost = insertFloatingFallback(romId);
    lastMode = "floating";
  }

  if (diagnosticLoggedForRomId !== romId) {
    diagnosticLoggedForRomId = romId;
    void logDiagnostic(
      `Could not find .game-actions or a legacy action bar for rom ${romId}; used floating fallback button.`
    );
  }
}
