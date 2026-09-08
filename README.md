# Zaparoo for RomM

A Chrome/Firefox browser extension that adds a **Launch on Zaparoo** button to
[RomM](https://github.com/rommapp/romm)'s single-game page. Clicking it launches
that game on a [Zaparoo](https://zaparoo.org) Core instance on your local
network, via Zaparoo's ZapScript API — no more manually finding the game on
your Zaparoo device.

If Zaparoo can't confidently match the game automatically, or you want to fix
the match yourself, a search screen lets you pick the right platform and game
from Zaparoo's own library. Once you pick one, it's remembered for that game,
so you only ever have to fix it once.

## Build

Requires Node.js.

```sh
npm install
npm run build       # emits dist/chrome and dist/firefox
```

Other useful commands:

```sh
npm run watch        # rebuild automatically on file changes
npm run typecheck    # type-check without building
```

## Run (load the unpacked extension)

**Chrome / Chromium / Edge**

1. Go to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select the `dist/chrome/` folder.

**Firefox**

1. Go to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on** and select `dist/firefox/manifest.json`.
3. Note: Firefox removes temporary add-ons on restart, so you'll need to
   reload it each browser session (or package/sign it for permanent
   installation).

After loading, pin the extension's icon to your toolbar for easy access to
its settings.

## Usage

### First-run setup

The extension does nothing until it's told where RomM and Zaparoo are. Click
the extension's toolbar icon to open its settings page:

1. **RomM connection** — enter your RomM URL (e.g. `https://roms.example.com`)
   and click **Save & grant permission**. Approve the browser's permission
   prompt, then reload any open RomM tabs.
2. **Zaparoo connection** — enter your Zaparoo Core device's host/IP and port
   (default `7497`). If your Zaparoo instance requires an API key, enter it —
   otherwise leave it blank. Click **Save**, then **Test connection** to
   confirm the extension can reach it.

Real network discovery of Zaparoo isn't possible from inside a browser
extension, so the host/IP has to be entered manually — check your Zaparoo
device's own settings or router for its address.

**Optional — direct path launching:** if Zaparoo and RomM read the exact same
ROM files (e.g. both pointed at the same network share), fill in **Zaparoo
roms root path** with the path Zaparoo sees for RomM's library root (e.g.
`/media/fat/games`). Launches will then use the file's exact path instead of
guessing by name — more reliable, and works even for games Zaparoo hasn't
indexed a good title match for. RomM's own paths usually start with an extra
folder name that isn't part of the shared structure (commonly `roms/`) — if
a test launch shows up with that in the wrong place, set **RomM path prefix
to remove** to strip it (e.g. `roms/`). This only works if the folder layout
is otherwise identical on both sides beneath that root; if it isn't (or
launching by path fails for some other reason), the extension automatically
falls back to guessing by name.

### Launching a game

Open any game's page on RomM. A **Launch on Zaparoo** button appears next to
RomM's own Play/Download buttons, along with a small gear/pencil icon next to
it.

- Clicking **Launch on Zaparoo** first tries a direct file-path launch (if
  configured above), then falls back to looking the game up on Zaparoo by
  platform and name, launching whichever succeeds first.
- If no confident match is found, or the launch fails, a search screen opens
  automatically so you can pick the right platform and game yourself.
- The Launch button is hidden automatically if Zaparoo has no games at all
  for that platform — no point in showing a button that can't work. The gear
  icon stays visible either way, in case you still want to point it at a
  different platform/game manually.

### Fixing or pre-configuring a match

Click the small gear icon (next to Launch) at any time — whether or not
you've tried launching yet — to open the same search screen:

1. Use the **Platform** field to search and pick a Zaparoo system.
2. Use the **Game name** field to search Zaparoo's library for the right
   title.
3. Click a result, then **Save** (or **Save & Launch** if you opened this
   after a failed launch attempt).

Once saved, that exact match is remembered for this game and used every time
you click Launch — no more guessing. If you want to undo this and go back to
automatic matching, open the gear icon again and click **Remove saved
mapping**.

### Troubleshooting

Open the extension's settings page:

- **Error log** shows recent Zaparoo communication and launch failures
  (category, game, platform, message). Entries older than 24 hours are
  removed automatically; you can also clear it manually.
- **Saved launch targets** lists every game you've manually matched, showing
  both the RomM game/platform and what it's mapped to on Zaparoo, with an
  option to delete individual entries.
- **Test connection** under Zaparoo connection re-checks that the extension
  can reach your Zaparoo Core instance right now.

## License

[0BSD](LICENSE) — do whatever you want with it, no attribution needed, no
warranty provided.
