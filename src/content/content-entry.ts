import { tryInject } from "./inject";

let scheduled = false;

function scheduleInject(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    void tryInject();
  });
}

function hookHistory(): void {
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    const result = originalPushState(...args);
    window.dispatchEvent(new Event("zaparomm:routechange"));
    return result;
  };

  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    const result = originalReplaceState(...args);
    window.dispatchEvent(new Event("zaparomm:routechange"));
    return result;
  };

  window.addEventListener("popstate", () => window.dispatchEvent(new Event("zaparomm:routechange")));
  window.addEventListener("zaparomm:routechange", scheduleInject);
}

function observeDom(): void {
  const observer = new MutationObserver(scheduleInject);
  observer.observe(document.body, { childList: true, subtree: true });
}

function init(): void {
  hookHistory();
  observeDom();
  scheduleInject();
}

if (document.body) {
  init();
} else {
  document.addEventListener("DOMContentLoaded", init, { once: true });
}
