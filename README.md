# MediaGrab

Download photos, videos and GIFs from X (Twitter) posts — straight from a button
next to the post actions.

This is a maintained fork of [Twitter Media Assist](https://github.com/Flkalas/TwitterMediaAssist)
by Flkalas, which is no longer actively developed. Licensed under MIT (see
[LICENSE](LICENSE)).

## Browser support

- **Chrome / Chromium** — Manifest V3, ready for Chrome Web Store upload.
- **Firefox** — Manifest V3 (Firefox 121+), same package as Chrome.

## Install (development)

### Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `src/` folder from this repo.

### Firefox

1. Open `about:debugging` → **This Firefox**.
2. Click **Load Temporary Add-on…**.
3. Select `src/manifest.json`.

Reload the extension after code changes, then hard-reload any open x.com tab.

## Package for store upload

The store ZIP must have `manifest.json` at the archive root (contents of `src/`, not the folder itself):

```powershell
Compress-Archive -Path src\* -DestinationPath mediagrab-4.1.0.zip -Force
```

- **Chrome Web Store**: upload that ZIP; listing copy is in `STORE_LISTING.md`.
- **Firefox AMO**: same ZIP (or `web-ext build --source-dir ./src`).

## Privacy

MediaGrab parses the X (Twitter) web page locally in your browser. It does not collect
any user data and has no server or database — everything runs on your machine.
See [PRIVACY.md](PRIVACY.md).

## Credits

- Original project: [Flkalas/TwitterMediaAssist](https://github.com/Flkalas/TwitterMediaAssist)
- Earlier predecessors: [TwitterVideoAssistChrome](https://github.com/Flkalas/TwitterVideoAssistChrome),
  [M2G](https://github.com/Flkalas/M2G)
