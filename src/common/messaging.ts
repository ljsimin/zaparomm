import browser from "webextension-polyfill";
import type { RuntimeMessage, RuntimeResponse } from "./types";

export async function sendMessage<T = unknown>(
  message: RuntimeMessage
): Promise<RuntimeResponse<T>> {
  return (await browser.runtime.sendMessage(message)) as RuntimeResponse<T>;
}

export function onMessage(
  handler: (
    message: RuntimeMessage,
    sender: browser.Runtime.MessageSender
  ) => Promise<RuntimeResponse> | RuntimeResponse | undefined
) {
  browser.runtime.onMessage.addListener((message: unknown, sender: browser.Runtime.MessageSender) => {
    const result = handler(message as RuntimeMessage, sender);
    if (result === undefined) return undefined;
    return Promise.resolve(result);
  });
}
