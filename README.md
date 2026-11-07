# YouTube Music Plugin for Audion

A full YouTube Music client plugin — browse the Home feed, Trending charts, search songs/albums/artists/playlists, navigate artist and album pages, and play tracks directly in Audion. No API key required.

## Features

- 🏠 **Home feed** — personalized shelves from YouTube Music (Recommended, Trending, Mixes, etc.)
- 📈 **Trending** — global charts and hot tracks
- 🔍 **Search** — songs, albums, artists, playlists with filter chips
- 🎤 **Artist pages** — discography, singles, featured-on shelves
- 💿 **Album / EP pages** — full track list with Play All
- 📋 **Playlist pages** — community and editorial playlists
- ▶️ **Playback** — streams via InnerTube (un-ciphered ANDROID/TV_EMBEDDED clients) → Piped → Invidious fallback chain
- ➕ **Queue** — add any track to the queue without navigating away
- 💾 **Library** — save tracks to your Audion library with one click
- 🔀 **Cross-plugin search** — registers as a `youtube` search source for other plugins
- ⚙️ **Settings** — configure custom Piped/Invidious instance lists

## Stream Resolution Chain

The plugin tries each backend in order, returning the first working audio URL:

1. **InnerTube ANDROID_TESTSUITE** — un-ciphered, most reliable
2. **InnerTube ANDROID** — standard Android client
3. **InnerTube TV_EMBEDDED** — Namida's default (TVHTML5_SIMPLY_EMBEDDED_PLAYER)
4. **Piped instances** — public Piped API (`/streams/:id`)
5. **Invidious instances** — public Invidious API (`/api/v1/videos/:id`)

Audio format preference: `m4a` (AAC) > `opus` (WebM), highest available bitrate.

## Installation

1. Copy this folder into your Audion plugins directory
2. Audion will detect and load it automatically
3. Click **YouTube Music** in the player bar to open

## Permissions Required

| Permission | Purpose |
|---|---|
| `network:fetch` | CORS-free requests via Rust proxy |
| `ui:inject` | Playerbar button + modal panel |
| `player:control` | Playback, queue management |
| `player:read` | Now-playing highlight sync |
| `library:read` | Show which tracks are already saved |
| `library:write` | Save tracks to Audion library |
| `storage:local` | Persist settings and config |

## API Used

- **YouTube Music InnerTube** (`music.youtube.com/youtubei/v1`) with `WEB_REMIX` client — search, browse home/trending/artists/albums/playlists
- **YouTube InnerTube** (`www.youtube.com/youtubei/v1`) with Android/TV clients — stream resolution (un-ciphered URLs)
- **Piped/Invidious** — stream fallback when InnerTube returns ciphered URLs

## Notes

- No login required — uses public InnerTube APIs
- YouTube's ToS applies to stream extraction
- Piped/Invidious instances may go down; configure alternatives in Settings
- Home feed results may vary by region (default: US/EN)

