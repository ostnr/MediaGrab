// Service worker entry (Chrome MV3).
// Loads shared download helpers and the message router.
// Firefox has no background service workers: it ignores this file and loads the
// same three scripts via `background.scripts` in manifest.json — keep both in sync.
importScripts(
  'browser-polyfill.min.js',
  'twitter_video_downloader.js',
  'twitter_video_assist_server.js'
);
