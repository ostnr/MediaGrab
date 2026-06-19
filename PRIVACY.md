# Privacy Policy — MediaGrab

_Last updated: 2026-06-19_

MediaGrab is a browser extension that adds a download button to posts on
X (twitter.com / x.com) so you can save their photos, videos and GIFs.

## What data the extension accesses

- **Page content on x.com / twitter.com.** The extension reads the page you are
  viewing to place a download button and to find the media in the post you click.
- **X's own API responses, locally.** While you browse, the extension reads the
  responses that the X website itself loads, purely to extract the direct media
  URLs (image/video/GIF) of the posts on screen. This happens entirely inside your
  browser.
- **Your extension settings**, stored with the browser's `storage.sync` API
  (e.g. "save as readable file name", "convert GIF"). These are settings only,
  not personal data.

## What the extension does NOT do

- It does **not** collect, store or transmit any personal data.
- It does **not** send anything to the developer or to any third‑party server.
  There is no analytics, tracking, telemetry or remote logging.
- It does **not** read your cookies, passwords, login tokens or account
  credentials.
- It has **no** backend server and **no** database.

## Where data goes

When you click the download button, the media file is downloaded from X's media
servers (`*.twimg.com`) directly to your computer using the browser's own
download function. A short‑lived list of the media found on the current page is
kept in `sessionStorage` and is cleared automatically when you navigate away.

## Contact

Questions or issues: https://github.com/ostnr/MediaGrab/issues
