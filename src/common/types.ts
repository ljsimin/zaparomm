export interface RomMRomSummary {
  id: number;
  name: string;
  platformDisplayName: string;
  platformSlug: string;
  /** Path to the rom file, relative to RomM's own library root (its `full_path`). */
  fullPath: string;
}

export interface ZaparooSystem {
  id: string;
  name: string;
  category?: string;
  manufacturer?: string;
  mediaCount?: number;
}

export interface MediaResult {
  mediaId?: number;
  system: ZaparooSystem;
  name: string;
  zapScript: string;
  hasCover?: boolean;
}

export interface MediaLookupResult extends MediaResult {
  confidence: number;
}

export interface OverrideRecord {
  systemId: string;
  systemName: string;
  gameName: string;
  mediaId?: number;
  zapScript: string;
  savedAt: number;
  /** RomM's own name/platform for this game at the time it was mapped, for display only. */
  rommGameName?: string;
  rommPlatformName?: string;
}

export interface ErrorLogEntry {
  timestamp: number;
  category: string;
  message: string;
  romId?: number;
  romName?: string;
  platformName?: string;
}

export interface ZaparooSettings {
  zaparooHost: string;
  zaparooPort: number;
  zaparooApiKey?: string;
  rommOrigins: string[];
  /**
   * Path on the Zaparoo device's own filesystem that corresponds to RomM's library root,
   * for direct file-path launches. Only works when both point at the same underlying
   * folder structure (e.g. a shared network share for the ROM library). Optional — when
   * unset, launches fall back to name/platform lookup.
   */
  zaparooRomsRoot?: string;
  /**
   * A leading segment of RomM's own relative rom path to drop before joining it onto
   * zaparooRomsRoot. RomM's API path includes its internal roms folder name (commonly
   * "roms/"), which usually isn't part of the shared folder structure Zaparoo sees.
   */
  rommPathStripPrefix?: string;
}

export type LaunchError =
  | { category: string; message: string }
  | { category: "no_confident_match"; message: string };

export type RuntimeMessage =
  | { type: "LAUNCH_REQUEST"; romId: number; rommOrigin: string; rom: RomMRomSummary }
  | { type: "GET_SYSTEMS" }
  | { type: "SEARCH_MEDIA"; query: string; systemId: string }
  | { type: "LOOKUP_MEDIA"; system: string; name: string }
  | { type: "SAVE_OVERRIDE"; key: string; record: OverrideRecord }
  | { type: "GET_OVERRIDE"; key: string }
  | { type: "DELETE_OVERRIDE"; key: string }
  | { type: "LIST_OVERRIDES" }
  | { type: "HAS_MEDIA_IN_SYSTEM"; systemId: string }
  | { type: "LOG_ERROR"; entry: Omit<ErrorLogEntry, "timestamp"> }
  | { type: "TEST_CONNECTION" }
  | { type: "GET_ERROR_LOG" }
  | { type: "CLEAR_ERROR_LOG" }
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: ZaparooSettings }
  | { type: "REGISTER_ROMM_CONTENT_SCRIPTS" };

export type RuntimeResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: LaunchError };
