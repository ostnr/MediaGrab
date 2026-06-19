# MediaGrab

Download photos, videos and GIFs from X (Twitter) posts — straight from a button
next to the post actions.

This is a maintained fork of [Twitter Media Assist](https://github.com/Flkalas/TwitterMediaAssist)
by Flkalas, which is no longer actively developed. Licensed under MIT (see
[LICENSE](LICENSE)).

## Install (Firefox, temporary / development)

1. Open `about:debugging` in Firefox.
2. Click **This Firefox** → **Load Temporary Add-on…**
3. Select `src/manifest.json` from this repo.

The add-on stays loaded until Firefox is closed. For a permanent install, build and
sign an XPI with [`web-ext`](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/).

## Privacy

MediaGrab parses the X (Twitter) web page locally in your browser. It does not collect
any user data and has no server or database — everything runs on your machine.

## Credits

- Original project: [Flkalas/TwitterMediaAssist](https://github.com/Flkalas/TwitterMediaAssist)
- Earlier predecessors: [TwitterVideoAssistChrome](https://github.com/Flkalas/TwitterVideoAssistChrome),
  [M2G](https://github.com/Flkalas/M2G)
