import browser from "webextension-polyfill";
import { sendMessage } from "../../common/messaging";
import { STORAGE_KEYS } from "../../common/constants";
import { escapeHtml } from "../../common/dom";
import type { OverrideRecord } from "../../common/types";

async function renderOverrides(): Promise<void> {
  const tbody = document.querySelector<HTMLElement>("#overrides-table tbody")!;
  const response = await sendMessage<Record<string, OverrideRecord>>({ type: "LIST_OVERRIDES" });
  const entries = response.ok ? Object.entries(response.data) : [];

  tbody.innerHTML = "";
  if (entries.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="4">No saved launch targets yet.</td>';
    tbody.appendChild(row);
    return;
  }

  for (const [key, record] of entries.sort((a, b) => b[1].savedAt - a[1].savedAt)) {
    const row = document.createElement("tr");
    const rommGame = record.rommGameName
      ? `${escapeHtml(record.rommGameName)}${record.rommPlatformName ? ` <span class="hint">(${escapeHtml(record.rommPlatformName)})</span>` : ""}`
      : '<span class="hint">unknown (saved before this was tracked)</span>';
    row.innerHTML = `
      <td>${rommGame}</td>
      <td>${escapeHtml(record.gameName)} <span class="hint">(${escapeHtml(record.systemName)})</span></td>
      <td>${new Date(record.savedAt).toLocaleString()}</td>
      <td class="delete-cell"><button class="secondary" data-key="${escapeHtml(key)}">Delete</button></td>
    `;
    tbody.appendChild(row);
  }

  tbody.querySelectorAll<HTMLButtonElement>("button[data-key]").forEach((button) => {
    button.addEventListener("click", async () => {
      await sendMessage({ type: "DELETE_OVERRIDE", key: button.dataset.key! });
      await renderOverrides();
    });
  });
}

export async function initOverridesSection(): Promise<void> {
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEYS.overrides]) {
      void renderOverrides();
    }
  });

  await renderOverrides();
}
