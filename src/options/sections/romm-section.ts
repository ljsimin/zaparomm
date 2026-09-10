import browser from "webextension-polyfill";
import { sendMessage } from "../../common/messaging";
import { escapeHtml } from "../../common/dom";
import type { ZaparooSettings } from "../../common/types";

function originPattern(origin: string): string {
  return `${origin}/*`;
}

async function saveOrigins(origins: string[]): Promise<void> {
  const currentResponse = await sendMessage<ZaparooSettings | null>({ type: "GET_SETTINGS" });
  const current = currentResponse.ok ? currentResponse.data : null;

  await sendMessage({
    type: "SAVE_SETTINGS",
    settings: {
      zaparooHost: current?.zaparooHost ?? "",
      zaparooPort: current?.zaparooPort ?? 7497,
      zaparooApiKey: current?.zaparooApiKey,
      zaparooRomsRoot: current?.zaparooRomsRoot,
      rommPathStripPrefix: current?.rommPathStripPrefix,
      rommOrigins: origins,
    },
  });

  await sendMessage({ type: "REGISTER_ROMM_CONTENT_SCRIPTS" });
}

async function renderSites(): Promise<void> {
  const tbody = document.querySelector<HTMLElement>("#romm-sites-table tbody")!;
  const settingsResponse = await sendMessage<ZaparooSettings | null>({ type: "GET_SETTINGS" });
  const origins = settingsResponse.ok ? (settingsResponse.data?.rommOrigins ?? []) : [];

  tbody.innerHTML = "";
  if (origins.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="3">No RomM sites added yet.</td>';
    tbody.appendChild(row);
    return;
  }

  for (const origin of origins) {
    const granted = await browser.permissions.contains({ origins: [originPattern(origin)] });
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(origin)}</td>
      <td>${granted ? "Granted" : "Not granted"}</td>
      <td class="delete-cell"><button class="secondary" data-origin="${escapeHtml(origin)}">Remove</button></td>
    `;
    tbody.appendChild(row);
  }

  tbody.querySelectorAll<HTMLButtonElement>("button[data-origin]").forEach((button) => {
    button.addEventListener("click", async () => {
      const origin = button.dataset.origin!;
      const remaining = origins.filter((o) => o !== origin);
      await saveOrigins(remaining);
      await browser.permissions.remove({ origins: [originPattern(origin)] });
      await renderSites();
    });
  });
}

export async function initRommSection(): Promise<void> {
  const urlInput = document.querySelector<HTMLInputElement>("#romm-url")!;
  const addBtn = document.querySelector<HTMLButtonElement>("#romm-add")!;
  const statusEl = document.querySelector<HTMLElement>("#romm-status")!;

  addBtn.addEventListener("click", async () => {
    const raw = urlInput.value.trim();
    if (!raw) {
      statusEl.textContent = "Enter a URL first.";
      return;
    }

    let origin: string;
    try {
      origin = new URL(raw).origin;
    } catch {
      statusEl.textContent = "That doesn't look like a valid URL.";
      return;
    }

    const settingsResponse = await sendMessage<ZaparooSettings | null>({ type: "GET_SETTINGS" });
    const existing = settingsResponse.ok ? (settingsResponse.data?.rommOrigins ?? []) : [];
    if (existing.includes(origin)) {
      statusEl.textContent = "That site is already added.";
      return;
    }

    statusEl.textContent = "Requesting permission…";
    const granted = await browser.permissions.request({ origins: [originPattern(origin)] });
    if (!granted) {
      statusEl.textContent = "Permission was not granted.";
      return;
    }

    await saveOrigins([...existing, origin]);
    urlInput.value = "";
    statusEl.textContent = "Added. Reload your RomM tab to see the launch button.";
    await renderSites();
  });

  await renderSites();
}
