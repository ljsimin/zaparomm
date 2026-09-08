import browser from "webextension-polyfill";
import { sendMessage } from "../../common/messaging";
import { STORAGE_KEYS } from "../../common/constants";
import { escapeHtml } from "../../common/dom";
import type { ErrorLogEntry } from "../../common/types";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

async function renderLog(): Promise<void> {
  const tbody = document.querySelector<HTMLElement>("#error-log-table tbody")!;
  const response = await sendMessage<ErrorLogEntry[]>({ type: "GET_ERROR_LOG" });
  const entries = response.ok ? [...response.data].sort((a, b) => b.timestamp - a.timestamp) : [];

  tbody.innerHTML = "";
  if (entries.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="5">No errors in the last 24 hours.</td>';
    tbody.appendChild(row);
    return;
  }

  for (const entry of entries) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${formatTime(entry.timestamp)}</td>
      <td>${escapeHtml(entry.category)}</td>
      <td>${escapeHtml(entry.romName ?? "")}</td>
      <td>${escapeHtml(entry.platformName ?? "")}</td>
      <td>${escapeHtml(entry.message)}</td>
    `;
    tbody.appendChild(row);
  }
}

export async function initErrorLogSection(): Promise<void> {
  const clearBtn = document.querySelector<HTMLButtonElement>("#error-log-clear")!;
  clearBtn.addEventListener("click", async () => {
    await sendMessage({ type: "CLEAR_ERROR_LOG" });
    await renderLog();
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[STORAGE_KEYS.errorLog]) {
      void renderLog();
    }
  });

  await renderLog();
}
