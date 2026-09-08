import { OVERLAY_STYLES } from "./overlay-styles";

let currentHost: HTMLElement | null = null;

export interface OverlayHandle {
  shadowRoot: ShadowRoot;
  close: () => void;
}

export function openOverlay(onClose?: () => void): OverlayHandle {
  closeOverlay();

  const host = document.createElement("div");
  host.setAttribute("data-zaparomm-overlay", "");
  document.body.appendChild(host);
  currentHost = host;

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = OVERLAY_STYLES;
  shadow.appendChild(style);

  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  shadow.appendChild(backdrop);

  const close = () => {
    if (currentHost === host) {
      host.remove();
      currentHost = null;
      onClose?.();
    }
  };

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) close();
  });

  return { shadowRoot: shadow, close };
}

export function closeOverlay(): void {
  if (currentHost?.isConnected) {
    currentHost.remove();
  }
  currentHost = null;
}
