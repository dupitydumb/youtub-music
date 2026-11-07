# YouTube Music for Audion

A plugin that adds YouTube Music to Audion. Browse the home feed and charts, search, open artist, album and playlist pages, and play tracks in the player. It needs no API key and no login.

## What it does

- Home feed with YouTube Music's shelves (recommended, trending, mixes)
- Trending charts
- Search for songs, albums, artists and playlists, with filter chips
- Artist pages with albums, singles and featured-on shelves
- Album and EP pages with a track list and Play All
- Playlist pages, both editorial and community
- Playback through InnerTube, with Piped and Invidious as fallbacks
- Add to queue without leaving the current page
- Save tracks to your Audion library in one click
- Registers as a `youtube` search source that other plugins can query
- Settings for custom Piped and Invidious instance lists

## Installation

1. Copy this folder into your Audion plugins directory.
2. Restart Audion if it doesn't pick the plugin up on its own.
3. Click **YouTube Music** in the player bar.

## How playback works

For each track, the plugin tries these backends in order and uses the first audio URL that works:

1. InnerTube `ANDROID_TESTSUITE`: returns un-ciphered URLs and is the most reliable
2. InnerTube `ANDROID`
3. InnerTube `TV_EMBEDDED` (`TVHTML5_SIMPLY_EMBEDDED_PLAYER`), the client Namida uses by default
4. Piped instances, via `/streams/:id`
5. Invidious instances, via `/api/v1/videos/:id`

Format preference is `m4a` (AAC) over `opus` (WebM), at the highest available bitrate.

## Permissions

| Permission | Used for |
|---|---|
| `network:fetch` | Requests through the Rust proxy, which avoids CORS |
| `ui:inject` | The player bar button and modal panel |
| `player:control` | Playback and queue changes |
| `player:read` | Highlighting the current track |
| `library:read` | Marking tracks already in your library |
| `library:write` | Saving tracks to your library |
| `storage:local` | Storing settings |

## Endpoints

- `music.youtube.com/youtubei/v1` with the `WEB_REMIX` client: search, home, trending, and artist, album and playlist pages
- `www.youtube.com/youtubei/v1` with the Android and TV clients: stream URL resolution
- Piped and Invidious: fallback when InnerTube only returns ciphered URLs

## Limitations

- Stream extraction is subject to YouTube's Terms of Service.
- Public Piped and Invidious instances go down regularly. Add your own in Settings if playback starts failing.
- Home feed content depends on region. The default is US/EN.
