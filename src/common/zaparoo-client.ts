import type { MediaLookupResult, MediaResult, ZaparooSettings, ZaparooSystem } from "./types";

export class ZaparooApiError extends Error {
  category: string;

  constructor(category: string, message: string) {
    super(message);
    this.category = category;
  }
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string; data?: { category?: string } };
}

let requestId = 0;

async function call<T>(settings: ZaparooSettings, method: string, params?: unknown): Promise<T> {
  const url = `http://${settings.zaparooHost}:${settings.zaparooPort}/api/v0.1`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (settings.zaparooApiKey) {
    headers.Authorization = `Bearer ${settings.zaparooApiKey}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: ++requestId,
        method,
        params,
      }),
    });
  } catch (err) {
    throw new ZaparooApiError("unreachable", `Could not reach Zaparoo at ${settings.zaparooHost}:${settings.zaparooPort}`);
  }

  if (!response.ok) {
    throw new ZaparooApiError("http_error", `Zaparoo returned HTTP ${response.status}`);
  }

  const body = (await response.json()) as JsonRpcResponse<T>;
  if (body.error) {
    const category = body.error.data?.category ?? "unknown";
    throw new ZaparooApiError(category, body.error.message);
  }
  return body.result as T;
}

export async function run(settings: ZaparooSettings, text: string): Promise<void> {
  await call<null>(settings, "run", { text });
}

export async function mediaLookup(
  settings: ZaparooSettings,
  system: string,
  name: string
): Promise<MediaLookupResult | null> {
  const result = await call<{ match: MediaLookupResult | null }>(settings, "media.lookup", {
    system,
    name,
    fuzzySystem: true,
  });
  return result.match;
}

export async function mediaSearch(
  settings: ZaparooSettings,
  query: string,
  systemId: string
): Promise<MediaResult[]> {
  const result = await call<{ results: MediaResult[] }>(settings, "media.search", {
    query,
    systems: [systemId],
    maxResults: 20,
  });
  return result.results;
}

export async function listSystems(settings: ZaparooSettings): Promise<ZaparooSystem[]> {
  const result = await call<{ systems: ZaparooSystem[] }>(settings, "systems", {});
  return result.systems;
}

export async function testConnection(settings: ZaparooSettings): Promise<void> {
  await call<unknown>(settings, "clients.current", {});
}
