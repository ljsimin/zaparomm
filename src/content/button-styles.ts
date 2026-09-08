export const BUTTON_STYLES = `
:host {
  display: inline-flex;
  gap: 4px;
}
button {
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  border-radius: 8px;
  padding: 0 14px;
  height: 40px;
  font-size: 14px;
  font-family: inherit;
  background: var(--r-color-brand-primary, #6c5ce7);
  color: #fff;
  transition: opacity 0.15s ease;
}
button:hover {
  opacity: 0.85;
}
button:disabled {
  opacity: 0.5;
  cursor: default;
}
button.configure {
  background: rgba(127, 127, 127, 0.18);
  color: inherit;
  width: 40px;
  padding: 0;
}
svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
}
.label {
  white-space: nowrap;
}
.status {
  font-size: 12px;
  opacity: 0.8;
}
`;

export const LAUNCH_ICON_SVG = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
export const CONFIGURE_ICON_SVG = `<svg viewBox="0 0 24 24"><path d="M12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7zm7.4-3.5c0-.6-.05-1.15-.15-1.7l1.9-1.5-1.9-3.3-2.25.9a7.6 7.6 0 0 0-1.5-.85l-.35-2.4H9.85l-.35 2.4a7.6 7.6 0 0 0-1.5.85l-2.25-.9-1.9 3.3 1.9 1.5c-.1.55-.15 1.1-.15 1.7s.05 1.15.15 1.7l-1.9 1.5 1.9 3.3 2.25-.9c.45.35.95.65 1.5.85l.35 2.4h4.3l.35-2.4c.55-.2 1.05-.5 1.5-.85l2.25.9 1.9-3.3-1.9-1.5c.1-.55.15-1.1.15-1.7z"/></svg>`;
