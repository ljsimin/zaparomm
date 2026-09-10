import browser from "webextension-polyfill";
import { sendMessage } from "../../common/messaging";
import { DEFAULT_ZAPAROO_PORT } from "../../common/constants";
import type { ZaparooSettings } from "../../common/types";

export async function initZaparooSection(): Promise<void> {
  const hostInput = document.querySelector<HTMLInputElement>("#zaparoo-host")!;
  const portInput = document.querySelector<HTMLInputElement>("#zaparoo-port")!;
  const keyInput = document.querySelector<HTMLInputElement>("#zaparoo-key")!;
  const romsRootInput = document.querySelector<HTMLInputElement>("#zaparoo-roms-root")!;
  const stripPrefixInput = document.querySelector<HTMLInputElement>("#zaparoo-path-strip-prefix")!;
  const saveBtn = document.querySelector<HTMLButtonElement>("#zaparoo-save")!;
  const testBtn = document.querySelector<HTMLButtonElement>("#zaparoo-test")!;
  const statusEl = document.querySelector<HTMLElement>("#zaparoo-status")!;

  const settingsResponse = await sendMessage<ZaparooSettings | null>({ type: "GET_SETTINGS" });
  const settings = settingsResponse.ok ? settingsResponse.data : null;
  if (settings) {
    hostInput.value = settings.zaparooHost ?? "";
    portInput.value = String(settings.zaparooPort ?? DEFAULT_ZAPAROO_PORT);
    keyInput.value = settings.zaparooApiKey ?? "";
    romsRootInput.value = settings.zaparooRomsRoot ?? "";
    stripPrefixInput.value = settings.rommPathStripPrefix ?? "";
  } else {
    portInput.value = String(DEFAULT_ZAPAROO_PORT);
  }

  saveBtn.addEventListener("click", async () => {
    const host = hostInput.value.trim();
    const port = Number(portInput.value) || DEFAULT_ZAPAROO_PORT;
    const apiKey = keyInput.value.trim() || undefined;
    const romsRoot = romsRootInput.value.trim() || undefined;
    const stripPrefix = stripPrefixInput.value.trim() || undefined;

    if (!host) {
      statusEl.textContent = "Enter a host or IP first.";
      return;
    }

    statusEl.textContent = "Requesting permission…";
    const granted = await browser.permissions.request({
      origins: [`http://${host}:${port}/*`, `https://${host}:${port}/*`],
    });
    if (!granted) {
      statusEl.textContent = "Permission was not granted.";
      return;
    }

    const currentResponse = await sendMessage<ZaparooSettings | null>({ type: "GET_SETTINGS" });
    const current = currentResponse.ok ? currentResponse.data : null;

    await sendMessage({
      type: "SAVE_SETTINGS",
      settings: {
        rommOrigins: current?.rommOrigins ?? [],
        zaparooHost: host,
        zaparooPort: port,
        zaparooApiKey: apiKey,
        zaparooRomsRoot: romsRoot,
        rommPathStripPrefix: stripPrefix,
      },
    });

    statusEl.textContent = "Saved.";
  });

  testBtn.addEventListener("click", async () => {
    statusEl.textContent = "Testing…";
    const response = await sendMessage({ type: "TEST_CONNECTION" });
    statusEl.textContent = response.ok
      ? "Connected successfully."
      : `Failed: ${response.error.message}`;
  });
}
