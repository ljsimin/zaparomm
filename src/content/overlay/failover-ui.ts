import { sendMessage } from "../../common/messaging";
import { SEARCH_DEBOUNCE_MS } from "../../common/constants";
import { escapeHtml } from "../../common/dom";
import type { MediaResult, OverrideRecord, ZaparooSystem } from "../../common/types";
import { openOverlay } from "./overlay-root";

export interface FailoverOptions {
  romId: number;
  rommOrigin: string;
  romName: string;
  romPlatformName: string;
  initialSystemId?: string;
  initialQuery?: string;
  autoLaunchOnSave: boolean;
  hasExistingOverride: boolean;
  onClose?: () => void;
}

export async function showFailoverUI(options: FailoverOptions): Promise<void> {
  const { shadowRoot, close } = openOverlay(options.onClose);
  const backdrop = shadowRoot.querySelector(".backdrop") as HTMLElement;

  const panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML = `
    <h2>Configure Zaparoo launch target</h2>
    <p class="subtitle">${escapeHtml(options.romName)}</p>
    <label for="zp-system-input">Platform</label>
    <div class="combobox">
      <input id="zp-system-input" type="text" placeholder="Loading platforms…" autocomplete="off" disabled />
      <div class="combobox-list"></div>
    </div>
    <label for="zp-query">Game name</label>
    <input id="zp-query" type="text" value="${escapeHtml(options.initialQuery ?? options.romName)}" />
    <div class="results"><div class="empty">Type to search…</div></div>
    <div class="status-text"></div>
    <div class="actions">
      ${options.hasExistingOverride ? '<button class="disassociate">Remove saved mapping</button>' : ""}
      <button class="cancel">Cancel</button>
      <button class="confirm" disabled>Save &amp; Launch</button>
    </div>
  `;
  backdrop.appendChild(panel);

  const systemInput = panel.querySelector<HTMLInputElement>("#zp-system-input")!;
  const systemListEl = panel.querySelector<HTMLElement>(".combobox-list")!;
  const queryInput = panel.querySelector<HTMLInputElement>("#zp-query")!;
  const resultsEl = panel.querySelector<HTMLElement>(".results")!;
  const statusEl = panel.querySelector<HTMLElement>(".status-text")!;
  const cancelBtn = panel.querySelector<HTMLButtonElement>(".cancel")!;
  const confirmBtn = panel.querySelector<HTMLButtonElement>(".confirm")!;
  const disassociateBtn = panel.querySelector<HTMLButtonElement>(".disassociate");

  confirmBtn.textContent = options.autoLaunchOnSave ? "Save & Launch" : "Save";

  let selected: MediaResult | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  cancelBtn.addEventListener("click", close);

  disassociateBtn?.addEventListener("click", async () => {
    disassociateBtn.disabled = true;
    statusEl.textContent = "Removing saved mapping…";
    const key = `${options.rommOrigin}:${options.romId}`;
    await sendMessage({ type: "DELETE_OVERRIDE", key });
    close();
  });

  let allSystems: ZaparooSystem[] = [];
  let selectedSystemId: string | undefined;

  function renderSystemOptions(filter: string) {
    const term = filter.trim().toLowerCase();
    const matches = term
      ? allSystems.filter(
          (system) =>
            system.name.toLowerCase().includes(term) || system.id.toLowerCase().includes(term)
        )
      : allSystems;

    systemListEl.innerHTML = "";
    if (matches.length === 0) {
      systemListEl.innerHTML = '<div class="empty">No platforms found.</div>';
      return;
    }
    for (const system of matches) {
      const row = document.createElement("div");
      row.className = "combobox-option";
      if (system.id === selectedSystemId) row.classList.add("selected");
      row.textContent = system.name;
      row.addEventListener("mousedown", (event) => {
        // Prevent the input from blurring before the click registers, so selecting an
        // option doesn't race with the blur handler that closes this list.
        event.preventDefault();
        selectSystem(system);
      });
      systemListEl.appendChild(row);
    }
  }

  function openSystemList() {
    systemListEl.classList.add("open");
    renderSystemOptions(systemInput.value);
  }

  function closeSystemList() {
    systemListEl.classList.remove("open");
  }

  function selectSystem(system: ZaparooSystem) {
    selectedSystemId = system.id;
    systemInput.value = system.name;
    closeSystemList();
    scheduleSearch();
  }

  systemInput.addEventListener("focus", openSystemList);
  systemInput.addEventListener("click", openSystemList);
  systemInput.addEventListener("input", openSystemList);
  systemInput.addEventListener("blur", closeSystemList);

  const systemsResponse = await sendMessage<ZaparooSystem[]>({ type: "GET_SYSTEMS" });
  if (systemsResponse.ok) {
    allSystems = systemsResponse.data;
    systemInput.disabled = false;
    systemInput.placeholder = "Search platform…";
    const initial = allSystems.find((system) => system.id === options.initialSystemId);
    if (initial) {
      selectedSystemId = initial.id;
      systemInput.value = initial.name;
    }
  } else {
    statusEl.textContent = `Could not load platform list: ${systemsResponse.error.message}`;
  }

  function setSelected(result: MediaResult | null) {
    selected = result;
    confirmBtn.disabled = !selected;
    resultsEl.querySelectorAll(".result-row").forEach((row) => row.classList.remove("selected"));
  }

  async function runSearch() {
    const query = queryInput.value.trim();
    const systemId = selectedSystemId;
    if (!query || !systemId) {
      resultsEl.innerHTML = '<div class="empty">Type to search…</div>';
      return;
    }
    resultsEl.innerHTML = '<div class="empty">Searching…</div>';
    const response = await sendMessage<MediaResult[]>({ type: "SEARCH_MEDIA", query, systemId });
    if (!response.ok) {
      resultsEl.innerHTML = `<div class="empty">Search failed: ${escapeHtml(response.error.message)}</div>`;
      return;
    }
    if (response.data.length === 0) {
      resultsEl.innerHTML = '<div class="empty">No matches found.</div>';
      return;
    }
    resultsEl.innerHTML = "";
    for (const result of response.data) {
      const row = document.createElement("div");
      row.className = "result-row";
      row.textContent = `${result.name} (${result.system.name})`;
      row.addEventListener("click", () => {
        setSelected(result);
        row.classList.add("selected");
      });
      resultsEl.appendChild(row);
    }
  }

  function scheduleSearch() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
  }

  queryInput.addEventListener("input", scheduleSearch);

  if (options.initialQuery ?? options.romName) {
    scheduleSearch();
  }

  confirmBtn.addEventListener("click", async () => {
    if (!selected) return;
    confirmBtn.disabled = true;
    statusEl.textContent = "Saving…";

    const record: OverrideRecord = {
      systemId: selected.system.id,
      systemName: selected.system.name,
      gameName: selected.name,
      mediaId: selected.mediaId,
      zapScript: selected.zapScript,
      savedAt: Date.now(),
      rommGameName: options.romName,
      rommPlatformName: options.romPlatformName,
    };
    const key = `${options.rommOrigin}:${options.romId}`;
    await sendMessage({ type: "SAVE_OVERRIDE", key, record });

    if (!options.autoLaunchOnSave) {
      close();
      return;
    }

    statusEl.textContent = "Launching…";
    const launchResponse = await sendMessage({
      type: "LAUNCH_REQUEST",
      romId: options.romId,
      rommOrigin: options.rommOrigin,
      rom: {
        id: options.romId,
        name: options.romName,
        platformDisplayName: selected.system.name,
        platformSlug: selected.system.id,
        // Unused: the override just saved above takes precedence over path/lookup launching.
        fullPath: "",
      },
    });

    if (launchResponse.ok) {
      statusEl.textContent = "Launched!";
      setTimeout(close, 800);
    } else {
      statusEl.textContent = `Launch failed: ${launchResponse.error.message}`;
      confirmBtn.disabled = false;
    }
  });
}
