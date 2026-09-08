import type { RomMRomSummary } from "../common/types";

const cache = new Map<number, Promise<RomMRomSummary | null>>();

interface RommApiRom {
  id: number;
  name: string | null;
  platform_display_name: string;
  platform_slug: string;
  full_path: string;
}

export function extractRomId(pathname: string): number | null {
  const romMatch = pathname.match(/\/rom\/(\d+)/);
  if (romMatch) return Number(romMatch[1]);

  const trailingNumeric = pathname.match(/\/(\d+)(?:\/)?$/);
  if (trailingNumeric) return Number(trailingNumeric[1]);

  return null;
}

export function fetchRomData(romId: number): Promise<RomMRomSummary | null> {
  const cached = cache.get(romId);
  if (cached) return cached;

  const promise = fetch(`/api/roms/${romId}`, { credentials: "include" })
    .then((res) => (res.ok ? (res.json() as Promise<RommApiRom>) : null))
    .then((data): RomMRomSummary | null => {
      if (!data) return null;
      return {
        id: data.id,
        name: data.name ?? "",
        platformDisplayName: data.platform_display_name,
        platformSlug: data.platform_slug,
        fullPath: data.full_path,
      };
    })
    .catch(() => null);

  cache.set(romId, promise);
  return promise;
}

export function clearRomDataCache(romId: number): void {
  cache.delete(romId);
}
