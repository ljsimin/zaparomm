export const OVERLAY_STYLES = `
:host {
  all: initial;
  color-scheme: dark;
}
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: system-ui, sans-serif;
}
.panel {
  background: #1e1e24;
  color: #eee;
  border-radius: 12px;
  padding: 24px;
  width: 420px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}
h2 {
  margin: 0 0 4px;
  font-size: 18px;
}
p.subtitle {
  margin: 0 0 16px;
  font-size: 13px;
  opacity: 0.7;
}
label {
  display: block;
  font-size: 12px;
  opacity: 0.8;
  margin: 12px 0 4px;
}
input[type="text"] {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font-size: 14px;
}
input[type="text"]:disabled {
  opacity: 0.5;
}
.combobox {
  position: relative;
}
.combobox-list {
  display: none;
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 1;
  max-height: 200px;
  overflow-y: auto;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #1e1e24;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.combobox-list.open {
  display: block;
}
.combobox-option {
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.combobox-option:last-child {
  border-bottom: none;
}
.combobox-option:hover, .combobox-option.selected {
  background: rgba(108, 92, 231, 0.35);
}
.results {
  margin-top: 8px;
  max-height: 200px;
  overflow-y: auto;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.result-row {
  padding: 8px 10px;
  cursor: pointer;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.result-row:hover, .result-row.selected {
  background: rgba(108, 92, 231, 0.35);
}
.result-row:last-child {
  border-bottom: none;
}
.empty {
  padding: 10px;
  font-size: 13px;
  opacity: 0.6;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
button {
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
}
button.confirm {
  background: #6c5ce7;
  color: #fff;
}
button.confirm:disabled {
  opacity: 0.4;
  cursor: default;
}
button.cancel {
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
}
button.disassociate {
  background: rgba(220, 60, 60, 0.85);
  color: #fff;
  margin-right: auto;
}
button.disassociate:disabled {
  opacity: 0.5;
  cursor: default;
}
.status-text {
  font-size: 12px;
  margin-top: 8px;
  min-height: 16px;
  opacity: 0.8;
}
`;
