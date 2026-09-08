import browser from "webextension-polyfill";
import { sendMessage } from "../../common/messaging";
import type { ZaparooSettings } from "../../common/types";

function originPattern(url: string): string {
  const origin = new URL(url).origin;
  return `${origin}/*`;
}

export async function initRommSection(): Promise<void> {
  const urlInput = document.querySelector<HTMLInputElement>("#romm-url")!;
  const saveBtn = document.querySelector<HTMLButtonElement>("#romm-save")!;
  const statusEl = document.querySelector<HTMLElement>("#romm-status")!;

  const settingsResponse = await sendMessage<ZaparooSettings | null>({ type: "GET_SETTINGS" });
  const settings = settingsResponse.ok ? settingsResponse.data : null;
  if (settings?.rommOrigin) {
    urlInput.value = settings.rommOrigin;
    const granted = await browser.permissions.contains({ origins: [`${settings.rommOrigin}/*`] });
    statusEl.textContent = granted ? "Permission granted." : "Permission not granted yet.";
  }

  saveBtn.addEventListener("click", async () => {
    const raw = urlInput.value.trim();
    if (!raw) {
      statusEl.textContent = "Enter a URL first.";
      return;
    }

    let pattern: string;
    let origin: string;
    try {
      origin = new URL(raw).origin;
      pattern = originPattern(raw);
    } catch {
      statusEl.textContent = "That doesn't look like a valid URL.";
      return;
    }

    statusEl.textContent = "Requesting permission…";
    const granted = await browser.permissions.request({ origins: [pattern] });
    if (!granted) {
      statusEl.textContent = "Permission was not granted.";
      return;
    }

    const currentResponse = await sendMessage<ZaparooSettings | null>({ type: "GET_SETTINGS" });
    const current = currentResponse.ok ? currentResponse.data : null;
    await sendMessage({
      type: "SAVE_SETTINGS",
      settings: {
        zaparooHost: current?.zaparooHost ?? "",
        zaparooPort: current?.zaparooPort ?? 7497,
        zaparooApiKey: current?.zaparooApiKey,
        rommOrigin: origin,
      },
    });

    await sendMessage({ type: "REGISTER_ROMM_CONTENT_SCRIPT", origin });
    statusEl.textContent = "Saved. Reload your RomM tab to see the launch button.";
  });
}
