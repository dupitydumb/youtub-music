// YouTube Music Plugin for Audion v1.0.0
// Full YouTube Music client: Home feed, Trending, Search (songs/albums/artists/playlists),
// Artist pages, Album pages, Playlist pages, Now Playing context.
// Stream resolution: InnerTube ANDROID_TESTSUITE → ANDROID → TV_EMBEDDED → Piped → Invidious
// No API key required. Uses YouTube Music WEB_REMIX InnerTube client for all browse/search.

(function () {
  'use strict';

  // ─── Constants ───────────────────────────────────────────────────────────────

  const SOURCE_TYPE  = 'youtube';
  const PLUGIN_ID    = 'youtube-music';
  const PLUGIN_LABEL = '[YTMusic]';

  // YouTube Music InnerTube (WEB_REMIX client — music-specific endpoints)
  const YTM_BASE    = 'https://music.youtube.com/youtubei/v1';
  const YTM_KEY     = 'AIzaSyC9XL3ZjWddXya6X74dJoCTL-KLET5YdCE';
  const YTM_CONTEXT = {
    client: {
      clientName:    'WEB_REMIX',
      clientVersion: '1.20241127.01.00',
      hl: 'en',
      gl: 'US',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'DESKTOP',
      musicAppInfo: { pwaInstallabilityStatus: 'PWA_INSTALLABILITY_STATUS_UNKNOWN' },
    },
  };

  // Stream resolution backends (InnerTube players + fallbacks)
  const STREAM_CONTEXTS = [
    {
      label: 'android',
      key:   'AIzaSyA8eiZmM1fadkCPco2mFCOFqNTKFz7a_WA',
      clientId: '3',
      context: { client: { clientName: 'ANDROID', clientVersion: '21.26.364', androidSdkVersion: 30, osName: 'Android', osVersion: '11', hl: 'en', gl: 'US' } },
      userAgent: 'com.google.android.youtube/21.26.364 (Linux; U; Android 11) gzip',
    },
    {
      label: 'android_vr',
      key:   'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      clientId: '28',
      context: { client: { clientName: 'ANDROID_VR', clientVersion: '1.60.19', deviceMake: 'Oculus', deviceModel: 'Quest 3', osName: 'Android', osVersion: '12', hl: 'en', gl: 'US' } },
      userAgent: 'Mozilla/5.0 (Android 12; VR) AppleWebKit/537.36',
    },
    {
      label: 'ios',
      key:   'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      clientId: '5',
      context: { client: { clientName: 'IOS', clientVersion: '21.26.4', deviceMake: 'Apple', deviceModel: 'iPhone16,2', hl: 'en', gl: 'US' } },
      userAgent: 'com.google.ios.youtube/21.26.4 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X; en_US)',
    },
    {
      label: 'tv_embedded',
      key:   'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      clientId: '85',
      context: { client: { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0', hl: 'en', gl: 'US' }, thirdParty: { embedUrl: 'https://www.youtube.com/' } },
    },
  ];

  const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.private.coffee',
    'https://pipedapi.leptons.xyz',
    'https://pipedapi.tokhmi.xyz',
  ];

  const INVIDIOUS_INSTANCES = [
    'https://yewtu.be',
    'https://invidious.flokinet.to',
    'https://inv.tux.pizza',
    'https://vid.puffyan.us',
  ];

  // ─── SVG Icons ───────────────────────────────────────────────────────────────

  const ICON = {
    ytmusic: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12 9.684 15.54z"/></svg>`,
    search:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    play:    `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
    pause:   `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`,
    heart:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    heartO:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    queue:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    playNext:`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
    back:    `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>`,
    close:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    home:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    trending:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    music:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`,
    album:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>`,
    artist:  `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    list:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
    sync:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>`,
    settings:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    import:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    link:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    check:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    wand:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 4-2 4 4 2-4-2-2-4Z"/><path d="m3 21 9-9"/><path d="M12.2 6.8 4 15l2 2 8.2-8.2Z"/></svg>`,
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmtDuration(sec) {
    if (!sec || sec < 0) return '';
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  }

  function upgradeThumbUrl(url, targetSize = 800) {
    if (!url || typeof url !== 'string') return url;

    // 1. Google Fife / Google User Content / GGPHT CDN (Used for official YTM covers & artist avatars)
    if (/googleusercontent\.com|ggpht\.com/i.test(url)) {
      if (/=([sw])\d+/i.test(url)) {
        return url.replace(/=([sw])\d+([^/]*)$/i, (match, prefix, rest) => {
          if (prefix.toLowerCase() === 'w') {
            const hasP = rest.includes('-p');
            const flags = (hasP ? '-p' : '') + '-l90-rj';
            return `=w${targetSize}-h${targetSize}${flags}`;
          }
          const hasC = rest.includes('-c');
          return `=s${targetSize}${hasC ? '-c-k-c0x00ffffff-no-rj' : ''}`;
        });
      }
      if (/\/(s|w)\d+([^/]*)$/i.test(url)) {
        return url.replace(/\/(s|w)\d+([^/]*)$/i, `/$1${targetSize}$2`);
      }
      return url;
    }

    // 2. YouTube Image CDN (i.ytimg.com)
    if (/ytimg\.com/i.test(url)) {
      const clean = url.split('?')[0];
      return clean.replace(/\/(?:mqdefault|default|sddefault)\.jpg$/i, '/hqdefault.jpg');
    }

    return url;
  }

  function ytThumb(videoId, q = 'hqdefault') {
    return `https://i.ytimg.com/vi/${videoId}/${q || 'hqdefault'}.jpg`;
  }

  function bestThumb(thumbnails) {
    if (!thumbnails || !thumbnails.length) return null;
    const sorted = [...thumbnails].sort((a, b) => {
      return ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0));
    });
    const largest = sorted[0]?.url || thumbnails[thumbnails.length - 1]?.url;
    return upgradeThumbUrl(largest);
  }

  function cleanTitleAndArtist(rawTitle, rawArtist, pageType, isVideoOrChannel = false) {
    let title = (rawTitle || '').trim();
    let artist = (rawArtist || '').trim();

    if (artist.endsWith(' - Topic')) {
      artist = artist.replace(/ - Topic$/, '').trim();
    }

    const isOfficialArtist = pageType === 'MUSIC_PAGE_TYPE_ARTIST';

    const isChannelOrLabel = isVideoOrChannel ||
      pageType === 'MUSIC_PAGE_TYPE_USER_CHANNEL' ||
      !artist ||
      /^(vevo|official|channel|music|records|label|curator|lyrics|nation|media|tv|sounds?|audio|entertainment|club|city|hub|studios?)$/i.test(artist) ||
      /(?:vevo|records|entertainment|official\s*channel|music\s*channel)$/i.test(artist) ||
      /^(trap\s*nation|7clouds|proximity|lyrical\s*lemonade|selected\.|spinnin'\s*records|monstercat|live\s*aid|mister\s*suicidesheep|chilledcow|lofi\s*girl)$/i.test(artist);

    const splitMatch = title.match(/^(.+?)\s+[-–—|:_]\s+(.+)$/);
    if (splitMatch && (!isOfficialArtist || isChannelOrLabel)) {
      const left = splitMatch[1].trim();
      const right = splitMatch[2].trim();
      if (left.length > 0 && right.length > 0) {
        artist = left;
        title = right;
      }
    }

    const junkPatterns = [
      /\s*\[\s*(?:official\s*(?:music\s*)?video|official\s*audio|lyric\s*video|lyrics|audio|hd|4k|mv|music\s*video|visualizer|clip\s*officiel|video\s*oficial)\s*\]/gi,
      /\s*\(\s*(?:official\s*(?:music\s*)?video|official\s*audio|lyric\s*video|lyrics|audio|hd|4k|mv|music\s*video|visualizer|clip\s*officiel|video\s*oficial)\s*\)/gi,
      /\s*\[\s*(?:full\s*hd|1080p|720p|4k\s*uhd|remastered|remaster)\s*\]/gi,
      /\s*\(\s*(?:full\s*hd|1080p|720p|4k\s*uhd|remastered|remaster)\s*\)/gi,
      /\s*\[\s*(?:live(?:\s+(?:at|in|aid|\d{4}))?[^\]]*)\s*\]/gi,
      /\s*\(\s*(?:live(?:\s+(?:at|in|aid|\d{4}))?[^\)]*)\s*\)/gi,
      /\s*\[\s*(?:directed\s+by\s+[^\]]+)\s*\]/gi,
      /\s*\(\s*(?:directed\s+by\s+[^\)]+)\s*\)/gi,
      /^\s*\[\s*(?:mv|official\s*video|hd)\s*\]\s*/gi,
      /^\s*【\s*(?:mv|hd)\s*】\s*/gi,
      /\s+(?:\d{4}\s+)?live\s+video(?:\s+full\s+hd|\s+hd)?$/i,
    ];

    for (const pat of junkPatterns) {
      title = title.replace(pat, '');
    }

    title = title.replace(/^[\s\-–—|:]+|[\s\-–—|:]+$/g, '').trim();
    title = title.replace(/^["'“”](.*)["'“”]$/, '$1').trim();

    if (/VEVO$/i.test(artist) && artist.length > 4) {
      artist = artist.replace(/VEVO$/i, '').trim();
    }
    if (/Official$/i.test(artist) && artist.length > 8) {
      artist = artist.replace(/Official$/i, '').trim();
    }

    return {
      title: title || rawTitle,
      artist: artist || rawArtist || 'Unknown Artist'
    };
  }

  const canonicalMetaCache = new Map();

  async function fetchCanonicalMetadata(title, artist, apiFetch) {
    const query = `${artist} ${title}`.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const cacheKey = query.toLowerCase();
    if (canonicalMetaCache.has(cacheKey)) return canonicalMetaCache.get(cacheKey);

    // 1. Primary: iTunes / Apple Music Search API
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
      const res = await apiFetch(url, { headers: { 'User-Agent': 'Audion/1.0' } });
      if (res.ok) {
        const json = await res.json();
        if (json.results && json.results.length > 0) {
          const r = json.results[0];
          const hiResCover = r.artworkUrl100
            ? r.artworkUrl100.replace(/100x100bb\.jpg$/, '1000x1000bb.jpg')
            : null;
          const result = {
            title:  r.trackName || title,
            artist: r.artistName || artist,
            album:  r.collectionName || '',
            thumb:  hiResCover,
            source: 'itunes'
          };
          canonicalMetaCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (_) {}

    // 2. Fallback: Deezer API
    try {
      const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`;
      const res = await apiFetch(url, { headers: { 'User-Agent': 'Audion/1.0' } });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const r = json.data[0];
          const result = {
            title:  r.title || title,
            artist: r.artist?.name || artist,
            album:  r.album?.title || '',
            thumb:  r.album?.cover_xl || r.album?.cover_big,
            source: 'deezer'
          };
          canonicalMetaCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (_) {}

    return null;
  }

  function getText(runs) {
    if (!runs) return '';
    if (typeof runs === 'string') return runs;
    if (Array.isArray(runs)) return runs.map(r => r?.text || '').join('');
    if (runs.runs) return getText(runs.runs);
    if (runs.simpleText) return runs.simpleText;
    return '';
  }

  function getNav(runs) {
    if (!runs || !runs.length) return null;
    for (const r of runs) {
      if (r?.navigationEndpoint?.browseEndpoint) return r.navigationEndpoint.browseEndpoint;
    }
    return null;
  }

  function isDurationStr(txt) {
    return /^\d{1,2}:\d{2}(?::\d{2})?$/.test((txt || '').trim());
  }

  function isStatOrType(txt) {
    const t = (txt || '').trim();
    if (!t) return true;
    if (isDurationStr(t)) return true;
    if (/^(Song|Video|Episode|Artist|Album|Playlist|Single|EP|Channel)$/i.test(t)) return true;
    if (/^\d{4}$/.test(t)) return true; // year
    if (/(views|plays|subscribers|listeners|monthly audience)/i.test(t)) return true;
    return false;
  }

  function parseDurationText(txt) {
    if (!txt) return 0;
    const p = String(txt).split(':').map(Number);
    if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2];
    if (p.length === 2) return p[0]*60 + p[1];
    return 0;
  }

  function parseYouTubeUrl(urlOrId) {
    if (!urlOrId || typeof urlOrId !== 'string') return null;
    const str = urlOrId.trim();

    // 1. Raw IDs:
    // Playlists: PL..., OLAK5uy_..., RD..., VL...
    if (/^(VL)?(PL|OLAK5uy_|RD|UU|FL|LL)[a-zA-Z0-9_-]+$/.test(str)) {
      const listId = str.startsWith('VL') ? str.slice(2) : str;
      return { type: 'playlist', listId, browseId: `VL${listId}` };
    }
    // Album browseId: MPREb_...
    if (/^MPREb_[a-zA-Z0-9_-]+$/.test(str)) {
      return { type: 'album', browseId: str };
    }
    // Video ID: exactly 11 characters
    if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
      return { type: 'track', videoId: str };
    }

    try {
      const urlToParse = /^[a-zA-Z]+:\/\//.test(str) ? str : `https://${str}`;
      const u = new URL(urlToParse);
      const host = u.hostname.toLowerCase();
      if (!host.includes('youtube.com') && !host.includes('youtu.be')) {
        return null;
      }

      const listParam = u.searchParams.get('list');
      const vParam = u.searchParams.get('v');

      // Playlist in query parameter
      if (listParam) {
        const cleanListId = listParam.startsWith('VL') ? listParam.slice(2) : listParam;
        return {
          type: 'playlist',
          listId: cleanListId,
          browseId: `VL${cleanListId}`,
          videoId: vParam || null,
        };
      }

      // youtu.be/VIDEO_ID
      if (host.includes('youtu.be')) {
        const vid = u.pathname.slice(1).split('/')[0].split('?')[0];
        if (vid && vid.length === 11) {
          return { type: 'track', videoId: vid };
        }
      }

      // /watch?v=VIDEO_ID
      if (vParam && vParam.length === 11) {
        return { type: 'track', videoId: vParam };
      }

      // /browse/MPREb_... (Album) or /browse/VLPL... or /browse/UC...
      if (u.pathname.startsWith('/browse/')) {
        const browseId = u.pathname.replace('/browse/', '').split('/')[0];
        if (browseId.startsWith('MPRE')) return { type: 'album', browseId };
        if (browseId.startsWith('UC')) return { type: 'artist', browseId };
        if (browseId.startsWith('VL') || browseId.startsWith('PL')) {
          const listId = browseId.startsWith('VL') ? browseId.slice(2) : browseId;
          return { type: 'playlist', listId, browseId: `VL${listId}` };
        }
      }

      // /channel/UC...
      if (u.pathname.startsWith('/channel/')) {
        const artistId = u.pathname.replace('/channel/', '').split('/')[0];
        return { type: 'artist', browseId: artistId };
      }
    } catch (_) {
      return null;
    }

    return null;
  }

  function extractContinuationToken(r) {
    if (!r) return null;
    if (Array.isArray(r.continuations) && r.continuations.length) {
      const c = r.continuations[0];
      if (c?.nextContinuationData?.continuation) return c.nextContinuationData.continuation;
      if (c?.reloadContinuationData?.continuation) return c.reloadContinuationData.continuation;
    }
    if (Array.isArray(r.contents)) {
      for (const item of r.contents) {
        if (item?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
          return item.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
        }
      }
    }
    return null;
  }

  function findShelfContinuationToken(data) {
    if (!data || typeof data !== 'object') return null;
    let found = null;
    function walk(o, depth = 0) {
      if (!o || typeof o !== 'object' || depth > 10 || found) return;
      if (o.musicPlaylistShelfRenderer) {
        const t = extractContinuationToken(o.musicPlaylistShelfRenderer);
        if (t) { found = t; return; }
      }
      if (o.musicShelfRenderer) {
        const t = extractContinuationToken(o.musicShelfRenderer);
        if (t) { found = t; return; }
      }
      if (Array.isArray(o.continuations)) {
        for (const c of o.continuations) {
          if (c?.nextContinuationData?.continuation) { found = c.nextContinuationData.continuation; return; }
          if (c?.reloadContinuationData?.continuation) { found = c.reloadContinuationData.continuation; return; }
        }
      }
      if (o.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token) {
        found = o.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
        return;
      }
      if (Array.isArray(o)) {
        for (const el of o) walk(el, depth + 1);
      } else {
        for (const k of Object.keys(o)) {
          if (k !== '_raw') walk(o[k], depth + 1);
        }
      }
    }
    walk(data);
    return found;
  }

  // ─── Cache ───────────────────────────────────────────────────────────────────

  class MemCache {
    constructor(defaultTtlMs = 300000) {
      this._store = new Map();
      this._ttl = defaultTtlMs;
    }
    get(key) {
      const e = this._store.get(key);
      if (!e) return null;
      if (Date.now() > e.exp) { this._store.delete(key); return null; }
      return e.val;
    }
    set(key, val, ttlMs) {
      this._store.set(key, { val, exp: Date.now() + (ttlMs ?? this._ttl) });
    }
    clear() { this._store.clear(); }
  }

  // ─── InnerTube Network Layer ─────────────────────────────────────────────────

  async function ytmPost(endpoint, body, apiFetch) {
    const url = `${YTM_BASE}/${endpoint}?key=${YTM_KEY}&prettyPrint=false`;
    const res = await apiFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': '67',
        'X-YouTube-Client-Version': YTM_CONTEXT.client.clientVersion,
        'Origin': 'https://music.youtube.com',
        'Referer': 'https://music.youtube.com/',
      },
      body: JSON.stringify({ context: YTM_CONTEXT, ...body }),
    });
    if (!res.ok) throw new Error(`YTMusic InnerTube ${endpoint} HTTP ${res.status}`);
    return res.json();
  }

  async function tryInstances(instances, buildUrl, apiFetch, buildOpts) {
    const errs = [];
    for (const base of instances) {
      try {
        const url = typeof buildUrl === 'function' ? buildUrl(base) : `${base}${buildUrl}`;
        const opts = buildOpts ? buildOpts(base) : {};
        const res = await apiFetch(url, opts);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { data: await res.json(), base };
      } catch (e) { errs.push(`${base}: ${e.message}`); }
    }
    throw new Error(`All instances failed:\n${errs.join('\n')}`);
  }

  // ─── YTMusic Data Parsers ─────────────────────────────────────────────────────

  // Walk every key of a raw API response object and collect all section-like
  // renderers recursively — this makes parsing immune to nesting changes.
  function collectSections(obj, depth = 0, out = []) {
    if (!obj || typeof obj !== 'object' || depth > 12) return out;
    if (Array.isArray(obj)) { obj.forEach(el => collectSections(el, depth + 1, out)); return out; }

    if (obj.musicShelfRenderer) {
      const r = obj.musicShelfRenderer;
      const title = getText(r.title || r.header?.musicCarouselShelfBasicHeaderRenderer?.title);
      const items = (r.contents || []).map(parseMusicItem).filter(Boolean);
      if (items.length) out.push({ title, items, _type: 'shelf' });
      return out; // don't recurse into contents — already parsed
    }
    if (obj.musicCarouselShelfRenderer) {
      const r = obj.musicCarouselShelfRenderer;
      const title = getText(
        r.header?.musicCarouselShelfBasicHeaderRenderer?.title ||
        r.header?.musicCarouselShelfImmersiveHeaderRenderer?.title
      );
      const items = (r.contents || []).map(parseMusicItem).filter(Boolean);
      if (items.length) out.push({ title, items, _type: 'carousel' });
      return out;
    }
    if (obj.musicImmersiveCarouselShelfRenderer) {
      const r = obj.musicImmersiveCarouselShelfRenderer;
      const title = getText(r.header?.musicImmersiveCarouselShelfRenderer?.title ||
                            r.header?.musicCarouselShelfBasicHeaderRenderer?.title);
      const items = (r.contents || []).map(parseMusicItem).filter(Boolean);
      if (items.length) out.push({ title, items, _type: 'immersive' });
      return out;
    }
    if (obj.musicPlaylistShelfRenderer) {
      const r = obj.musicPlaylistShelfRenderer;
      const items = (r.contents || []).map(parseMusicItem).filter(Boolean);
      if (items.length) out.push({ title: null, items, _type: 'playlist-shelf' });
      return out;
    }

    // Recurse into child keys
    for (const key of Object.keys(obj)) {
      if (key === '_raw') continue;
      collectSections(obj[key], depth + 1, out);
    }
    return out;
  }

  function parseMusicItem(item) {
    if (!item) return null;

    // --- musicTwoRowItemRenderer (cards: albums, artists, playlists) ---
    const twoRow = item.musicTwoRowItemRenderer;
    if (twoRow) {
      const title = getText(twoRow.title);
      if (!title) return null;

      // Thumbnail: thumbnailRenderer is the most common path in WEB_REMIX
      const thumbThumbnails =
        twoRow.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        twoRow.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        twoRow.thumbnailRenderer?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails;
      const thumb = bestThumb(thumbThumbnails);

      // Navigation: watch (song), watchPlaylist (radio), or browse (artist/album/playlist)
      const nav = twoRow.navigationEndpoint;
      const watchNav      = nav?.watchEndpoint;
      const watchPlNav    = nav?.watchPlaylistEndpoint;
      const browseNav     = nav?.browseEndpoint;

      const videoId    = watchNav?.videoId || watchPlNav?.videoId;
      const playlistId = watchNav?.playlistId || watchPlNav?.playlistId;
      const browseId   = browseNav?.browseId;
      const pageType   = browseNav?.browseEndpointContextSupportedConfigs
                           ?.browseEndpointContextMusicConfig?.pageType;

      const subtitle = getText(twoRow.subtitle);

      // Duration: check subtitle runs or string for time format (e.g. "3:45")
      let duration = 0;
      const subRuns = twoRow.subtitle?.runs || [];
      for (const r of subRuns) {
        const d = parseDurationText(r.text?.trim());
        if (d > 0) { duration = d; break; }
      }
      if (!duration && typeof subtitle === 'string') {
        const match = subtitle.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
        if (match) duration = parseDurationText(match[0]);
      }

      // For songs embedded in a carousel (they have a watchEndpoint in a menu or the item itself)
      if (videoId) {
        let cardArtist = '';
        for (const r of subRuns) {
          const t = r.text?.trim() || '';
          if (!cardArtist && !isStatOrType(t)) {
            cardArtist = t;
            break;
          }
        }
        const cleaned = cleanTitleAndArtist(title, cardArtist, pageType, true);
        return { title: cleaned.title, artist: cleaned.artist, thumb, browseId, videoId, playlistId, subtitle, pageType, duration };
      }
      return { title, thumb, browseId, videoId, playlistId, subtitle, pageType, duration };
    }

    // --- musicResponsiveListItemRenderer (track rows in search/album/playlist) ---
    const listItem = item.musicResponsiveListItemRenderer;
    if (listItem) {
      const cols  = listItem.flexColumns || [];
      const col0  = cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text;
      const col1  = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text;
      const col2  = cols[2]?.musicResponsiveListItemFlexColumnRenderer?.text;
      const col3  = cols[3]?.musicResponsiveListItemFlexColumnRenderer?.text;

      let title = getText(col0);
      if (!title) return null;

      // videoId — several possible locations, try all
      const overlayEndpoint =
        listItem.overlay?.musicItemThumbnailOverlayRenderer?.content
          ?.musicPlayButtonRenderer?.playNavigationEndpoint;
      const col0Run0Nav = col0?.runs?.[0]?.navigationEndpoint;

      const videoId =
        listItem.playlistItemData?.videoId ||
        overlayEndpoint?.watchEndpoint?.videoId ||
        col0Run0Nav?.watchEndpoint?.videoId;

      // browseId from listItem.navigationEndpoint or col0
      const navEndpoint = listItem.navigationEndpoint || col0Run0Nav;
      const browseId = navEndpoint?.browseEndpoint?.browseId || col0Run0Nav?.browseEndpoint?.browseId;
      const pageType = navEndpoint?.browseEndpoint
                         ?.browseEndpointContextSupportedConfigs
                         ?.browseEndpointContextMusicConfig?.pageType ||
                       col0Run0Nav?.browseEndpoint
                         ?.browseEndpointContextSupportedConfigs
                         ?.browseEndpointContextMusicConfig?.pageType;

      // Thumbnail
      const thumb = bestThumb(
        listItem.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        listItem.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails
      ) || (videoId ? ytThumb(videoId, 'hqdefault') : null);

      // Duration from fixedColumns, lengthText, or runs
      let duration = parseDurationText(
        getText(listItem.fixedColumns?.[0]?.musicResponsiveListItemFixedColumnRenderer?.text)
      );
      if (!duration) {
        for (const col of cols) {
          const runs = col?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
          for (const r of runs) {
            const d = parseDurationText(r.text?.trim());
            if (d > 0) { duration = d; break; }
          }
          if (duration) break;
        }
      }
      if (!duration) {
        const fullText = cols.map(c => getText(c?.musicResponsiveListItemFlexColumnRenderer?.text)).join(' ');
        const match = fullText.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
        if (match) duration = parseDurationText(match[0]);
      }
      if (!duration && videoId && videoDurationCache.has(videoId)) {
        duration = videoDurationCache.get(videoId);
      }
      if (duration > 0 && videoId) {
        videoDurationCache.set(videoId, duration);
      }

      // Subtitle/artist/album — col1 is usually "artist • album • year" runs
      // Filter out separator runs (• ·) and pick meaningful text
      const col1Runs  = (col1?.runs || []).filter(r => r.text && r.text.trim() !== '•' && r.text.trim() !== '·');
      const col2Runs  = (col2?.runs || []).filter(r => r.text && r.text.trim() !== '•' && r.text.trim() !== '·');
      const col3Runs  = (col3?.runs || []).filter(r => r.text && r.text.trim() !== '•' && r.text.trim() !== '·');

      // Try to find artist vs album from navigation endpoints
      let artist = '', album = '', artistBrowseId = null, albumBrowseId = null;
      let isVerifiedArtist = false;
      const allSubRuns = [...col1Runs, ...col2Runs, ...col3Runs];
      for (const run of allSubRuns) {
        const bNav = run.navigationEndpoint?.browseEndpoint;
        const bId = bNav?.browseId;
        const runPT = bNav?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
        if (runPT?.includes('ARTIST')) {
          if (!artist && !isStatOrType(run.text)) {
            artist = run.text.trim();
            artistBrowseId = bId;
            isVerifiedArtist = true;
          }
        } else if (runPT?.includes('ALBUM') || runPT?.includes('SINGLE') || (bId && bId.startsWith('MPRE'))) {
          if (!album && !isStatOrType(run.text)) {
            album = run.text.trim();
            albumBrowseId = bId;
          }
        }
      }

      // If not found by endpoint tags, fall back to run text without stats or durations
      if (!artist) {
        for (const run of col1Runs) {
          const text = run.text?.trim();
          if (isStatOrType(text)) continue;
          artist = text;
          artistBrowseId = run.navigationEndpoint?.browseEndpoint?.browseId || null;
          break;
        }
      }
      if (!artist && col2Runs.length) {
        for (const run of col2Runs) {
          const text = run.text?.trim();
          if (isStatOrType(text)) continue;
          artist = text;
          artistBrowseId = run.navigationEndpoint?.browseEndpoint?.browseId || null;
          break;
        }
      }
      if (!album) {
        for (const run of [...col1Runs, ...col2Runs]) {
          const text = run.text?.trim();
          if (isStatOrType(text) || text === artist) continue;
          album = text;
          albumBrowseId = run.navigationEndpoint?.browseEndpoint?.browseId || null;
          break;
        }
      }

      // Clean title and artist
      const cleaned = cleanTitleAndArtist(title, artist, isVerifiedArtist ? 'MUSIC_PAGE_TYPE_ARTIST' : (pageType || 'MUSIC_PAGE_TYPE_USER_CHANNEL'), !!videoId);
      title = cleaned.title;
      artist = cleaned.artist;

      // Explicit badge
      const isExplicit = !!(listItem.badges?.some(b =>
        b.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
      ));

      return { title, artist, album, artistBrowseId, albumBrowseId, thumb, videoId, browseId, pageType, duration, isExplicit };
    }

    return null;
  }

  // ─── YouTube Music API ────────────────────────────────────────────────────────

  const API = {

    async search(query, apiFetch, filter = null) {
      // filter: 'songs' | 'albums' | 'artists' | 'playlists' | null (all)
      const params = {
        songs:     'EgWKAQIIAWoKEAoQBRAJEAMQBA%3D%3D',
        albums:    'EgWKAQIYAWoKEAoQBRAJEAMQBA%3D%3D',
        artists:   'EgWKAQIgAWoKEAoQBRAJEAMQBA%3D%3D',
        playlists: 'EgWKAQIoAWoKEAoQBRAJEAMQBA%3D%3D',
      };
      const body = { query };
      if (filter && params[filter]) body.params = params[filter];

      const data = await ytmPost('search', body, apiFetch);
      return parseSearchResults(data);
    },

    async getHome(apiFetch) {
      const data = await ytmPost('browse', { browseId: 'FEmusic_home' }, apiFetch);
      return parseBrowse(data);
    },

    async getTrending(apiFetch) {
      const data = await ytmPost('browse', { browseId: 'FEmusic_charts' }, apiFetch);
      return parseBrowse(data);
    },

    async getHotTracks(apiFetch) {
      // Top tracks chart for US
      const data = await ytmPost('browse', {
        browseId: 'FEmusic_charts',
        formData: { selectedValues: ['CAM%3D'] }
      }, apiFetch);
      return parseBrowse(data);
    },

    async getArtist(browseId, apiFetch) {
      const data = await ytmPost('browse', { browseId }, apiFetch);
      return parseArtistPage(data, browseId);
    },

    async getAlbum(browseId, apiFetch) {
      const data = await ytmPost('browse', { browseId }, apiFetch);
      return parseAlbumPage(data, browseId);
    },

    async getPlaylist(browseId, apiFetch) {
      const bid = (browseId.startsWith('VL') || browseId.startsWith('MPRE')) ? browseId : `VL${browseId}`;
      const data = await ytmPost('browse', { browseId: bid }, apiFetch);
      return parsePlaylistPage(data, bid);
    },

    async getPlaylistAllTracks(browseId, apiFetch, onProgress = null, maxTracks = 500) {
      const bid = (browseId.startsWith('VL') || browseId.startsWith('MPRE')) ? browseId : `VL${browseId}`;
      const firstPage = await this.getPlaylist(bid, apiFetch);
      const allTracks = [...(firstPage.tracks || [])];
      let token = firstPage.continuationToken;

      onProgress?.({ loaded: allTracks.length, hasMore: Boolean(token) });

      while (token && allTracks.length < maxTracks) {
        try {
          const contData = await ytmPost(`browse?continuation=${encodeURIComponent(token)}`, { continuation: token }, apiFetch);
          const cont = contData?.continuationContents?.musicPlaylistShelfContinuation ||
                       contData?.continuationContents?.musicShelfContinuation;
          if (!cont || !cont.contents?.length) break;

          let added = 0;
          for (const itemWrapper of cont.contents) {
            const p = parseMusicItem(itemWrapper);
            if (p && p.videoId) {
              allTracks.push({
                ...p,
                artist: (p.artist && !isStatOrType(p.artist)) ? p.artist : (firstPage.owner || 'Unknown Artist'),
                album:  p.album || firstPage.title,
                thumb:  p.thumb || (p.videoId ? ytThumb(p.videoId, 'hqdefault') : null) || firstPage.thumb,
              });
              added++;
            }
          }
          if (added === 0) break;

          token = findShelfContinuationToken(contData);
          onProgress?.({ loaded: allTracks.length, hasMore: Boolean(token) });
        } catch (err) {
          console.warn(`${PLUGIN_LABEL} continuation failed:`, err);
          break;
        }
      }

      return {
        ...firstPage,
        tracks: allTracks,
        hasMore: Boolean(token),
        continuationToken: token,
      };
    },

    async getWatchPlaylist(videoId, playlistId, apiFetch) {
      const body = { enablePersistentPlaylistPanel: true, isAudioOnly: true };
      if (videoId) body.videoId = videoId;
      if (playlistId) body.playlistId = playlistId;
      const data = await ytmPost('next', body, apiFetch);
      return parseWatchPlaylist(data);
    },
  };

  function parseSearchResults(data) {
    const tab = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer;
    if (!tab?.contents) {
      return collectSections(data);
    }

    const sections = [];
    const songs = [];
    const entities = [];

    for (const c of tab.contents) {
      if (c.musicCardShelfRenderer) {
        const card = c.musicCardShelfRenderer;
        const title = getText(card.title);
        const subtitle = getText(card.subtitle);
        const thumb = bestThumb(
          card.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
          card.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails
        );
        const browseId = card.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId ||
                         card.onTap?.browseEndpoint?.browseId;
        const pageType = card.title?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType ||
                         card.onTap?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType;
        const videoId = card.onTap?.watchEndpoint?.videoId ||
                        card.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId ||
                        card.buttons?.find(b => b.musicPlayButtonRenderer)?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId || null;

        const cardSubRuns = card.subtitle?.runs || [];
        let cardArtist = '';
        let cardDuration = 0;
        for (const r of cardSubRuns) {
          const t = r.text?.trim() || '';
          if (!cardArtist && !isStatOrType(t)) {
            cardArtist = t;
          }
          if (!cardDuration) {
            const d = parseDurationText(t);
            if (d > 0) cardDuration = d;
          }
        }
        if (!cardDuration && typeof subtitle === 'string') {
          const m = subtitle.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
          if (m) cardDuration = parseDurationText(m[0]);
        }
        if (videoId && cardDuration > 0) {
          videoDurationCache.set(videoId, cardDuration);
        }

        let heroTitle = title;
        if (videoId) {
          const cleaned = cleanTitleAndArtist(title, cardArtist, pageType, true);
          heroTitle = cleaned.title;
          cardArtist = cleaned.artist;
        }

        const topTracks = (card.contents || []).map(parseMusicItem).filter(Boolean);
        sections.push({
          _type: 'card-hero',
          title: 'Top Result',
          item: { title: heroTitle, subtitle, thumb, browseId, pageType, videoId, artist: cardArtist, duration: cardDuration },
          items: topTracks
        });
      } else if (c.itemSectionRenderer) {
        for (const itemWrapper of (c.itemSectionRenderer.contents || [])) {
          const parsed = parseMusicItem(itemWrapper);
          if (parsed) {
            if (parsed.videoId) {
              songs.push(parsed);
            } else if (parsed.browseId) {
              entities.push(parsed);
            }
          }
        }
      } else if (c.musicShelfRenderer || c.musicCarouselShelfRenderer) {
        const s = collectSections(c);
        if (s.length) sections.push(...s);
      }
    }

    if (songs.length) {
      sections.push({ title: 'Songs', items: songs, _type: 'shelf' });
    }
    if (entities.length) {
      sections.push({ title: 'Albums, Artists & Playlists', items: entities, _type: 'carousel' });
    }

    return sections.length ? sections : collectSections(data);
  }

  function parseBrowse(data) {
    return collectSections(data);
  }

  function findHeaderRenderer(data) {
    if (data?.header?.musicResponsiveHeaderRenderer) return { type: 'responsive', h: data.header.musicResponsiveHeaderRenderer };
    if (data?.header?.musicDetailHeaderRenderer) return { type: 'detail', h: data.header.musicDetailHeaderRenderer };
    if (data?.header?.musicImmersiveHeaderRenderer) return { type: 'immersive', h: data.header.musicImmersiveHeaderRenderer };
    if (data?.header?.musicVisualHeaderRenderer) return { type: 'visual', h: data.header.musicVisualHeaderRenderer };
    if (data?.header?.musicEditablePlaylistDetailHeaderRenderer?.header?.musicDetailHeaderRenderer) {
      return { type: 'detail', h: data.header.musicEditablePlaylistDetailHeaderRenderer.header.musicDetailHeaderRenderer };
    }
    const contents = data?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
                     data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents ||
                     data?.contents?.sectionListRenderer?.contents || [];
    for (const c of contents) {
      if (c.musicResponsiveHeaderRenderer) return { type: 'responsive', h: c.musicResponsiveHeaderRenderer };
      if (c.musicDetailHeaderRenderer) return { type: 'detail', h: c.musicDetailHeaderRenderer };
    }
    return null;
  }

  function parseArtistPage(data, browseId) {
    const res = findHeaderRenderer(data);
    const header = res?.h;
    const name   = getText(header?.title);
    const thumb  = bestThumb(
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      header?.foregroundThumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails
    );
    const sections = parseBrowse(data);
    for (const s of sections) {
      if (s.items) {
        for (const item of s.items) {
          if (item.videoId && (!item.artist || isStatOrType(item.artist))) {
            item.artist = name;
          }
        }
      }
    }
    return { type: 'artist', name, thumb, browseId, sections };
  }

  function parseAlbumPage(data, browseId) {
    const res = findHeaderRenderer(data);
    const header  = res?.h;
    const title   = getText(header?.title);
    let artist = '';
    let artistBrowseId = null;

    if (header?.straplineTextOne) {
      artist = getText(header.straplineTextOne);
      artistBrowseId = header.straplineTextOne?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId || null;
    }
    const subRuns = header?.subtitle?.runs || [];
    if (!artist) {
      const artistRun = subRuns.find(r => r.navigationEndpoint?.browseEndpoint?.browseId);
      artist = subRuns.filter(r => r.navigationEndpoint?.browseEndpoint).map(r => r.text).join('') ||
               getText(header?.subtitle);
      artistBrowseId = artistRun?.navigationEndpoint?.browseEndpoint?.browseId || null;
    }
    const year = subRuns.find(r => /^\d{4}$/.test(r.text?.trim()))?.text;
    const thumb = bestThumb(
      header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails
    );
    // Collect tracks via generic section collector
    const sections = collectSections(data);
    const trackSection = sections.find(s => s.items.some(i => i.videoId));
    const tracks = (trackSection?.items || []).map((p, idx) => ({
      ...p,
      trackNumber: idx + 1,
      artist: (p.artist && !isStatOrType(p.artist)) ? p.artist : (artist || 'Unknown Artist'),
      album: p.album || title,
      albumArtist: p.albumArtist || artist,
      thumb: p.thumb || (p.videoId ? ytThumb(p.videoId, 'hqdefault') : null) || thumb,
      artistBrowseId: p.artistBrowseId || artistBrowseId,
    }));
    return { type: 'album', title, artist, artistBrowseId, year, thumb, browseId, tracks };
  }

  function parsePlaylistPage(data, browseId) {
    const res = findHeaderRenderer(data);
    const header = res?.h;
    const title  = getText(header?.title);
    const owner  = getText(header?.straplineTextOne) || getText(header?.subtitle);
    const thumb  = bestThumb(
      header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails
    );
    // Use generic collector for tracks
    const sections = collectSections(data);
    const trackSection = sections.find(s => s.items.some(i => i.videoId));
    const tracks = (trackSection?.items || []).map(p => {
      let trackArtist = (p.artist && !isStatOrType(p.artist)) ? p.artist : '';
      let trackTitle = p.title || '';
      if (!trackArtist || trackArtist === owner) {
        const cleaned = cleanTitleAndArtist(trackTitle, trackArtist || owner, 'MUSIC_PAGE_TYPE_USER_CHANNEL', true);
        trackTitle = cleaned.title;
        trackArtist = cleaned.artist;
      }
      return {
        ...p,
        title: trackTitle,
        artist: trackArtist || owner || 'Unknown Artist',
        album: p.album || title,
        thumb: p.thumb || (p.videoId ? ytThumb(p.videoId, 'hqdefault') : null) || thumb,
      };
    });
    const continuationToken = findShelfContinuationToken(data);
    return { type: 'playlist', title, owner, thumb, browseId, tracks, continuationToken };
  }

  function parseWatchPlaylist(data) {
    const playlist = data?.contents?.singleColumnMusicWatchNextResultsRenderer?.tabbedRenderer
                       ?.watchNextTabbedResultsRenderer?.tabs?.[0]?.tabRenderer?.content
                       ?.musicQueueRenderer?.content?.playlistPanelRenderer;
    if (!playlist) return [];
    return (playlist.contents || []).map(item => {
      const p = item.playlistPanelVideoRenderer;
      if (!p) return null;
      const videoId = p.videoId;
      const rawTitle = getText(p.title);
      const rawArtist = getText(p.shortBylineText);
      const cleaned = cleanTitleAndArtist(rawTitle, rawArtist, 'MUSIC_PAGE_TYPE_USER_CHANNEL', true);
      const title   = cleaned.title;
      const artist  = cleaned.artist;
      const album   = getText(p.longBylineText?.runs?.find(r => r?.navigationEndpoint?.browseEndpoint?.pageType === 'MUSIC_PAGE_TYPE_ALBUM'));
      const duration = parseDurationText(getText(p.lengthText));
      const thumb   = bestThumb(p.thumbnail?.thumbnails) || ytThumb(videoId);
      return { videoId, title, artist, album, duration, thumb };
    }).filter(Boolean);
  }

  // ─── Stream Resolution ────────────────────────────────────────────────────────

  const videoDurationCache = new Map();

  async function resolveStream(videoId, apiFetch) {
    const INNERTUBE_BASE = 'https://www.youtube.com/youtubei/v1';

    // 1. InnerTube player (un-ciphered clients)
    let rawStreamUrl = null;
    for (const ctx of STREAM_CONTEXTS) {
      try {
        const url = `${INNERTUBE_BASE}/player?key=${ctx.key}&prettyPrint=false`;
        const res = await apiFetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-YouTube-Client-Name': ctx.clientId,
            'X-YouTube-Client-Version': ctx.context.client.clientVersion,
            ...(ctx.userAgent ? { 'User-Agent': ctx.userAgent } : {}),
          },
          body: JSON.stringify({
            context: ctx.context,
            videoId,
            playbackContext: { contentPlaybackContext: { signatureTimestamp: 19950 } },
          }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const status = data?.playabilityStatus?.status;
        if (status && status !== 'OK' && status !== 'CONTENT_CHECK_REQUIRED') continue;
        const len = Number(data?.videoDetails?.lengthSeconds);
        if (len > 0) videoDurationCache.set(videoId, len);

        const all = [...(data?.streamingData?.adaptiveFormats || []), ...(data?.streamingData?.formats || [])];
        const plain = all.filter(f => f.url && !f.signatureCipher && !f.cipher);
        const picked = pickBestAudio(plain);
        if (picked) {
          console.log(`${PLUGIN_LABEL} stream via InnerTube (${ctx.label})`);
          rawStreamUrl = picked;
          break;
        }
      } catch (e) {
        console.warn(`${PLUGIN_LABEL} InnerTube ${ctx.label}:`, e.message);
      }
    }

    // 2. Piped (fallback if InnerTube failed)
    if (!rawStreamUrl) {
      try {
        const { data } = await tryInstances(PIPED_INSTANCES, base => `${base}/streams/${videoId}`, apiFetch);
        if (data?.duration > 0) videoDurationCache.set(videoId, data.duration);
        const u = pickBestAudioPiped(data.audioStreams || []);
        if (u) { console.log(`${PLUGIN_LABEL} stream via Piped`); rawStreamUrl = u; }
      } catch (e) { console.warn(`${PLUGIN_LABEL} Piped:`, e.message); }
    }

    // 3. Invidious (fallback)
    if (!rawStreamUrl) {
      try {
        const { data } = await tryInstances(INVIDIOUS_INSTANCES, base => `${base}/api/v1/videos/${videoId}?fields=adaptiveFormats`, apiFetch);
        if (data?.lengthSeconds > 0) videoDurationCache.set(videoId, data.lengthSeconds);
        const u = pickBestAudioInvidious(data.adaptiveFormats || []);
        if (u) { console.log(`${PLUGIN_LABEL} stream via Invidious`); rawStreamUrl = u; }
      } catch (e) { console.warn(`${PLUGIN_LABEL} Invidious:`, e.message); }
    }

    if (!rawStreamUrl) throw new Error(`No stream resolved for ${videoId}`);
    return rawStreamUrl;
  }

  function pickBestAudio(formats) {
    if (!formats || !formats.length) return null;

    // 1. Prefer pure audio streams (no video tracks)
    const audio = formats.filter(f => f.url && f.mimeType?.startsWith('audio/') && !f.width && !f.height);
    if (audio.length) {
      const m4a  = audio.filter(f => f.mimeType.includes('mp4') || f.mimeType.includes('m4a'));
      const pool = m4a.length ? m4a : audio;
      pool.sort((a, b) => (b.bitrate || b.averageBitrate || 0) - (a.bitrate || a.averageBitrate || 0));
      return pool[0]?.url || null;
    }

    // 2. Fall back to muxed MP4 formats (e.g. itag 18: standard MP4 container with AAC audio)
    // Audion's media player plays the audio track of MP4 containers directly
    const muxed = formats.filter(f => f.url && (f.mimeType?.includes('video/mp4') || f.mimeType?.includes('audio')));
    if (muxed.length) {
      muxed.sort((a, b) => (b.audioQuality === 'AUDIO_QUALITY_MEDIUM' ? 1 : 0) - (a.audioQuality === 'AUDIO_QUALITY_MEDIUM' ? 1 : 0));
      return muxed[0]?.url || null;
    }

    // 3. Any plain URL format
    const any = formats.filter(f => f.url);
    return any[0]?.url || null;
  }

  function pickBestAudioPiped(streams) {
    if (!streams.length) return null;
    const m4a  = streams.filter(s => s.mimeType?.includes('mp4') || s.mimeType?.includes('m4a'));
    const pool = m4a.length ? m4a : streams;
    pool.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    return pool[0]?.url || null;
  }

  function pickBestAudioInvidious(formats) {
    const audio = formats.filter(f => f.type?.startsWith('audio/') && f.url);
    if (!audio.length) return null;
    const m4a  = audio.filter(f => f.type.includes('mp4') || f.type.includes('m4a'));
    const pool = m4a.length ? m4a : audio;
    pool.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    return pool[0]?.url || null;
  }

  // ─── Styles ───────────────────────────────────────────────────────────────────

  const CSS = `
    /* ═══ Anti-Slop Design System Tokens ═══ */
    :root {
      --ytm-red: #ff0033;
      --ytm-red-hover: #e6002e;
      --ytm-red-subtle: rgba(255, 0, 51, 0.12);
    }

    /* ═══ Root container ═══ */
    #ytm-overlay {
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(0, 0, 0, 0.65);
      opacity: 0; visibility: hidden;
      transition: opacity var(--transition-fast, 150ms ease);
    }
    #ytm-overlay.open { opacity: 1; visibility: visible; }

    #ytm-panel {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%) scale(0.98);
      width: min(780px, 94vw); height: min(88vh, 760px);
      background: var(--bg-elevated, #181818);
      border: 1px solid var(--border-color, #404040);
      border-radius: var(--radius-lg, 12px);
      display: flex; flex-direction: column;
      overflow: hidden; z-index: 10001;
      box-shadow: var(--shadow-lg, 0 12px 32px rgba(0, 0, 0, 0.6));
      opacity: 0; visibility: hidden;
      color: var(--text-primary, #ffffff);
      transition: transform var(--transition-normal, 200ms ease), opacity var(--transition-normal, 200ms ease);
    }
    #ytm-panel.open { opacity: 1; visibility: visible; transform: translate(-50%, -50%) scale(1); }

    /* Accessible focus indicator across the entire plugin */
    #ytm-panel *:focus-visible {
      outline: 2px solid var(--accent-primary, #1db954);
      outline-offset: 2px;
    }

    @media (max-width: 600px) {
      #ytm-panel {
        width: 100vw; height: 100dvh; border-radius: 0; border: none;
        top: 0; left: 0; transform: none !important;
        padding-top: var(--safe-area-top, 0px);
        padding-bottom: var(--safe-area-bottom, 0px);
      }
      #ytm-panel.open { transform: none !important; }
    }

    /* ═══ Header ═══ */
    .ytm-header {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 18px; border-bottom: 1px solid var(--border-color, #333333);
      flex-shrink: 0; min-height: 54px;
      background: var(--bg-elevated, #181818);
    }
    .ytm-logo { color: var(--ytm-red, #ff0033); display: flex; align-items: center; flex-shrink: 0; }
    .ytm-title {
      font-size: var(--font-size-md, 15px); font-weight: 700; color: var(--text-primary, #ffffff);
      flex: 1; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; letter-spacing: -0.2px;
    }
    .ytm-icon-btn {
      background: transparent; border: none; color: var(--text-secondary, #c8c8c8);
      cursor: pointer; min-width: 36px; min-height: 36px; border-radius: var(--radius-sm, 4px);
      display: flex; align-items: center; justify-content: center;
      transition: background var(--transition-fast, 150ms ease), color var(--transition-fast, 150ms ease);
      flex-shrink: 0;
    }
    .ytm-icon-btn:hover { background: var(--bg-highlight, #3e3e3e); color: var(--text-primary, #ffffff); }

    /* ═══ Tabs nav ═══ */
    .ytm-tabs {
      display: flex; gap: 4px; padding: 0 16px;
      border-bottom: 1px solid var(--border-color, #333333);
      flex-shrink: 0; overflow-x: auto; scrollbar-width: none;
      background: var(--bg-elevated, #181818);
    }
    .ytm-tabs::-webkit-scrollbar { display: none; }
    .ytm-tab {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; font-size: var(--font-size-sm, 13px); font-weight: 600;
      color: var(--text-secondary, #c8c8c8); cursor: pointer;
      border-bottom: 2px solid transparent;
      white-space: nowrap; transition: color var(--transition-fast, 150ms ease), border-color var(--transition-fast, 150ms ease);
      background: none; border-top: none; border-left: none; border-right: none;
    }
    .ytm-tab:hover { color: var(--text-primary, #ffffff); }
    .ytm-tab.active { color: var(--text-primary, #ffffff); border-bottom-color: var(--ytm-red, #ff0033); }
    .ytm-tab svg { flex-shrink: 0; }

    /* ═══ Search bar ═══ */
    .ytm-search-row {
      display: flex; gap: 8px; padding: 12px 16px; flex-shrink: 0;
      border-bottom: 1px solid var(--border-color, #333333);
      background: var(--bg-elevated, #181818);
    }
    .ytm-search-wrap { position: relative; flex: 1; }
    .ytm-search-icon {
      position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
      color: var(--text-subdued, #8e8e8e); pointer-events: none; display: flex;
    }
    .ytm-search-input {
      width: 100%; padding: 10px 14px 10px 38px; border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-color, #404040);
      background: var(--bg-surface, #282828); color: var(--text-primary, #ffffff);
      font-size: var(--font-size-base, 14px); outline: none; box-sizing: border-box;
      transition: border-color var(--transition-fast, 150ms ease);
      -webkit-text-fill-color: var(--text-primary, #ffffff); color-scheme: dark;
    }
    .ytm-search-input::placeholder { color: var(--text-subdued, #8e8e8e); -webkit-text-fill-color: var(--text-subdued, #8e8e8e); }
    .ytm-search-input:focus { border-color: var(--ytm-red, #ff0033); }

    .ytm-filter-row {
      display: flex; gap: 8px; padding: 8px 16px; flex-shrink: 0;
      overflow-x: auto; scrollbar-width: none; background: var(--bg-elevated, #181818);
      border-bottom: 1px solid var(--border-color, #2a2a2a);
    }
    .ytm-filter-row::-webkit-scrollbar { display: none; }
    .ytm-chip {
      padding: 6px 14px; border-radius: var(--radius-full, 9999px); font-size: var(--font-size-xs, 12px); font-weight: 500;
      cursor: pointer; white-space: nowrap; transition: all var(--transition-fast, 150ms ease);
      border: 1px solid var(--border-color, #404040);
      background: transparent; color: var(--text-secondary, #c8c8c8);
    }
    .ytm-chip:hover { border-color: var(--text-secondary, #c8c8c8); color: var(--text-primary, #ffffff); }
    .ytm-chip.active { background: var(--ytm-red, #ff0033); border-color: var(--ytm-red, #ff0033); color: #ffffff; font-weight: 600; }

    /* ═══ Content area ═══ */
    .ytm-content {
      flex: 1; overflow-y: auto; overflow-x: hidden;
      background: var(--bg-base, #121212);
    }
    .ytm-content::-webkit-scrollbar { width: 6px; }
    .ytm-content::-webkit-scrollbar-thumb { background: var(--border-color, #404040); border-radius: 3px; }

    /* ═══ Section / Shelf ═══ */
    .ytm-section { padding: 18px 16px 8px; }
    .ytm-section-title {
      font-size: var(--font-size-base, 14px); font-weight: 700; color: var(--text-primary, #ffffff);
      margin: 0 0 12px; letter-spacing: -0.1px;
    }

    /* ═══ Horizontal card row ═══ */
    .ytm-card-row {
      display: flex; gap: 14px; overflow-x: auto; padding-bottom: 12px;
      scrollbar-width: none;
    }
    .ytm-card-row::-webkit-scrollbar { display: none; }
    .ytm-card {
      flex-shrink: 0; width: 136px; cursor: pointer;
      border-radius: var(--radius-sm, 4px); padding: 6px;
      transition: background var(--transition-fast, 150ms ease);
    }
    .ytm-card:hover { background: var(--bg-surface, #282828); }
    .ytm-card-thumb-wrap { position: relative; width: 124px; height: 124px; }
    .ytm-card-thumb {
      width: 124px; height: 124px; border-radius: var(--radius-sm, 4px);
      object-fit: cover; display: block; background: var(--bg-surface, #282828);
    }
    .ytm-card-thumb.circle { border-radius: 50%; }
    .ytm-card-like-btn {
      position: absolute; bottom: 6px; right: 6px;
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(0, 0, 0, 0.7); border: none; color: #ffffff;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; opacity: 0; transition: opacity var(--transition-fast, 150ms ease), transform var(--transition-fast, 150ms ease);
    }
    .ytm-card:hover .ytm-card-like-btn,
    .ytm-card:focus-within .ytm-card-like-btn { opacity: 1; }
    .ytm-card-like-btn:hover { transform: scale(1.1); color: var(--ytm-red, #ff0033); }
    .ytm-card-like-btn.saved { opacity: 1; color: var(--ytm-red, #ff0033); }
    .ytm-card-label {
      font-size: var(--font-size-xs, 12px); font-weight: 600; color: var(--text-primary, #ffffff);
      margin-top: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ytm-card-sub {
      font-size: 11px; color: var(--text-subdued, #8e8e8e); margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    /* ═══ Track list rows ═══ */
    .ytm-track-list { padding: 4px 12px 24px; }
    .ytm-track {
      display: grid; grid-template-columns: 44px 1fr auto auto;
      align-items: center; gap: 12px; padding: 7px 10px;
      border-radius: var(--radius-md, 8px); cursor: pointer;
      transition: background var(--transition-fast, 150ms ease);
    }
    .ytm-track:hover { background: var(--bg-surface, #282828); }
    .ytm-track.playing { background: var(--ytm-red-subtle, rgba(255, 0, 51, 0.12)); }
    .ytm-thumb-wrap {
      position: relative; width: 44px; height: 44px;
      border-radius: var(--radius-sm, 4px); overflow: hidden; flex-shrink: 0;
      background: var(--bg-surface, #282828);
    }
    .ytm-thumb { width: 100%; height: 100%; object-fit: cover; display: block; }
    .ytm-play-ov {
      position: absolute; inset: 0; background: rgba(0, 0, 0, 0.6);
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity var(--transition-fast, 150ms ease); color: #ffffff;
    }
    .ytm-track:hover .ytm-play-ov { opacity: 1; }
    .ytm-track.playing .ytm-play-ov { opacity: 1; background: rgba(255, 0, 51, 0.35); }

    .ytm-track-info { min-width: 0; }
    .ytm-track-title {
      font-size: var(--font-size-base, 14px); font-weight: 500; color: var(--text-primary, #ffffff);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ytm-track.playing .ytm-track-title { color: var(--ytm-red, #ff0033); font-weight: 600; }
    .ytm-track-sub {
      font-size: var(--font-size-xs, 12px); color: var(--text-secondary, #c8c8c8); margin-top: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ytm-track-dur {
      font-size: var(--font-size-xs, 12px); color: var(--text-subdued, #8e8e8e);
      font-variant-numeric: tabular-nums; white-space: nowrap; padding: 0 4px;
    }
    .ytm-track-actions {
      display: flex; align-items: center; gap: 4px;
      opacity: 0; transition: opacity var(--transition-fast, 150ms ease);
    }
    .ytm-track:hover .ytm-track-actions,
    .ytm-track:focus-within .ytm-track-actions { opacity: 1; }
    .ytm-act-btn {
      background: transparent; border: none; color: var(--text-secondary, #c8c8c8);
      cursor: pointer; min-width: 32px; min-height: 32px; display: flex; align-items: center; justify-content: center;
      border-radius: var(--radius-sm, 4px); transition: all var(--transition-fast, 150ms ease);
    }
    .ytm-act-btn:hover { color: var(--text-primary, #ffffff); background: var(--bg-highlight, #3e3e3e); }
    .ytm-act-btn.saved { color: var(--ytm-red, #ff0033); opacity: 1 !important; }

    .ytm-num { font-size: 11px; font-weight: 700; color: var(--text-subdued, #8e8e8e); flex-shrink: 0; min-width: 16px; text-align: center; }
    .ytm-explicit { font-size: 9px; font-weight: 800; background: var(--bg-highlight, #3e3e3e); color: #fff; padding: 1px 4px; border-radius: 2px; margin-left: 6px; }

    /* ═══ Top Result Card (All search) ═══ */
    .ytm-top-result-section { padding-bottom: 4px; }
    .ytm-top-result-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px; border-radius: var(--radius-md, 8px);
      background: var(--bg-surface, #282828); border: 1px solid var(--border-color, #383838);
      cursor: pointer; transition: background var(--transition-fast, 150ms ease), border-color var(--transition-fast, 150ms ease);
      margin-bottom: 12px;
    }
    .ytm-top-result-card:hover {
      background: var(--bg-elevated, #2f2f2f);
      border-color: var(--text-subdued, #8e8e8e);
    }
    .ytm-top-result-card:focus-visible {
      outline: 2px solid var(--accent, #1db954);
      outline-offset: 2px;
    }
    .ytm-top-result-left { display: flex; align-items: center; gap: 16px; min-width: 0; }
    .ytm-top-result-thumb {
      width: 72px; height: 72px; border-radius: var(--radius-sm, 4px);
      object-fit: cover; flex-shrink: 0;
    }
    .ytm-top-result-thumb.circle { border-radius: 50%; }
    .ytm-top-result-info { min-width: 0; }
    .ytm-top-result-title {
      font-size: 16px; font-weight: 700; color: var(--text-primary, #ffffff);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .ytm-top-result-sub {
      font-size: var(--font-size-xs, 12px); color: var(--text-secondary, #c8c8c8);
      margin-top: 4px;
    }
    .ytm-top-result-badge {
      display: inline-block; font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.5px; padding: 2px 6px; border-radius: var(--radius-sm, 4px);
      background: var(--bg-highlight, #3e3e3e); color: var(--text-primary, #ffffff); margin-top: 6px;
    }

    /* ═══ Action buttons (Play All / Like Album / Like Playlist) ═══ */
    .ytm-action-row {
      display: flex; align-items: center; gap: 10px; padding: 0 16px 16px;
    }
    .ytm-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 8px 16px; border-radius: 9999px; font-size: var(--font-size-xs, 12px);
      font-weight: 600; cursor: pointer; border: 1px solid transparent;
      transition: all var(--transition-fast, 150ms ease);
    }
    .ytm-btn:focus-visible { outline: 2px solid var(--accent, #1db954); outline-offset: 2px; }
    .ytm-btn-primary {
      background: var(--text-primary, #ffffff); color: #000000;
    }
    .ytm-btn-primary:hover { background: #e0e0e0; transform: scale(1.02); }
    .ytm-btn-secondary {
      background: transparent; border-color: var(--border-color, #404040); color: var(--text-primary, #ffffff);
    }
    .ytm-btn-secondary:hover {
      border-color: var(--text-secondary, #c8c8c8); background: var(--bg-surface, #282828);
    }
    .ytm-btn-secondary.saved {
      color: var(--ytm-red, #ff0033); border-color: var(--ytm-red, #ff0033); background: var(--ytm-red-subtle, rgba(255, 0, 51, 0.12));
    }

    /* ═══ Interactive entity links ═══ */
    .ytm-link {
      color: var(--text-secondary, #c8c8c8);
      cursor: pointer;
      text-decoration: none;
      transition: color var(--transition-fast, 150ms ease);
    }
    .ytm-link:hover {
      color: var(--text-primary, #ffffff);
      text-decoration: underline;
    }
    .ytm-link:focus-visible {
      outline: 2px solid var(--accent, #1db954);
      outline-offset: 2px;
      border-radius: 2px;
    }

    .ytm-thumb-wrap.with-num {
      display: flex; align-items: center; justify-content: center;
      background: transparent;
    }
    .ytm-track-num {
      font-size: var(--font-size-xs, 12px); font-weight: 600; color: var(--text-subdued, #8e8e8e);
      font-variant-numeric: tabular-nums;
    }
    .ytm-track:hover .ytm-thumb-wrap.with-num .ytm-track-num,
    .ytm-track.playing .ytm-thumb-wrap.with-num .ytm-track-num {
      opacity: 0;
    }

    /* ═══ Skeleton ═══ */
    .ytm-skel { background: var(--bg-surface, #282828); border-radius: var(--radius-sm, 4px); display: block; animation: ytm-pulse 1.4s infinite; }
    @keyframes ytm-pulse { 0%, 100% { opacity: 0.35 } 50% { opacity: 0.65 } }

    /* ═══ Empty / Error ═══ */
    .ytm-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 24px; gap: 12px; color: var(--text-subdued, #8e8e8e); font-size: 13px; text-align: center;
    }
    .ytm-empty-icon { font-size: 32px; }

    /* ═══ Toast ═══ */
    #ytm-toast {
      position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
      background: var(--bg-surface, #282828); color: var(--text-primary, #ffffff);
      border: 1px solid var(--border-color, #404040);
      padding: 10px 18px; border-radius: var(--radius-md, 8px);
      font-size: var(--font-size-xs, 12px); font-weight: 500; z-index: 10010;
      box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 0, 0, 0.4));
      opacity: 0; pointer-events: none; transition: opacity var(--transition-fast, 150ms ease); white-space: nowrap;
    }
    #ytm-toast.show { opacity: 1; }

    /* ═══ Playerbar button ═══ */
    .ytm-pb-btn {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 7px 14px; border-radius: var(--radius-full, 9999px);
      border: 1px solid var(--border-color, #404040);
      background: transparent; color: var(--text-primary, #ffffff); cursor: pointer;
      font-size: var(--font-size-xs, 12px); font-weight: 600;
      transition: all var(--transition-fast, 150ms ease);
    }
    .ytm-pb-btn:hover { background: var(--bg-highlight, #3e3e3e); border-color: var(--ytm-red, #ff0033); }
    .ytm-pb-btn svg { color: var(--ytm-red, #ff0033); }

    /* ═══ Artist / Album hero ═══ */
    .ytm-hero {
      position: relative; height: 180px; overflow: hidden; flex-shrink: 0;
      display: flex; align-items: flex-end;
    }
    .ytm-hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; filter: brightness(0.45); }
    .ytm-hero-info { position: relative; padding: 18px 20px; z-index: 2; }
    .ytm-hero-title { font-size: var(--font-size-2xl, 24px); font-weight: 800; color: #ffffff; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8); }
    .ytm-hero-sub { font-size: var(--font-size-sm, 13px); color: var(--text-secondary, #c8c8c8); margin-top: 4px; }
    .ytm-play-all-btn {
      display: inline-flex; align-items: center; gap: 8px;
      margin: 14px 20px 6px; padding: 10px 22px; border-radius: var(--radius-full, 9999px);
      background: var(--ytm-red, #ff0033); color: #ffffff; border: none; cursor: pointer;
      font-size: var(--font-size-sm, 13px); font-weight: 700; transition: background var(--transition-fast, 150ms ease);
    }
    .ytm-play-all-btn:hover { background: var(--ytm-red-hover, #e6002e); }

    /* ═══ Settings drawer ═══ */
    #ytm-settings {
      position: absolute; inset: 0; background: var(--bg-elevated, #181818);
      border-radius: var(--radius-lg, 12px); z-index: 30; display: flex; flex-direction: column;
      opacity: 0; visibility: hidden; transform: translateY(8px);
      transition: all var(--transition-fast, 150ms ease);
    }
    #ytm-settings.open { opacity: 1; visibility: visible; transform: translateY(0); }
    .ytm-settings-body { flex: 1; overflow-y: auto; padding: 20px 24px; }
    .ytm-field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-secondary, #c8c8c8); margin: 0 0 6px; }
    .ytm-field-hint { font-size: 11px; color: var(--text-subdued, #8e8e8e); margin: 0 0 10px; line-height: 1.5; }
    .ytm-text-input {
      width: 100%; padding: 10px 12px; border-radius: var(--radius-sm, 4px);
      border: 1px solid var(--border-color, #404040);
      background: var(--bg-surface, #282828); color: #fff;
      font-size: 13px; font-family: monospace; outline: none;
      box-sizing: border-box; transition: border-color var(--transition-fast, 150ms ease);
    }
    .ytm-text-input:focus { border-color: var(--ytm-red, #ff0033); }
    .ytm-save-btn {
      padding: 10px 20px; background: var(--ytm-red, #ff0033); border: none; border-radius: var(--radius-sm, 4px);
      color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; transition: background var(--transition-fast, 150ms ease);
      margin-top: 14px;
    }
    .ytm-save-btn:hover { background: var(--ytm-red-hover, #e6002e); }
    .ytm-instance-row { display: flex; gap: 8px; margin-bottom: 8px; }
    .ytm-instance-row .ytm-text-input { flex: 1; }
    .ytm-remove-btn {
      background: none; border: none; color: var(--text-subdued, #8e8e8e); cursor: pointer;
      font-size: 16px; padding: 0 8px; border-radius: 4px; transition: color var(--transition-fast, 150ms ease);
    }
    .ytm-remove-btn:hover { color: var(--error-color, #f15e6c); }
    .ytm-add-btn {
      background: none; border: 1px dashed var(--border-color, #404040);
      color: var(--text-secondary, #c8c8c8); padding: 8px 14px;
      border-radius: var(--radius-sm, 4px); cursor: pointer; font-size: 12px; width: 100%; transition: all var(--transition-fast, 150ms ease);
    }
    .ytm-add-btn:hover { border-color: var(--ytm-red, #ff0033); color: #fff; }
    .ytm-divider { border: none; border-top: 1px solid var(--border-color, #333333); margin: 20px 0; }

    /* ═══ Import Modal ═══ */
    #ytm-import-modal {
      position: absolute; inset: 0; background: var(--bg-elevated, #181818);
      border-radius: var(--radius-lg, 12px); z-index: 35; display: flex; flex-direction: column;
      opacity: 0; visibility: hidden; transform: translateY(8px);
      transition: all var(--transition-fast, 150ms ease);
    }
    #ytm-import-modal.open { opacity: 1; visibility: visible; transform: translateY(0); }
    .ytm-import-body { flex: 1; overflow-y: auto; padding: 20px 24px; display: flex; flex-direction: column; gap: 16px; }
    .ytm-import-input-section { display: flex; flex-direction: column; gap: 6px; }
    .ytm-import-bar { display: flex; gap: 8px; align-items: center; }
    .ytm-import-input-wrap { position: relative; flex: 1; display: flex; align-items: center; }
    .ytm-import-input-wrap .ytm-text-input { padding-left: 36px; }
    .ytm-import-link-icon { position: absolute; left: 12px; color: var(--text-subdued, #888); display: flex; pointer-events: none; }
    .ytm-import-card {
      background: var(--bg-surface, #222222); border: 1px solid var(--border-color, #383838);
      border-radius: var(--radius-md, 8px); padding: 16px; display: flex; flex-direction: column; gap: 14px;
    }
    .ytm-import-hero { display: flex; gap: 16px; align-items: flex-start; }
    .ytm-import-thumb { width: 90px; height: 90px; border-radius: var(--radius-md, 8px); object-fit: cover; flex-shrink: 0; background: #2c2c2c; }
    .ytm-import-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
    .ytm-import-title-static { font-size: 16px; font-weight: 700; color: #fff; line-height: 1.3; }
    .ytm-import-title-input { font-size: 14px; font-weight: 600; padding: 8px 10px; font-family: inherit; }
    .ytm-import-sub { font-size: 12px; color: var(--text-secondary, #b3b3b3); display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .ytm-dot { opacity: 0.5; }
    .ytm-import-actions-bar {
      display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;
      padding-top: 10px; border-top: 1px solid var(--border-color, #333333);
    }
    .ytm-checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; cursor: pointer; user-select: none; }
    .ytm-checkbox-label input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--ytm-red, #ff0033); }
    .ytm-import-action-buttons { display: flex; gap: 8px; align-items: center; }
    .ytm-import-track-list {
      display: flex; flex-direction: column; gap: 2px; max-height: 300px; overflow-y: auto;
      background: var(--bg-base, #121212); border-radius: var(--radius-sm, 6px); padding: 6px;
      border: 1px solid var(--border-color, #2a2a2a);
    }
    .ytm-import-track-row {
      display: flex; align-items: center; gap: 10px; padding: 7px 10px; border-radius: var(--radius-sm, 4px);
      transition: background var(--transition-fast, 100ms ease);
    }
    .ytm-import-track-row:hover { background: rgba(255, 255, 255, 0.06); }
    .ytm-import-track-row input[type="checkbox"] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--ytm-red, #ff0033); }
    .ytm-import-track-num { font-size: 12px; color: var(--text-subdued, #777); width: 24px; text-align: center; }
    .ytm-import-track-thumb { width: 34px; height: 34px; border-radius: 4px; object-fit: cover; flex-shrink: 0; }
    .ytm-import-track-meta { flex: 1; min-width: 0; }
    .ytm-import-track-title { font-size: 13px; font-weight: 500; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ytm-import-track-sub { font-size: 11px; color: var(--text-secondary, #aaa); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ytm-import-track-dur { font-size: 12px; color: var(--text-subdued, #888); font-variant-numeric: tabular-nums; }
    .ytm-meta-fixed-pill {
      display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
      padding: 1px 5px; border-radius: 4px; background: rgba(30, 215, 96, 0.2);
      color: #1ed760; border: 1px solid rgba(30, 215, 96, 0.4); vertical-align: middle; margin-left: 4px;
    }
    .ytm-import-progress-wrap {
      display: flex; flex-direction: column; gap: 8px; padding: 12px; background: rgba(0,0,0,0.25);
      border-radius: var(--radius-md, 6px); border: 1px solid var(--border-color, #333);
    }
    .ytm-progress-bar-bg { width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden; }
    .ytm-progress-bar-fill { height: 100%; background: var(--ytm-red, #ff0033); transition: width 150ms ease; }
    .ytm-import-progress-status { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text-secondary, #ccc); }
    .ytm-btn-danger { background: #b00020 !important; color: #fff !important; }
    .ytm-btn-danger:hover { background: #cf1030 !important; }
    .ytm-btn-sm { padding: 4px 10px !important; font-size: 11px !important; min-height: 26px !important; }

    /* URL detected prompt card in search */
    .ytm-url-detected-card {
      margin: 12px 18px; padding: 16px; background: var(--bg-surface, #242424);
      border: 1px solid var(--ytm-red, #ff0033); border-radius: var(--radius-md, 8px);
      display: flex; flex-direction: column; gap: 10px;
    }
    .ytm-url-badge { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--ytm-red, #ff0033); text-transform: uppercase; letter-spacing: 0.5px; }
    .ytm-url-detected-title { font-size: 16px; font-weight: 700; color: #fff; }
    .ytm-url-detected-desc { font-size: 12px; color: var(--text-secondary, #bbb); word-break: break-all; font-family: monospace; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px; }
    .ytm-url-detected-actions { display: flex; gap: 8px; margin-top: 4px; }

    /* ═══ Misc ═══ */
    .hidden { display: none !important; }
    .ytm-badge-new { background: var(--ytm-red, #ff0033); color: #fff; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 3px; margin-left: 5px; }
  `;

  // ─── Plugin Object ────────────────────────────────────────────────────────────

  const YouTubeMusic = {
    api:        null,
    isOpen:     false,
    libraryIds: new Set(),
    _searchTimer: null,
    _currentQuery: '',
    _navStack: [],   // navigation history: [{ type, id, query, filter, tab, title }]
    _currentNavState: { type: 'tab', tab: 'home', title: 'YouTube Music' },
    _currentView: null,
    _currentData: null,
    _currentTitle: 'YouTube Music',
    _searchFilter: null, // null | 'songs' | 'albums' | 'artists' | 'playlists'
    _activeTab: 'home',
    _playingVideoId: null,
    _searchCache: new MemCache(5 * 60 * 1000),   // 5 min
    _browseCache:  new MemCache(10 * 60 * 1000),  // 10 min
    _importAbortController: null,
    _importedData: null,
    _selectedTrackIndices: new Set(),

    config: {
      pipedInstances: [...PIPED_INSTANCES],
      invidiousInstances: [...INVIDIOUS_INSTANCES],
      preferredQuality: 'best', // 'best' | 'low'
    },

    // ─── Init ──────────────────────────────────────────────────────────────────

    async init(api) {
      this.api     = api;

      await this._loadConfig();
      await this._fetchLibraryIds();
      this._injectStyles();
      this._buildDOM();
      this._wireEvents();
      this._buildPlayerbarButton();

      // Register stream resolver — always returns a blob: URL to avoid CORS.
      // googlevideo.com does not send Access-Control-Allow-Origin, so direct
      // <audio src> playback from tauri.localhost is blocked by the browser.
      // Routing through api.fetchBlob (Rust proxy_fetch_bytes → blob:) bypasses this.
      if (api.stream?.registerResolver) {
        api.stream.registerResolver(SOURCE_TYPE, async (externalId) => {
          try {
            const streamUrl = await resolveStream(externalId, (u, o) => this._apiFetch(u, o));
            if (!streamUrl) return null;
            // Proxy through Rust → blob: to bypass CORS
            if (typeof api.fetchBlob === 'function') {
              const mime = streamUrl.includes('webm') ? 'audio/webm' : 'audio/mp4';
              return await api.fetchBlob(streamUrl, mime);
            }
            return streamUrl;
          } catch (e) {
            console.error(`${PLUGIN_LABEL} resolver:`, e);
            return null;
          }
        });
      }

      // Register as a cross-plugin search source
      if (api.search?.registerSource) {
        api.search.registerSource(SOURCE_TYPE, (query, onResult) => {
          this._crossPluginSearch(query, onResult);
        });
      }

      // Track change → highlight current playing track
      api.on?.('trackChange', ({ track }) => {
        this._playingVideoId = track?.source_type === SOURCE_TYPE ? track.external_id : null;
        this._updatePlayingHighlight();
      });

      console.log(`${PLUGIN_LABEL} initialized`);
    },

    _apiFetch(url, opts = {}) {
      return this.api.fetch ? this.api.fetch(url, opts) : fetch(url, opts);
    },

    async _loadConfig() {
      try {
        const raw = await this.api.storage?.get?.('ytm_config');
        if (raw) {
          const p = JSON.parse(raw);
          if (p.pipedInstances?.length) this.config.pipedInstances = p.pipedInstances;
          if (p.invidiousInstances?.length) this.config.invidiousInstances = p.invidiousInstances;
          if (p.preferredQuality) this.config.preferredQuality = p.preferredQuality;
        }
      } catch (e) { /* ignore */ }
    },

    async _saveConfig() {
      await this.api.storage?.set?.('ytm_config', JSON.stringify(this.config));
    },

    async _fetchLibraryIds() {
      try {
        const tracks = await this.api.library?.getTracks?.() || [];
        this.libraryIds = new Set(
          tracks.filter(t => t.source_type === SOURCE_TYPE).map(t => t.external_id)
        );
      } catch (e) { /* ignore */ }
    },

    // ─── Cross-plugin search source ────────────────────────────────────────────

    async _crossPluginSearch(query, onResult) {
      try {
        const q = `${query.title || ''} ${query.artist || ''}`.trim();
        if (!q) return onResult({ sourceId: SOURCE_TYPE, status: 'not_found' });
        const sections = await API.search(q, (u, o) => this._apiFetch(u, o), 'songs');
        const all = sections.flatMap(s => s.items).filter(i => i.videoId);
        if (!all.length) return onResult({ sourceId: SOURCE_TYPE, status: 'not_found' });
        const best = all[0];
        onResult({
          sourceId: SOURCE_TYPE, status: 'success',
          title: best.title, artist: best.artist, duration: best.duration,
          cover_url: best.thumb, source_type: SOURCE_TYPE, external_id: best.videoId,
        });
      } catch (e) {
        onResult({ sourceId: SOURCE_TYPE, status: 'error', error: e });
      }
    },

    // ─── Styles ────────────────────────────────────────────────────────────────

    _injectStyles() {
      if (document.getElementById('ytm-styles')) return;
      const s = document.createElement('style');
      s.id = 'ytm-styles';
      s.textContent = CSS;
      document.head.appendChild(s);
    },

    // ─── DOM Construction ──────────────────────────────────────────────────────

    _buildDOM() {
      if (document.getElementById('ytm-panel')) return;

      // Overlay
      const ov = document.createElement('div');
      ov.id = 'ytm-overlay';
      ov.onclick = () => this.close();
      document.body.appendChild(ov);

      // Toast
      const toast = document.createElement('div');
      toast.id = 'ytm-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);

      // Panel
      const panel = document.createElement('div');
      panel.id = 'ytm-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'YouTube Music');
      panel.setAttribute('aria-modal', 'true');
      panel.innerHTML = `
        <!-- Settings drawer -->
        <div id="ytm-settings" role="region" aria-label="Settings">
          <div class="ytm-header">
            <div class="ytm-title">Settings</div>
            <button id="ytm-settings-close" class="ytm-icon-btn" title="Close settings" aria-label="Close settings">${ICON.close}</button>
          </div>
          <div class="ytm-settings-body" id="ytm-settings-body"></div>
        </div>

        <!-- Import drawer -->
        <div id="ytm-import-modal" role="region" aria-label="Import from URL">
          <div class="ytm-header">
            <div class="ytm-logo" aria-hidden="true">${ICON.import}</div>
            <div class="ytm-title">Import Playlist from URL</div>
            <button id="ytm-import-close" class="ytm-icon-btn" title="Close import" aria-label="Close import dialog">${ICON.close}</button>
          </div>
          <div class="ytm-import-body" id="ytm-import-body"></div>
        </div>

        <!-- Header -->
        <div class="ytm-header">
          <button id="ytm-back-btn" class="ytm-icon-btn hidden" title="Back" aria-label="Back">${ICON.back}</button>
          <div class="ytm-logo" aria-hidden="true">${ICON.ytmusic}</div>
          <div class="ytm-title" id="ytm-panel-title">YouTube Music</div>
          <button id="ytm-import-open" class="ytm-icon-btn" title="Import from URL" aria-label="Import playlist from URL">${ICON.import}</button>
          <button id="ytm-settings-open" class="ytm-icon-btn" title="Settings" aria-label="Settings">${ICON.settings}</button>
          <button id="ytm-close-btn" class="ytm-icon-btn" title="Close" aria-label="Close dialog">${ICON.close}</button>
        </div>

        <!-- Tabs -->
        <div class="ytm-tabs" id="ytm-tabs" role="tablist" aria-label="Browse sections">
          <button class="ytm-tab active" data-tab="home" role="tab" aria-selected="true">${ICON.home} Home</button>
          <button class="ytm-tab" data-tab="trending" role="tab" aria-selected="false">${ICON.trending} Trending</button>
          <button class="ytm-tab" data-tab="search" role="tab" aria-selected="false">${ICON.search} Search</button>
        </div>

        <!-- Search bar (hidden on non-search tabs) -->
        <div class="ytm-search-row hidden" id="ytm-search-row">
          <div class="ytm-search-wrap">
            <div class="ytm-search-icon" aria-hidden="true">${ICON.search}</div>
            <input type="text" id="ytm-search-input" class="ytm-search-input" placeholder="Search songs, albums, artists…" aria-label="Search YouTube Music" autocomplete="off">
          </div>
        </div>
        <div class="ytm-filter-row hidden" id="ytm-filter-row" role="group" aria-label="Search categories">
          <button class="ytm-chip active" data-filter="" aria-pressed="true">All</button>
          <button class="ytm-chip" data-filter="songs" aria-pressed="false">${ICON.music} Songs</button>
          <button class="ytm-chip" data-filter="albums" aria-pressed="false">${ICON.album} Albums</button>
          <button class="ytm-chip" data-filter="artists" aria-pressed="false">${ICON.artist} Artists</button>
          <button class="ytm-chip" data-filter="playlists" aria-pressed="false">${ICON.list} Playlists</button>
        </div>

        <!-- Content -->
        <div class="ytm-content" id="ytm-content" role="region" aria-label="Content"></div>
      `;
      document.body.appendChild(panel);
    },

    _buildSettingsBody() {
      const body = document.getElementById('ytm-settings-body');
      if (!body) return;

      body.innerHTML = `
        <p class="ytm-field-label">Piped API Instances</p>
        <p class="ytm-field-hint">Used as stream fallback when InnerTube returns ciphered URLs. Enter full base URLs.</p>
        <div id="ytm-piped-list"></div>
        <button class="ytm-add-btn" id="ytm-add-piped">+ Add Piped instance</button>

        <hr class="ytm-divider">

        <p class="ytm-field-label">Invidious Instances</p>
        <p class="ytm-field-hint">Secondary stream fallback after Piped.</p>
        <div id="ytm-inv-list"></div>
        <button class="ytm-add-btn" id="ytm-add-inv">+ Add Invidious instance</button>

        <hr class="ytm-divider">
        <p class="ytm-field-hint" style="text-align:center;">
          Streams via YouTube InnerTube (ANDROID_TESTSUITE/TV_EMBEDDED clients) + Piped + Invidious fallback.<br>
          No API key needed. Data from YouTube Music (music.youtube.com).
        </p>

        <button class="ytm-save-btn" id="ytm-settings-save">Save Settings</button>
      `;

      this._renderInstanceList('ytm-piped-list', this.config.pipedInstances);
      this._renderInstanceList('ytm-inv-list', this.config.invidiousInstances);

      document.getElementById('ytm-add-piped').onclick = () => {
        this.config.pipedInstances.push('');
        this._renderInstanceList('ytm-piped-list', this.config.pipedInstances);
      };
      document.getElementById('ytm-add-inv').onclick = () => {
        this.config.invidiousInstances.push('');
        this._renderInstanceList('ytm-inv-list', this.config.invidiousInstances);
      };
      document.getElementById('ytm-settings-save').onclick = async () => {
        // Collect values from inputs
        this.config.pipedInstances = [...document.querySelectorAll('#ytm-piped-list .ytm-text-input')].map(el => el.value.trim()).filter(Boolean);
        this.config.invidiousInstances = [...document.querySelectorAll('#ytm-inv-list .ytm-text-input')].map(el => el.value.trim()).filter(Boolean);
        await this._saveConfig();
        document.getElementById('ytm-settings')?.classList.remove('open');
        this._toast('Settings saved');
      };
    },

    // ─── Import Dialog ──────────────────────────────────────────────────────────

    _openImportModal(prefillUrl = '') {
      this._buildImportBody();
      const modal = document.getElementById('ytm-import-modal');
      if (!modal) return;
      modal.classList.add('open');

      const urlInput = document.getElementById('ytm-import-url-input');
      if (urlInput) {
        if (prefillUrl) {
          urlInput.value = prefillUrl;
          this._fetchImportUrl();
        } else {
          setTimeout(() => urlInput.focus(), 80);
        }
      }
    },

    _closeImportModal() {
      if (this._importAbortController) {
        this._importAbortController.abort();
        this._importAbortController = null;
      }
      document.getElementById('ytm-import-modal')?.classList.remove('open');
    },

    _buildImportBody() {
      const body = document.getElementById('ytm-import-body');
      if (!body) return;

      body.innerHTML = `
        <div class="ytm-import-input-section">
          <p class="ytm-field-label">YouTube or YouTube Music URL</p>
          <div class="ytm-import-bar">
            <div class="ytm-import-input-wrap">
              <span class="ytm-import-link-icon" aria-hidden="true">${ICON.link}</span>
              <input type="text" id="ytm-import-url-input" class="ytm-text-input" placeholder="Paste YouTube / YTM playlist, album, or song URL…" autocomplete="off">
            </div>
            <button id="ytm-import-paste-btn" class="ytm-btn ytm-btn-secondary" title="Paste from clipboard">Paste</button>
            <button id="ytm-import-fetch-btn" class="ytm-btn ytm-btn-primary">Fetch</button>
          </div>
          <p class="ytm-field-hint">Supports YouTube & YouTube Music playlist links, album links, and video links with playlists.</p>
        </div>
        <div id="ytm-import-content" class="ytm-import-content"></div>
      `;

      // Paste button
      document.getElementById('ytm-import-paste-btn').onclick = async () => {
        try {
          if (navigator.clipboard?.readText) {
            const text = await navigator.clipboard.readText();
            if (text) {
              const input = document.getElementById('ytm-import-url-input');
              if (input) {
                input.value = text.trim();
                this._fetchImportUrl();
              }
            }
          } else {
            this._toast('Clipboard access not supported. Please paste manually (Ctrl+V).');
          }
        } catch (_) {
          this._toast('Could not read clipboard. Please paste manually (Ctrl+V).');
        }
      };

      // Fetch button
      document.getElementById('ytm-import-fetch-btn').onclick = () => {
        this._fetchImportUrl();
      };

      // Enter key in url input
      document.getElementById('ytm-import-url-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this._fetchImportUrl();
        }
      });
    },

    async _fetchImportUrl() {
      const input = document.getElementById('ytm-import-url-input');
      const val = input?.value.trim();
      const content = document.getElementById('ytm-import-content');
      if (!content) return;

      if (!val) {
        content.innerHTML = `<div class="ytm-empty" style="padding:24px 0;"><div class="ytm-empty-icon">⚠️</div><div class="ytm-empty-text">Please enter a YouTube link or ID.</div></div>`;
        return;
      }

      const parsed = parseYouTubeUrl(val);
      if (!parsed) {
        content.innerHTML = `
          <div class="ytm-empty" style="padding:24px 0;">
            <div class="ytm-empty-icon">⚠️</div>
            <div class="ytm-empty-text">Unrecognized link format.</div>
            <p class="ytm-field-hint" style="text-align:center; margin-top:8px;">
              Please provide a valid YouTube Music or YouTube URL (e.g. <code>https://music.youtube.com/playlist?list=...</code>).
            </p>
          </div>
        `;
        return;
      }

      content.innerHTML = `
        <div class="ytm-empty" style="padding:32px 0;">
          <div class="ytm-empty-icon ytm-spin">${ICON.sync}</div>
          <div class="ytm-empty-text" id="ytm-import-fetch-status">Connecting to YouTube Music…</div>
        </div>
      `;

      const statusEl = document.getElementById('ytm-import-fetch-status');

      try {
        if (parsed.type === 'playlist') {
          if (statusEl) statusEl.textContent = 'Loading playlist and fetching tracks…';
          const playlist = await API.getPlaylistAllTracks(parsed.browseId, (u, o) => this._apiFetch(u, o), (prog) => {
            if (statusEl) statusEl.textContent = `Loaded ${prog.loaded} tracks…`;
          });
          this._importedData = playlist;
          this._renderImportResult(playlist);
        } else if (parsed.type === 'album') {
          if (statusEl) statusEl.textContent = 'Loading album…';
          const album = await API.getAlbum(parsed.browseId, (u, o) => this._apiFetch(u, o));
          this._importedData = album;
          this._renderImportResult(album);
        } else if (parsed.type === 'track') {
          if (statusEl) statusEl.textContent = 'Fetching song details…';
          const watchData = await API.getWatchPlaylist(parsed.videoId, null, (u, o) => this._apiFetch(u, o));
          if (!watchData || !watchData.length) {
            throw new Error('Track not found on YouTube Music');
          }
          const singleTrack = watchData[0];
          this._importedData = { type: 'track', track: singleTrack, radioQueue: watchData };
          this._renderImportResult(this._importedData);
        } else if (parsed.type === 'artist') {
          this._closeImportModal();
          this._pushNav('Artist', () => this._loadArtist(parsed.browseId), null);
        }
      } catch (err) {
        console.error(`${PLUGIN_LABEL} fetch import error:`, err);
        content.innerHTML = `
          <div class="ytm-empty" style="padding:24px 0;">
            <div class="ytm-empty-icon">⚠️</div>
            <div class="ytm-empty-text">Failed to fetch content: ${esc(err.message)}</div>
          </div>
        `;
      }
    },

    _renderImportResult(data) {
      const content = document.getElementById('ytm-import-content');
      if (!content || !data) return;

      // Handle single track
      if (data.type === 'track') {
        const t = data.track;
        const durStr = t.duration ? fmtDuration(t.duration) : '';
        const thumb = t.thumb || ytThumb(t.videoId);
        content.innerHTML = `
          <div class="ytm-import-card">
            <div class="ytm-import-hero">
              <img class="ytm-import-thumb" src="${esc(thumb)}" alt="" onerror="this.remove()">
              <div class="ytm-import-info">
                <div class="ytm-import-title-static">${esc(t.title)}</div>
                <div class="ytm-import-sub">
                  <span>${esc(t.artist || 'Unknown Artist')}</span>
                  ${t.album ? `<span class="ytm-dot">·</span><span>${esc(t.album)}</span>` : ''}
                  ${durStr ? `<span class="ytm-dot">·</span><span>${durStr}</span>` : ''}
                </div>
              </div>
            </div>
            <div class="ytm-import-actions-bar">
              <div class="ytm-import-action-buttons">
                <button id="ytm-import-play-track" class="ytm-btn ytm-btn-primary">${ICON.play} Play Song</button>
                <button id="ytm-import-radio-track" class="ytm-btn ytm-btn-secondary">${ICON.queue} Start Radio</button>
                <button id="ytm-import-save-track" class="ytm-btn ytm-btn-secondary">${ICON.heart} Add to Library</button>
              </div>
            </div>
          </div>
        `;

        document.getElementById('ytm-import-play-track').onclick = () => {
          this._playTrack(t, [t]);
          this._closeImportModal();
        };
        document.getElementById('ytm-import-radio-track').onclick = () => {
          this._playTrack(t, data.radioQueue || [t]);
          this._closeImportModal();
        };
        document.getElementById('ytm-import-save-track').onclick = async () => {
          await this._saveTrack(t);
          this._closeImportModal();
        };
        return;
      }

      // Handle playlist or album
      const tracks = data.tracks || [];
      if (!tracks.length) {
        content.innerHTML = `
          <div class="ytm-empty" style="padding:24px 0;">
            <div class="ytm-empty-icon">🎵</div>
            <div class="ytm-empty-text">No playable tracks found in this ${data.type || 'playlist'}.</div>
          </div>
        `;
        return;
      }

      this._selectedTrackIndices = new Set(tracks.map((_, i) => i));

      const totalSec = tracks.reduce((acc, t) => acc + (t.duration || 0), 0);
      const totalDurStr = totalSec > 0 ? fmtDuration(totalSec) : '';
      const thumb = data.thumb || (tracks[0]?.videoId ? ytThumb(tracks[0].videoId) : '');
      const owner = data.owner || data.artist || 'YouTube Music';

      content.innerHTML = `
        <div class="ytm-import-card">
          <div class="ytm-import-hero">
            ${thumb ? `<img class="ytm-import-thumb" src="${esc(thumb)}" alt="" onerror="this.remove()">` : ''}
            <div class="ytm-import-info">
              <label class="ytm-field-label" for="ytm-import-title-input">Playlist Title (editable)</label>
              <input type="text" id="ytm-import-title-input" class="ytm-text-input ytm-import-title-input" value="${esc(data.title || 'Imported Playlist')}">
              <div class="ytm-import-sub">
                <span class="ytm-import-owner">${esc(owner)}</span>
                <span class="ytm-dot">·</span>
                <span class="ytm-import-count">${tracks.length} tracks</span>
                ${totalDurStr ? `<span class="ytm-dot">·</span><span class="ytm-import-dur">${totalDurStr}</span>` : ''}
                ${data.hasMore ? `<span class="ytm-badge-new">Capped at 500</span>` : ''}
              </div>
            </div>
          </div>

          <div class="ytm-import-actions-bar">
            <label class="ytm-checkbox-label" for="ytm-import-select-all">
              <input type="checkbox" id="ytm-import-select-all" checked>
              <span>Select All (<span id="ytm-import-selected-count">${tracks.length}</span>)</span>
            </label>
            <div class="ytm-import-action-buttons">
              <button id="ytm-import-fix-btn" class="ytm-btn ytm-btn-secondary" title="Fix artist, song title & fetch high-res cover art">
                ${ICON.wand} <span id="ytm-import-fix-label">Fix All Metadata</span>
              </button>
              <button id="ytm-import-play-btn" class="ytm-btn ytm-btn-secondary">${ICON.play} Play Now</button>
              <button id="ytm-import-save-btn" class="ytm-btn ytm-btn-primary">${ICON.heart} Import to Library</button>
            </div>
          </div>

          <!-- Progress bar -->
          <div id="ytm-import-progress-wrap" class="ytm-import-progress-wrap hidden">
            <div class="ytm-progress-bar-bg">
              <div id="ytm-import-progress-bar" class="ytm-progress-bar-fill" style="width: 0%;"></div>
            </div>
            <div class="ytm-import-progress-status">
              <span id="ytm-import-progress-text">Importing…</span>
              <button id="ytm-import-cancel-btn" class="ytm-btn ytm-btn-danger ytm-btn-sm">Cancel</button>
            </div>
          </div>

          <!-- Track checklist -->
          <div class="ytm-import-track-list" id="ytm-import-track-list">
            ${tracks.map((t, idx) => {
              const rowThumb = t.thumb || (t.videoId ? ytThumb(t.videoId, 'hqdefault') : '');
              const dur = t.duration ? fmtDuration(t.duration) : '';
              return `
                <div class="ytm-import-track-row" data-idx="${idx}">
                  <input type="checkbox" class="ytm-import-track-chk" data-idx="${idx}" checked>
                  <span class="ytm-import-track-num">${idx + 1}</span>
                  <img class="ytm-import-track-thumb" src="${esc(rowThumb)}" alt="" loading="lazy">
                  <div class="ytm-import-track-meta">
                    <div class="ytm-import-track-title">${esc(t.title)}</div>
                    <div class="ytm-import-track-sub">${esc(t.artist || 'Unknown Artist')}</div>
                  </div>
                  ${dur ? `<div class="ytm-import-track-dur">${esc(dur)}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      // Select all toggle
      const selectAllEl = document.getElementById('ytm-import-select-all');
      selectAllEl.onchange = (e) => {
        const checked = e.target.checked;
        const chks = content.querySelectorAll('.ytm-import-track-chk');
        chks.forEach(c => {
          c.checked = checked;
          const idx = parseInt(c.dataset.idx, 10);
          if (checked) this._selectedTrackIndices.add(idx);
          else this._selectedTrackIndices.delete(idx);
        });
        this._updateSelectedCount(tracks.length);
      };

      // Individual checkboxes
      content.querySelectorAll('.ytm-import-track-chk').forEach(c => {
        c.onchange = (e) => {
          const idx = parseInt(c.dataset.idx, 10);
          if (c.checked) this._selectedTrackIndices.add(idx);
          else this._selectedTrackIndices.delete(idx);
          if (selectAllEl) selectAllEl.checked = this._selectedTrackIndices.size === tracks.length;
          this._updateSelectedCount(tracks.length);
        };
      });

      // Fix Metadata button
      const fixBtn = document.getElementById('ytm-import-fix-btn');
      if (fixBtn) {
        fixBtn.onclick = () => {
          this._fixImportMetadata(data);
        };
      }

      // Play Now button
      document.getElementById('ytm-import-play-btn').onclick = () => {
        const selected = tracks.filter((_, i) => this._selectedTrackIndices.has(i));
        if (!selected.length) {
          this._toast('Please select at least one track to play');
          return;
        }
        this._playTrack(selected[0], selected);
        this._closeImportModal();
      };

      // Import to Library button
      document.getElementById('ytm-import-save-btn').onclick = () => {
        this._startImport(data);
      };

      this._updateSelectedCount(tracks.length);
    },

    _updateSelectedCount(total) {
      const countEl = document.getElementById('ytm-import-selected-count');
      if (countEl) countEl.textContent = this._selectedTrackIndices.size;
      const playBtn = document.getElementById('ytm-import-play-btn');
      const saveBtn = document.getElementById('ytm-import-save-btn');
      const fixBtn = document.getElementById('ytm-import-fix-btn');
      const fixLabel = document.getElementById('ytm-import-fix-label');
      const selSize = this._selectedTrackIndices.size;
      const disabled = selSize === 0;

      if (playBtn) playBtn.disabled = disabled;
      if (saveBtn) saveBtn.disabled = disabled;
      if (fixBtn) fixBtn.disabled = disabled;

      if (fixLabel) {
        if (selSize === total || selSize === 0) {
          fixLabel.textContent = 'Fix All Metadata';
        } else {
          fixLabel.textContent = `Fix Selected (${selSize})`;
        }
      }
    },

    async _fixImportMetadata(data) {
      const tracks = data.tracks || [];
      const selectedIndices = Array.from(this._selectedTrackIndices);
      if (!selectedIndices.length) {
        this._toast('No tracks selected to fix');
        return;
      }

      const progressWrap = document.getElementById('ytm-import-progress-wrap');
      const progressBar  = document.getElementById('ytm-import-progress-bar');
      const progressText = document.getElementById('ytm-import-progress-text');
      const cancelBtn    = document.getElementById('ytm-import-cancel-btn');
      const actionsBar   = document.querySelector('.ytm-import-actions-bar');
      const trackListEl  = document.getElementById('ytm-import-track-list');

      if (progressWrap) progressWrap.classList.remove('hidden');
      if (actionsBar) actionsBar.classList.add('hidden');
      if (cancelBtn) cancelBtn.classList.remove('hidden');

      this._fixAbortController = new AbortController();
      const signal = this._fixAbortController.signal;

      cancelBtn.onclick = () => {
        if (this._fixAbortController) {
          this._fixAbortController.abort();
        }
      };

      let fixedCount = 0;
      const total = selectedIndices.length;

      try {
        for (let i = 0; i < selectedIndices.length; i++) {
          if (signal.aborted) {
            throw new DOMException('Metadata fix stopped by user', 'AbortError');
          }

          const idx = selectedIndices[i];
          const t = tracks[idx];
          if (!t) continue;

          const pct = Math.round(((i + 1) / total) * 100);
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressText) progressText.textContent = `Fixing ${i + 1}/${total}: "${t.title}"…`;

          // 1. First run algorithmic cleaner
          const localCleaned = cleanTitleAndArtist(t.title, t.artist, 'MUSIC_PAGE_TYPE_USER_CHANNEL', true);
          let targetTitle = localCleaned.title;
          let targetArtist = localCleaned.artist;
          let targetCover = t.thumb || (t.videoId ? ytThumb(t.videoId, 'hqdefault') : null);

          // 2. Query canonical metadata fetcher (iTunes / Deezer)
          let canonical = null;
          try {
            canonical = await fetchCanonicalMetadata(targetTitle, targetArtist, (u, o) => this._apiFetch(u, o));
          } catch (_) {}

          if (canonical) {
            if (canonical.title) targetTitle = canonical.title;
            if (canonical.artist) targetArtist = canonical.artist;
            if (canonical.album) t.album = canonical.album;
            if (canonical.thumb) targetCover = canonical.thumb;
          }

          // Update track data object
          t.title = targetTitle;
          t.artist = targetArtist;
          if (targetCover) t.thumb = targetCover;

          // Update DOM row in tracklist
          if (trackListEl) {
            const row = trackListEl.querySelector(`.ytm-import-track-row[data-idx="${idx}"]`);
            if (row) {
              const titleEl = row.querySelector('.ytm-import-track-title');
              const artistEl = row.querySelector('.ytm-import-track-sub');
              const thumbEl = row.querySelector('.ytm-import-track-thumb');

              if (titleEl) {
                titleEl.innerHTML = `${esc(targetTitle)} <span class="ytm-meta-fixed-pill">Fixed</span>`;
              }
              if (artistEl) {
                artistEl.textContent = targetArtist;
              }
              if (thumbEl && targetCover) {
                thumbEl.src = targetCover;
              }
            }
          }

          // If first track has an upgraded cover, update playlist hero thumb
          if (idx === 0 && targetCover) {
            const heroThumb = document.querySelector('.ytm-import-thumb');
            if (heroThumb) heroThumb.src = targetCover;
            data.thumb = targetCover;
          }

          fixedCount++;
        }

        this._toast(`Fixed metadata for ${fixedCount} track${fixedCount === 1 ? '' : 's'}!`);
      } catch (err) {
        if (err.name === 'AbortError') {
          this._toast('Metadata fix cancelled');
        } else {
          console.error(`${PLUGIN_LABEL} metadata fix error:`, err);
          this._toast(`Metadata fix error: ${err.message}`);
        }
      } finally {
        this._fixAbortController = null;
        if (progressWrap) progressWrap.classList.add('hidden');
        if (actionsBar) actionsBar.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';
      }
    },

    async _startImport(data) {
      const tracks = data.tracks || [];
      const selectedTracks = tracks.filter((_, i) => this._selectedTrackIndices.has(i));
      if (!selectedTracks.length) {
        this._toast('No tracks selected to import');
        return;
      }

      const titleInput = document.getElementById('ytm-import-title-input');
      const playlistTitle = (titleInput?.value || data.title || 'Imported Playlist').trim();
      const thumb = data.thumb || (selectedTracks[0]?.videoId ? ytThumb(selectedTracks[0].videoId) : null);

      const progressWrap = document.getElementById('ytm-import-progress-wrap');
      const progressBar  = document.getElementById('ytm-import-progress-bar');
      const progressText = document.getElementById('ytm-import-progress-text');
      const cancelBtn    = document.getElementById('ytm-import-cancel-btn');
      const actionsBar   = document.querySelector('.ytm-import-actions-bar');

      if (progressWrap) progressWrap.classList.remove('hidden');
      if (actionsBar) actionsBar.classList.add('hidden');

      this._importAbortController = new AbortController();
      const signal = this._importAbortController.signal;

      cancelBtn.onclick = () => {
        if (this._importAbortController) {
          this._importAbortController.abort();
        }
      };

      try {
        const res = await this._importTracksToLibrary(
          playlistTitle,
          thumb,
          selectedTracks,
          ({ current, total, track }) => {
            const pct = Math.round((current / total) * 100);
            if (progressBar) progressBar.style.width = `${pct}%`;
            if (progressText) progressText.textContent = `Importing ${current}/${total}: ${track.title}`;
          },
          signal
        );

        this._toast(`Imported ${res.imported} tracks into "${playlistTitle}"!`);
        if (progressText) {
          progressText.innerHTML = `${ICON.check} Imported ${res.imported} tracks into Library!`;
        }
        if (cancelBtn) cancelBtn.classList.add('hidden');
        if (progressBar) progressBar.style.width = '100%';

        setTimeout(() => {
          this._closeImportModal();
        }, 1500);
      } catch (err) {
        if (err.name === 'AbortError') {
          this._toast('Import stopped');
          if (progressText) progressText.textContent = 'Import cancelled by user';
        } else {
          console.error(`${PLUGIN_LABEL} import error:`, err);
          this._toast(`Import error: ${err.message}`);
          if (progressText) progressText.textContent = `Error: ${err.message}`;
        }
        if (cancelBtn) cancelBtn.textContent = 'Close';
        cancelBtn.onclick = () => this._closeImportModal();
      } finally {
        this._importAbortController = null;
      }
    },

    async _importTracksToLibrary(title, thumb, tracks, onProgress, signal) {
      if (!tracks || !tracks.length) throw new Error('No tracks selected to import');

      let playlistId = null;
      try {
        playlistId = await this.api.library.createPlaylist(title, thumb || null);
      } catch (err) {
        console.warn(`${PLUGIN_LABEL} createPlaylist error:`, err);
      }

      let imported = 0;
      for (let i = 0; i < tracks.length; i++) {
        if (signal?.aborted) {
          throw new DOMException('Import cancelled by user', 'AbortError');
        }
        const t = tracks[i];
        if (!t.videoId) continue;

        try {
          const dur = t.duration || videoDurationCache.get(t.videoId) || null;
          const trackCover = t.thumb || (t.videoId ? ytThumb(t.videoId, 'hqdefault') : null) || thumb;
          const trackId = await this.api.library.addExternalTrack({
            title:       t.title,
            artist:      t.artist || 'Unknown Artist',
            album:       t.album || title,
            duration:    dur || null,
            cover_url:   trackCover,
            source_type: SOURCE_TYPE,
            external_id: t.videoId,
            liked:       false,
          });
          this.libraryIds.add(t.videoId);

          if (playlistId && typeof trackId === 'number' && trackId > 0) {
            await this.api.library.addTrackToPlaylist(playlistId, trackId);
          }
          imported++;
        } catch (trackErr) {
          console.warn(`${PLUGIN_LABEL} addExternalTrack failed for ${t.videoId}:`, trackErr);
        }

        onProgress?.({ current: i + 1, total: tracks.length, track: t, imported });
      }

      if (typeof this.api.library.refresh === 'function') {
        try { await this.api.library.refresh(); } catch (_) {}
      }

      return { playlistId, imported, total: tracks.length };
    },

    _renderUrlDetectedCard(urlInfo, rawUrl) {
      const typeLabel = urlInfo.type === 'playlist' ? 'YouTube / YTM Playlist' : urlInfo.type === 'album' ? 'YouTube Music Album' : 'YouTube Song';
      const btnIcon = urlInfo.type === 'track' ? ICON.play : ICON.import;
      const btnText = urlInfo.type === 'track' ? 'Play / Inspect Song' : 'Preview & Import Playlist';

      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="ytm-url-detected-card">
          <div class="ytm-url-badge">${ICON.link} YouTube Link Detected</div>
          <div class="ytm-url-detected-title">${typeLabel}</div>
          <div class="ytm-url-detected-desc">${esc(rawUrl)}</div>
          <div class="ytm-url-detected-actions">
            <button class="ytm-btn ytm-btn-primary" id="ytm-url-open-btn">
              ${btnIcon} ${btnText}
            </button>
          </div>
        </div>
      `;

      wrap.querySelector('#ytm-url-open-btn').onclick = () => {
        this._openImportModal(rawUrl);
      };

      this._setContent(wrap);
    },

    _renderInstanceList(containerId, arr) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = arr.map((url, i) => `
        <div class="ytm-instance-row">
          <input class="ytm-text-input" type="url" value="${esc(url)}" placeholder="https://…">
          <button class="ytm-remove-btn" data-idx="${i}">✕</button>
        </div>
      `).join('');
      el.querySelectorAll('.ytm-remove-btn').forEach(btn => {
        btn.onclick = () => {
          arr.splice(parseInt(btn.dataset.idx), 1);
          this._renderInstanceList(containerId, arr);
        };
      });
    },

    // ─── Events ────────────────────────────────────────────────────────────────

    _wireEvents() {
      // Header buttons
      document.getElementById('ytm-close-btn').onclick = () => this.close();
      document.getElementById('ytm-back-btn').onclick  = () => this._goBack();

      // Settings
      document.getElementById('ytm-settings-open').onclick = () => {
        this._buildSettingsBody();
        document.getElementById('ytm-settings')?.classList.add('open');
      };
      document.getElementById('ytm-settings-close').onclick = () => {
        document.getElementById('ytm-settings')?.classList.remove('open');
      };

      // Import modal
      document.getElementById('ytm-import-open').onclick = () => {
        this._openImportModal();
      };
      document.getElementById('ytm-import-close').onclick = () => {
        this._closeImportModal();
      };

      // Tabs
      document.getElementById('ytm-tabs').onclick = (e) => {
        const btn = e.target.closest('[data-tab]');
        if (!btn) return;
        this._switchTab(btn.dataset.tab);
      };

      // Filter chips
      document.getElementById('ytm-filter-row')?.addEventListener('click', (e) => {
        const chip = e.target.closest('[data-filter]');
        if (!chip) return;
        document.querySelectorAll('.ytm-chip').forEach(c => {
          c.classList.remove('active');
          c.setAttribute('aria-pressed', 'false');
        });
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
        this._searchFilter = chip.dataset.filter || null;
        const q = document.getElementById('ytm-search-input')?.value.trim();
        if (q) this._performSearch(q);
      });

      // Search input
      const input = document.getElementById('ytm-search-input');
      input?.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        this._currentQuery = q;
        clearTimeout(this._searchTimer);
        if (!q) { this._setContent(this._emptyEl('🎵', 'Start typing to search…')); return; }

        const urlInfo = parseYouTubeUrl(q);
        if (urlInfo) {
          this._renderUrlDetectedCard(urlInfo, q);
          return;
        }

        this._searchTimer = setTimeout(() => this._performSearch(q), 380);
      });

      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const q = input.value.trim();
          const urlInfo = parseYouTubeUrl(q);
          if (urlInfo) {
            e.preventDefault();
            this._openImportModal(q);
          }
        }
      });

      // ESC to close (close modals first)
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isOpen) {
          const importModal = document.getElementById('ytm-import-modal');
          if (importModal?.classList.contains('open')) {
            this._closeImportModal();
            return;
          }
          const settings = document.getElementById('ytm-settings');
          if (settings?.classList.contains('open')) {
            settings.classList.remove('open');
            return;
          }
          this.close();
        }
      });
    },

    // ─── Playerbar button ──────────────────────────────────────────────────────

    _buildPlayerbarButton() {
      if (document.getElementById('ytm-pb-btn')) return;
      const btn = document.createElement('button');
      btn.id = 'ytm-pb-btn';
      btn.className = 'ytm-pb-btn';
      btn.innerHTML = `${ICON.ytmusic}<span>YouTube Music</span>`;
      btn.onclick = () => this.open();
      if (this.api?.ui?.registerSlot) {
        this.api.ui.registerSlot('playerbar:menu', btn);
      }
      // retry in case slot isn't ready yet
      setTimeout(() => this._buildPlayerbarButton(), 600);
    },

    // ─── Open / Close ──────────────────────────────────────────────────────────

    open() {
      this.isOpen = true;
      document.getElementById('ytm-overlay')?.classList.add('open');
      document.getElementById('ytm-panel')?.classList.add('open');
      this._fetchLibraryIds();
      if (this._activeTab === 'home' && !this._currentData) {
        this._loadHome();
      }
    },

    close() {
      this.isOpen = false;
      document.getElementById('ytm-overlay')?.classList.remove('open');
      document.getElementById('ytm-panel')?.classList.remove('open');
    },

    // ─── Tab switching ─────────────────────────────────────────────────────────

    _switchTab(tab) {
      if (this._activeTab === tab && this._navStack.length === 0) return;
      this._navStack = [];
      this._activeTab = tab;
      this._currentNavState = { type: 'tab', tab, title: tab === 'home' ? 'YouTube Music' : tab === 'trending' ? 'Trending' : 'Search' };

      document.querySelectorAll('.ytm-tab').forEach(t => {
        const isActive = t.dataset.tab === tab;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      const searchRow   = document.getElementById('ytm-search-row');
      const filterRow   = document.getElementById('ytm-filter-row');
      const backBtn     = document.getElementById('ytm-back-btn');
      const panelTitle  = document.getElementById('ytm-panel-title');

      searchRow?.classList.toggle('hidden', tab !== 'search');
      filterRow?.classList.toggle('hidden', tab !== 'search');
      backBtn?.classList.add('hidden');

      panelTitle.textContent = this._currentNavState.title;
      this._currentData = null;

      if (tab === 'home') {
        this._loadHome();
      } else if (tab === 'trending') {
        this._loadTrending();
      } else if (tab === 'search') {
        const q = document.getElementById('ytm-search-input')?.value.trim();
        if (q) this._performSearch(q);
        else this._setContent(this._emptyEl('🔍', 'Search for songs, albums, artists, or playlists'));
        setTimeout(() => document.getElementById('ytm-search-input')?.focus(), 80);
      }
    },

    // ─── Navigation stack ──────────────────────────────────────────────────────

    _pushNav(title, renderFn, data) {
      if (this._currentNavState) {
        this._navStack.push(this._currentNavState);
      }
      document.getElementById('ytm-panel-title').textContent = title;
      document.getElementById('ytm-back-btn')?.classList.remove('hidden');
      document.querySelectorAll('.ytm-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('ytm-search-row')?.classList.add('hidden');
      document.getElementById('ytm-filter-row')?.classList.add('hidden');
      renderFn(data);
    },

    _goBack() {
      if (!this._navStack.length) { this.close(); return; }
      const prev = this._navStack.pop();
      document.getElementById('ytm-panel-title').textContent = prev.title || 'YouTube Music';
      document.getElementById('ytm-back-btn')?.classList.toggle('hidden', this._navStack.length === 0);

      if (prev.type === 'tab') {
        this._activeTab = prev.tab;
        this._currentNavState = prev;
        this._switchTab(prev.tab);
      } else if (prev.type === 'search') {
        this._activeTab = 'search';
        this._currentQuery = prev.query || '';
        this._searchFilter = prev.filter || null;
        this._currentNavState = prev;
        document.querySelectorAll('.ytm-tab').forEach(t => {
          const isActive = t.dataset.tab === 'search';
          t.classList.toggle('active', isActive);
          t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        document.getElementById('ytm-search-row')?.classList.remove('hidden');
        document.getElementById('ytm-filter-row')?.classList.remove('hidden');
        const input = document.getElementById('ytm-search-input');
        if (input) input.value = prev.query || '';
        document.querySelectorAll('.ytm-chip').forEach(c => {
          c.classList.toggle('active', (c.dataset.filter || null) === this._searchFilter);
        });
        this._performSearch(prev.query);
      } else if (prev.type === 'artist') {
        this._currentNavState = prev;
        this._loadArtist(prev.id);
      } else if (prev.type === 'album') {
        this._currentNavState = prev;
        this._loadAlbum(prev.id);
      } else if (prev.type === 'playlist') {
        this._currentNavState = prev;
        this._loadPlaylist(prev.id);
      }
    },

    // ─── Load Home ─────────────────────────────────────────────────────────────

    async _loadHome() {
      const cacheKey = 'home';
      const cached = this._browseCache.get(cacheKey);
      if (cached) return this._renderSections(cached);
      this._setSkeleton();
      try {
        const sections = await API.getHome((u, o) => this._apiFetch(u, o));
        this._browseCache.set(cacheKey, sections);
        this._renderSections(sections);
      } catch (e) {
        this._setContent(this._emptyEl('⚠️', `Failed to load home: ${e.message}`));
      }
    },

    // ─── Load Trending ─────────────────────────────────────────────────────────

    async _loadTrending() {
      const cacheKey = 'trending';
      const cached = this._browseCache.get(cacheKey);
      if (cached) return this._renderSections(cached);
      this._setSkeleton();
      try {
        const sections = await API.getTrending((u, o) => this._apiFetch(u, o));
        this._browseCache.set(cacheKey, sections);
        this._renderSections(sections);
      } catch (e) {
        this._setContent(this._emptyEl('⚠️', `Failed to load trending: ${e.message}`));
      }
    },

    // ─── Search ────────────────────────────────────────────────────────────────

    async _performSearch(query) {
      this._currentQuery = query;
      const filter = this._searchFilter || null;
      this._currentNavState = {
        type: 'search',
        query,
        filter,
        title: `Search: ${query}`
      };
      const cacheKey = `search:${query}:${filter || 'all'}`;
      const cached = this._searchCache.get(cacheKey);
      if (cached) return this._renderSections(cached, true);
      this._setSkeleton();
      try {
        const sections = await API.search(query, (u, o) => this._apiFetch(u, o), filter);
        this._searchCache.set(cacheKey, sections);
        if (this._currentQuery === query || !this._currentQuery) {
          this._renderSections(sections, true);
        }
      } catch (e) {
        this._setContent(this._emptyEl('⚠️', `Search failed: ${e.message}`));
      }
    },

    // ─── Render: Section list ──────────────────────────────────────────────────

    _renderSections(sections, isSearch = false) {
      if (!sections || !sections.length) {
        return this._setContent(this._emptyEl('🎵', 'Nothing to show'));
      }

      const wrap = document.createElement('div');
      for (const section of sections) {
        if (!section.item && (!section.items || !section.items.length)) continue;

        let el;
        if (section._type === 'card-hero') {
          el = this._renderCardHero(section);
        } else {
          const items = section.items || [];
          const playableCount  = items.filter(it => it.videoId).length;
          const navigableOnly  = items.filter(it => it.browseId && !it.videoId).length;
          const isSongList     = playableCount > 0 && navigableOnly === 0;
          const isMixed        = playableCount > 0 && navigableOnly > 0;

          if (isSongList) {
            el = this._renderTrackSection(section);
          } else if (isMixed) {
            const songSection = { title: section.title, items: items.filter(i => i.videoId) };
            const cardSection = { title: null,           items: items.filter(i => i.browseId && !i.videoId) };
            el = document.createElement('div');
            if (cardSection.items.length) el.appendChild(this._renderCardSection(cardSection));
            if (songSection.items.length) el.appendChild(this._renderTrackSection(songSection));
          } else {
            el = this._renderCardSection(section);
          }
        }
        if (el) wrap.appendChild(el);
      }

      if (!wrap.children.length) return this._setContent(this._emptyEl('🎵', 'Nothing to show'));
      this._setContent(wrap);
    },

    _renderCardHero(section) {
      const container = document.createElement('div');
      container.className = 'ytm-section ytm-top-result-section';
      container.innerHTML = `<div class="ytm-section-title">${esc(section.title || 'Top Result')}</div>`;

      const heroCard = document.createElement('div');
      heroCard.className = 'ytm-top-result-card';
      const isArtist = section.item.pageType?.includes('ARTIST') || section.item.browseId?.startsWith('UC');
      const thumbUrl = section.item.thumb || '';

      heroCard.innerHTML = `
        <div class="ytm-top-result-left">
          ${thumbUrl ? `<img class="ytm-top-result-thumb${isArtist ? ' circle' : ''}" src="${esc(thumbUrl)}" loading="lazy" onerror="this.style.background='var(--bg-elevated)'">` : ''}
          <div class="ytm-top-result-info">
            <div class="ytm-top-result-title">${esc(section.item.title)}</div>
            <div class="ytm-top-result-sub">${esc(section.item.subtitle || (isArtist ? 'Artist' : ''))}</div>
            <span class="ytm-top-result-badge">${isArtist ? 'Artist' : 'Top Result'}</span>
          </div>
        </div>
      `;

      heroCard.onclick = () => this._navigateItem(section.item);
      heroCard.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this._navigateItem(section.item);
        }
      };
      heroCard.tabIndex = 0;
      heroCard.setAttribute('role', 'button');
      heroCard.setAttribute('aria-label', `Top result: ${section.item.title}`);

      container.appendChild(heroCard);

      if (section.items && section.items.length) {
        const topTracksEl = this._renderTrackSection({ title: 'Top Songs', items: section.items });
        if (topTracksEl) container.appendChild(topTracksEl);
      }

      return container;
    },

    _renderCardSection(section) {
      const container = document.createElement('div');
      container.className = 'ytm-section';
      if (section.title) {
        container.innerHTML = `<div class="ytm-section-title">${esc(section.title)}</div>`;
      }

      const row = document.createElement('div');
      row.className = 'ytm-card-row';

      for (const item of (section.items || [])) {
        const isArtist = item.pageType?.includes('ARTIST') || item.browseId?.startsWith('UC');
        const isAlbum = item.pageType?.includes('ALBUM') || item.pageType?.includes('SINGLE') || item.pageType?.includes('EP') || item.browseId?.startsWith('MPRE');
        const isPlaylist = item.pageType?.includes('PLAYLIST') || item.browseId?.startsWith('VL') || item.browseId?.startsWith('PL') || item.browseId?.startsWith('RD');

        const card = document.createElement('div');
        card.className = 'ytm-card';
        const thumbUrl = item.thumb || (item.videoId ? ytThumb(item.videoId) : '');
        card.innerHTML = `
          <div class="ytm-card-thumb-wrap">
            <img class="ytm-card-thumb${isArtist ? ' circle' : ''}" src="${esc(thumbUrl)}"
                 onerror="this.style.background='#1a1a1a'" loading="lazy">
            ${(isAlbum || isPlaylist) ? `
              <button class="ytm-card-like-btn" title="${isAlbum ? 'Save Album to Library' : 'Save Playlist to Library'}" aria-label="${isAlbum ? 'Save Album to Library' : 'Save Playlist to Library'}">
                ${ICON.heartO}
              </button>
            ` : ''}
          </div>
          <div class="ytm-card-label">${esc(item.title)}</div>
          <div class="ytm-card-sub">${esc(item.subtitle || item.artist || '')}</div>
        `;
        card.tabIndex = 0;
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `${item.title}${item.subtitle ? ` by ${item.subtitle}` : ''}`);
        card.onclick = (e) => {
          if (e.target.closest('.ytm-card-like-btn')) return;
          this._navigateItem(item);
        };
        card.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._navigateItem(item);
          }
        };

        const cardLikeBtn = card.querySelector('.ytm-card-like-btn');
        if (cardLikeBtn) {
          cardLikeBtn.onclick = async (e) => {
            e.stopPropagation();
            cardLikeBtn.disabled = true;
            try {
              if (isAlbum) {
                const cached = this._browseCache.get(`album:${item.browseId}`);
                const album = cached || await API.getAlbum(item.browseId, (u, o) => this._apiFetch(u, o));
                if (!cached) this._browseCache.set(`album:${item.browseId}`, album);
                await this._toggleLikeAlbum(album, cardLikeBtn, null);
              } else if (isPlaylist) {
                const cached = this._browseCache.get(`playlist:${item.browseId}`);
                const playlist = cached || await API.getPlaylist(item.browseId, (u, o) => this._apiFetch(u, o));
                if (!cached) this._browseCache.set(`playlist:${item.browseId}`, playlist);
                await this._toggleLikePlaylist(playlist, cardLikeBtn, null);
              }
            } catch (err) {
              this._toast(`Failed: ${err.message}`);
            } finally {
              cardLikeBtn.disabled = false;
            }
          };
        }

        row.appendChild(card);
      }

      container.appendChild(row);
      return container;
    },

    _renderTrackSection(section, showNumbers = false) {
      const container = document.createElement('div');
      container.className = 'ytm-section';
      if (section.title) {
        container.innerHTML = `<div class="ytm-section-title">${esc(section.title)}</div>`;
      }

      const list = document.createElement('div');
      list.className = 'ytm-track-list';

      section.items.forEach((item, idx) => {
        if (!item.videoId) return;
        const inLib = this.libraryIds.has(item.videoId);
        const isPlaying = item.videoId === this._playingVideoId;
        const trackDuration = item.duration || videoDurationCache.get(item.videoId) || 0;
        const dur = trackDuration ? `<div class="ytm-track-dur">${esc(fmtDuration(trackDuration))}</div>` : '';
        const thumb = item.thumb || ytThumb(item.videoId);
        const fallbackThumb = ytThumb(item.videoId);
        const explicit = item.isExplicit ? `<span class="ytm-explicit" title="Explicit">E</span>` : '';

        const row = document.createElement('div');
        row.className = `ytm-track${isPlaying ? ' playing' : ''}`;
        row.dataset.id = item.videoId;
        row.tabIndex = 0;
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', `Play ${item.title} by ${item.artist || 'Unknown'}`);
        row.innerHTML = `
          <div class="ytm-thumb-wrap${showNumbers ? ' with-num' : ''}">
            ${showNumbers ? `<span class="ytm-track-num">${item.trackNumber || (idx + 1)}</span>` : `<img class="ytm-thumb" src="${esc(thumb)}" alt="" loading="lazy" onerror="this.onerror=null; this.src='${fallbackThumb}'">`}
            <div class="ytm-play-ov">${isPlaying ? ICON.pause : ICON.play}</div>
          </div>
          <div class="ytm-track-info">
            <div class="ytm-track-title">${esc(item.title)}${explicit}</div>
            <div class="ytm-track-sub">
              ${item.artist ? `<span class="ytm-link ytm-artist-link" data-id="${item.artistBrowseId || ''}" tabindex="0" role="button" aria-label="View artist ${esc(item.artist)}">${esc(item.artist)}</span>` : ''}
              ${item.artist && item.album ? ' · ' : ''}
              ${item.album ? `<span class="ytm-link ytm-album-link" data-id="${item.albumBrowseId || ''}" tabindex="0" role="button" aria-label="View album ${esc(item.album)}">${esc(item.album)}</span>` : ''}
            </div>
          </div>
          ${dur}
          <div class="ytm-track-actions">
            <button class="ytm-act-btn ytm-save-btn-row${inLib ? ' saved' : ''}" title="${inLib ? 'In Library' : 'Add to Library'}" aria-label="${inLib ? 'In Library' : 'Add to Library'}">
              ${inLib ? ICON.heart : ICON.heartO}
            </button>
            <button class="ytm-act-btn ytm-next-btn" title="Play next" aria-label="Play next">${ICON.playNext}</button>
            <button class="ytm-act-btn ytm-queue-btn" title="Add to queue" aria-label="Add to queue">${ICON.queue}</button>
          </div>
        `;

        row.onclick = (e) => {
          if (e.target.closest('.ytm-act-btn')) return;
          const artistLink = e.target.closest('.ytm-artist-link');
          if (artistLink && artistLink.dataset.id) {
            e.stopPropagation();
            return this._pushNav(item.artist, () => this._loadArtist(artistLink.dataset.id), null);
          }
          const albumLink = e.target.closest('.ytm-album-link');
          if (albumLink && albumLink.dataset.id) {
            e.stopPropagation();
            return this._pushNav(item.album, () => this._loadAlbum(albumLink.dataset.id), null);
          }
          this._playTrack(item, section.items.filter(i => i.videoId));
        };
        row.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._playTrack(item, section.items.filter(i => i.videoId));
          }
        };

        const artistLinkEl = row.querySelector('.ytm-artist-link');
        if (artistLinkEl && item.artistBrowseId) {
          artistLinkEl.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              this._pushNav(item.artist, () => this._loadArtist(item.artistBrowseId), null);
            }
          };
        }
        const albumLinkEl = row.querySelector('.ytm-album-link');
        if (albumLinkEl && item.albumBrowseId) {
          albumLinkEl.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              this._pushNav(item.album, () => this._loadAlbum(item.albumBrowseId), null);
            }
          };
        }

        row.querySelector('.ytm-save-btn-row').onclick = (e) => { e.stopPropagation(); this._saveTrack(item, row); };
        row.querySelector('.ytm-next-btn').onclick = (e) => { e.stopPropagation(); this._queueTrack(item, true); };
        row.querySelector('.ytm-queue-btn').onclick = (e) => { e.stopPropagation(); this._queueTrack(item, false); };

        list.appendChild(row);
      });

      container.appendChild(list);
      return container;
    },

    // ─── Navigate into item (artist/album/playlist/song) ───────────────────────

    async _navigateItem(item) {
      if (item.videoId && !item.browseId) {
        return this._playTrack(item, [item]);
      }
      if (item.videoId && item.playlistId) {
        this._playTrack(item, [item]);
        this._loadWatchPlaylistIntoQueue(item.videoId, item.playlistId);
        return;
      }
      if (!item.browseId) return;

      const pageType = item.pageType || '';
      if (pageType.includes('ARTIST') || item.browseId?.startsWith('UC')) {
        this._pushNav(item.title, () => this._loadArtist(item.browseId), null);
      } else if (pageType.includes('ALBUM') || pageType.includes('SINGLE') || pageType.includes('EP') || item.browseId?.startsWith('MPRE')) {
        this._pushNav(item.title, () => this._loadAlbum(item.browseId), null);
      } else if (pageType.includes('PLAYLIST') || item.browseId?.startsWith('VL') || item.browseId?.startsWith('PL') || item.browseId?.startsWith('RD')) {
        this._pushNav(item.title, () => this._loadPlaylist(item.browseId), null);
      } else {
        this._pushNav(item.title, () => this._loadPlaylist(item.browseId), null);
      }
    },

    async _loadArtist(browseId) {
      this._setSkeleton();
      try {
        const cached = this._browseCache.get(`artist:${browseId}`);
        const artist = cached || await API.getArtist(browseId, (u, o) => this._apiFetch(u, o));
        if (!cached) this._browseCache.set(`artist:${browseId}`, artist);
        this._currentNavState = { type: 'artist', id: browseId, title: artist.name || 'Artist' };
        document.getElementById('ytm-panel-title').textContent = this._currentNavState.title;
        this._renderArtistPage(artist);
      } catch (e) {
        this._setContent(this._emptyEl('⚠️', `Failed to load artist: ${e.message}`));
      }
    },

    _renderArtistPage(artist) {
      const wrap = document.createElement('div');

      const hero = document.createElement('div');
      hero.className = 'ytm-hero';
      hero.innerHTML = `
        ${artist.thumb ? `<img class="ytm-hero-img circle" src="${esc(artist.thumb)}" onerror="this.remove()">` : ''}
        <div class="ytm-hero-info">
          <div class="ytm-hero-title">${esc(artist.name)}</div>
          <div class="ytm-hero-sub">Artist</div>
        </div>
      `;
      wrap.appendChild(hero);

      if (artist.sections?.length) {
        for (const section of artist.sections) {
          if (!section.items?.length) continue;
          const playableCount = section.items.filter(i => i.videoId).length;
          const navigableOnly = section.items.filter(i => i.browseId && !i.videoId).length;
          const isSongList    = playableCount > 0 && navigableOnly === 0;
          const el = isSongList
            ? this._renderTrackSection(section)
            : this._renderCardSection(section);
          if (el) wrap.appendChild(el);
        }
      }

      this._setContent(wrap);
    },

    async _loadAlbum(browseId) {
      this._setSkeleton();
      try {
        const cached = this._browseCache.get(`album:${browseId}`);
        const album = cached || await API.getAlbum(browseId, (u, o) => this._apiFetch(u, o));
        if (!cached) this._browseCache.set(`album:${browseId}`, album);
        this._currentNavState = { type: 'album', id: browseId, title: album.title || 'Album' };
        document.getElementById('ytm-panel-title').textContent = this._currentNavState.title;
        this._renderAlbumPage(album);
      } catch (e) {
        this._setContent(this._emptyEl('⚠️', `Failed to load album: ${e.message}`));
      }
    },

    _renderAlbumPage(album) {
      const wrap = document.createElement('div');

      // Hero
      const hero = document.createElement('div');
      hero.className = 'ytm-hero';
      hero.innerHTML = `
        ${album.thumb ? `<img class="ytm-hero-img" src="${esc(album.thumb)}" onerror="this.remove()">` : ''}
        <div class="ytm-hero-info">
          <div class="ytm-hero-title">${esc(album.title)}</div>
          <div class="ytm-hero-sub">
            ${album.artist ? `<span class="ytm-link ytm-artist-link" data-id="${album.artistBrowseId || ''}" tabindex="0" role="button" aria-label="View artist ${esc(album.artist)}">${esc(album.artist)}</span>` : ''}
            ${album.year ? ' · ' + album.year : ''}
          </div>
        </div>
      `;
      wrap.appendChild(hero);

      const heroArtistLink = hero.querySelector('.ytm-artist-link');
      if (heroArtistLink && album.artistBrowseId) {
        heroArtistLink.onclick = (e) => {
          e.stopPropagation();
          this._pushNav(album.artist, () => this._loadArtist(album.artistBrowseId), null);
        };
        heroArtistLink.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._pushNav(album.artist, () => this._loadArtist(album.artistBrowseId), null);
          }
        };
      }

      // Action row: Play All + Like Album
      const actionRow = document.createElement('div');
      actionRow.className = 'ytm-action-row';

      if (album.tracks?.length) {
        const playAll = document.createElement('button');
        playAll.className = 'ytm-btn ytm-btn-primary';
        playAll.innerHTML = `${ICON.play} Play All`;
        playAll.onclick = () => this._playTrack(album.tracks[0], album.tracks);
        actionRow.appendChild(playAll);

        const isAlbumSaved = album.tracks.length > 0 && album.tracks.every(t => t.videoId && this.libraryIds.has(t.videoId));
        const likeAlbumBtn = document.createElement('button');
        likeAlbumBtn.className = `ytm-btn ytm-btn-secondary ytm-like-album-btn${isAlbumSaved ? ' saved' : ''}`;
        likeAlbumBtn.innerHTML = `${isAlbumSaved ? ICON.heart : ICON.heartO} ${isAlbumSaved ? 'In Library' : 'Save Album'}`;
        likeAlbumBtn.onclick = () => this._toggleLikeAlbum(album, likeAlbumBtn, wrap);
        actionRow.appendChild(likeAlbumBtn);
      }

      wrap.appendChild(actionRow);

      const section = { title: null, items: album.tracks };
      const list = this._renderTrackSection(section, true);
      if (list) wrap.appendChild(list);

      this._setContent(wrap);
    },

    async _toggleLikeAlbum(album, btnEl, wrapEl) {
      if (!album.tracks?.length) return;
      const isCurrentlySaved = btnEl.classList.contains('saved');

      btnEl.disabled = true;
      btnEl.innerHTML = `${ICON.sync} ${isCurrentlySaved ? 'Removing...' : 'Saving...'}`;

      try {
        if (!isCurrentlySaved) {
          for (const t of album.tracks) {
            if (!t.videoId) continue;
            const dur = t.duration || videoDurationCache.get(t.videoId) || null;
            await this.api.library.addExternalTrack({
              title:       t.title,
              artist:      t.artist || album.artist || 'Unknown Artist',
              album:       album.title,
              duration:    dur || null,
              cover_url:   album.thumb || t.thumb || ytThumb(t.videoId),
              source_type: SOURCE_TYPE,
              external_id: t.videoId,
              liked:       false,
            });
            this.libraryIds.add(t.videoId);
          }
          btnEl.classList.add('saved');
          btnEl.innerHTML = `${ICON.heart} In Library`;
          this._toast(`Album "${album.title}" added to Library`);
        } else {
          const libTracks = await this.api.library?.getTracks?.() || [];
          for (const t of album.tracks) {
            if (!t.videoId) continue;
            this.libraryIds.delete(t.videoId);
            const matched = libTracks.find(lt => lt.source_type === SOURCE_TYPE && lt.external_id === t.videoId);
            if (matched && typeof this.api.library?.removeTrack === 'function') {
              await this.api.library.removeTrack(matched.id);
            }
          }
          btnEl.classList.remove('saved');
          btnEl.innerHTML = `${ICON.heartO} Save Album`;
          this._toast(`Album "${album.title}" removed from Library`);
        }

        if (wrapEl) {
          wrapEl.querySelectorAll('.ytm-track').forEach(row => {
            const vid = row.dataset.id;
            const inLib = this.libraryIds.has(vid);
            const saveBtn = row.querySelector('.ytm-save-btn-row');
            if (saveBtn) {
              saveBtn.classList.toggle('saved', inLib);
              saveBtn.innerHTML = inLib ? ICON.heart : ICON.heartO;
              saveBtn.title = inLib ? 'In Library' : 'Add to Library';
            }
          });
        }
      } catch (err) {
        console.warn(`${PLUGIN_LABEL} toggleLikeAlbum failed:`, err);
        this._toast(`Error saving album: ${err.message}`);
        btnEl.innerHTML = `${ICON.heartO} Save Album`;
      } finally {
        btnEl.disabled = false;
      }
    },

    async _loadPlaylist(browseId) {
      this._setSkeleton();
      try {
        const cached = this._browseCache.get(`playlist:${browseId}`);
        const playlist = cached || await API.getPlaylist(browseId, (u, o) => this._apiFetch(u, o));
        if (!cached) this._browseCache.set(`playlist:${browseId}`, playlist);
        this._currentNavState = { type: 'playlist', id: browseId, title: playlist.title || 'Playlist' };
        document.getElementById('ytm-panel-title').textContent = this._currentNavState.title;
        this._renderPlaylistPage(playlist);
      } catch (e) {
        this._setContent(this._emptyEl('⚠️', `Failed to load playlist: ${e.message}`));
      }
    },

    _renderPlaylistPage(playlist) {
      const wrap = document.createElement('div');

      const hero = document.createElement('div');
      hero.className = 'ytm-hero';
      hero.innerHTML = `
        ${playlist.thumb ? `<img class="ytm-hero-img" src="${esc(playlist.thumb)}" onerror="this.remove()">` : ''}
        <div class="ytm-hero-info">
          <div class="ytm-hero-title">${esc(playlist.title)}</div>
          <div class="ytm-hero-sub">${esc(playlist.owner || '')}</div>
        </div>
      `;
      wrap.appendChild(hero);

      const actionRow = document.createElement('div');
      actionRow.className = 'ytm-action-row';

      if (playlist.tracks?.length) {
        const playAll = document.createElement('button');
        playAll.className = 'ytm-btn ytm-btn-primary';
        playAll.innerHTML = `${ICON.play} Play All`;
        playAll.onclick = () => this._playTrack(playlist.tracks[0], playlist.tracks);
        actionRow.appendChild(playAll);

        const isPlaylistSaved = playlist.tracks.length > 0 && playlist.tracks.every(t => t.videoId && this.libraryIds.has(t.videoId));
        const likePlaylistBtn = document.createElement('button');
        likePlaylistBtn.className = `ytm-btn ytm-btn-secondary ytm-like-playlist-btn${isPlaylistSaved ? ' saved' : ''}`;
        likePlaylistBtn.innerHTML = `${isPlaylistSaved ? ICON.heart : ICON.heartO} ${isPlaylistSaved ? 'In Library' : 'Save Playlist'}`;
        likePlaylistBtn.onclick = () => this._toggleLikePlaylist(playlist, likePlaylistBtn, wrap);
        actionRow.appendChild(likePlaylistBtn);
      }

      wrap.appendChild(actionRow);

      const section = { title: null, items: playlist.tracks };
      const list = this._renderTrackSection(section);
      if (list) wrap.appendChild(list);

      if (playlist.continuationToken) {
        const loadMoreRow = document.createElement('div');
        loadMoreRow.style.cssText = 'padding: 16px; text-align: center;';
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'ytm-btn ytm-btn-secondary';
        loadMoreBtn.innerHTML = `${ICON.sync} Load More Tracks`;
        loadMoreBtn.onclick = async () => {
          loadMoreBtn.disabled = true;
          loadMoreBtn.innerHTML = `${ICON.sync} Loading…`;
          try {
            const full = await API.getPlaylistAllTracks(playlist.browseId, (u, o) => this._apiFetch(u, o));
            this._browseCache.set(`playlist:${playlist.browseId}`, full);
            this._renderPlaylistPage(full);
          } catch (e) {
            this._toast(`Failed to load more: ${e.message}`);
            loadMoreBtn.disabled = false;
            loadMoreBtn.innerHTML = `${ICON.sync} Load More Tracks`;
          }
        };
        loadMoreRow.appendChild(loadMoreBtn);
        wrap.appendChild(loadMoreRow);
      }

      this._setContent(wrap);
    },

    async _toggleLikePlaylist(playlist, btnEl, wrapEl) {
      if (!playlist.tracks?.length) return;
      btnEl.disabled = true;
      btnEl.innerHTML = `${ICON.sync} Saving…`;

      try {
        const res = await this._importTracksToLibrary(
          playlist.title,
          playlist.thumb || null,
          playlist.tracks,
          ({ current, total }) => {
            btnEl.innerHTML = `${ICON.sync} Saving ${current}/${total}…`;
          }
        );

        btnEl.classList.add('saved');
        btnEl.innerHTML = `${ICON.heart} In Library`;
        this._toast(`Playlist "${playlist.title}" saved to Library (${res.imported} tracks)`);

        if (wrapEl) {
          wrapEl.querySelectorAll('.ytm-track').forEach(row => {
            const vid = row.dataset.id;
            const inLib = this.libraryIds.has(vid);
            const saveBtn = row.querySelector('.ytm-save-btn-row');
            if (saveBtn) {
              saveBtn.classList.toggle('saved', inLib);
              saveBtn.innerHTML = inLib ? ICON.heart : ICON.heartO;
              saveBtn.title = inLib ? 'In Library' : 'Add to Library';
            }
          });
        }
      } catch (err) {
        console.warn(`${PLUGIN_LABEL} toggleLikePlaylist failed:`, err);
        this._toast(`Error saving playlist: ${err.message}`);
        btnEl.innerHTML = `${ICON.heartO} Save Playlist`;
      } finally {
        btnEl.disabled = false;
      }
    },

    async _loadWatchPlaylist(videoId, playlistId) {
      this._setSkeleton();
      try {
        const tracks = await API.getWatchPlaylist(videoId, playlistId, (u, o) => this._apiFetch(u, o));
        if (!tracks.length) return this._setContent(this._emptyEl('🎵', 'No tracks found'));
        const section = { title: 'Related tracks', items: tracks };
        const list = this._renderTrackSection(section);
        this._setContent(list || this._emptyEl('🎵', 'No tracks found'));
      } catch (e) {
        this._setContent(this._emptyEl('⚠️', `Failed to load: ${e.message}`));
      }
    },

    async _loadWatchPlaylistIntoQueue(videoId, playlistId) {
      try {
        const tracks = await API.getWatchPlaylist(videoId, playlistId, (u, o) => this._apiFetch(u, o));
        // Skip first track (it's the one already playing), queue the rest
        const rest = tracks.slice(1).filter(t => t.videoId).map(t => {
          const qId = Math.abs(t.videoId.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0) | 0, 0)) || Date.now();
          return {
            id:          qId,
            title:       t.title,
            artist:      t.artist || '',
            album:       t.album || '',
            duration:    t.duration || null,
            cover_url:   t.thumb || ytThumb(t.videoId),
            source_type: SOURCE_TYPE,
            external_id: t.videoId,
            path:        `${SOURCE_TYPE}://${t.videoId}`,
            stream_url:  null,
          };
        });
        if (rest.length && typeof this.api.player.addToQueue === 'function') {
          this.api.player.addToQueue(rest);
        }
      } catch (e) {
        console.warn(`${PLUGIN_LABEL} watch playlist queue load failed:`, e.message);
      }
    },

    // ─── Playback ──────────────────────────────────────────────────────────────

    async _playTrack(track, queue = []) {
      if (!track?.videoId) return;
      this._toast(`Loading "${track.title}"…`);

      try {
        // Resolve stream and proxy through Rust → blob: URL to bypass CORS.
        const rawStreamUrl = await resolveStream(track.videoId, (u, o) => this._apiFetch(u, o));
        if (!rawStreamUrl) throw new Error('Stream resolution returned null');

        let finalUrl = rawStreamUrl;
        if (typeof this.api.fetchBlob === 'function') {
          try {
            const mime = rawStreamUrl.includes('webm') ? 'audio/webm' : 'audio/mp4';
            finalUrl = await this.api.fetchBlob(rawStreamUrl, mime);
          } catch (blobErr) {
            console.warn(`${PLUGIN_LABEL} fetchBlob failed, using raw URL:`, blobErr);
          }
        }

        const exactDuration = track.duration || videoDurationCache.get(track.videoId) || null;

        // Build clean queue array
        const queueItems = (Array.isArray(queue) && queue.length > 0) ? queue : [track];
        const fullQueue = queueItems.filter(t => t.videoId).map(t => {
          const qId = Math.abs(t.videoId.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0) | 0, 0)) || Date.now();
          const isTarget = t.videoId === track.videoId;
          return {
            id:          qId,
            title:       t.title,
            artist:      t.artist || '',
            album:       t.album || '',
            duration:    t.duration || (isTarget ? exactDuration : null),
            cover_url:   t.thumb || ytThumb(t.videoId),
            source_type: SOURCE_TYPE,
            external_id: t.videoId,
            path:        `${SOURCE_TYPE}://${t.videoId}`,
            stream_url:  isTarget ? finalUrl : null,
          };
        });

        const startIndex = Math.max(0, fullQueue.findIndex(t => t.external_id === track.videoId));

        if (typeof this.api.player.playQueue === 'function') {
          await this.api.player.playQueue(fullQueue, startIndex, {
            type: SOURCE_TYPE,
            name: track.title,
          });
        } else {
          await this.api.player.setTrack(fullQueue[startIndex]);
        }

        this._playingVideoId = track.videoId;
        this._updatePlayingHighlight();
      } catch (e) {
        console.error(`${PLUGIN_LABEL} playback failed:`, e);
        this._toast(`Playback failed: ${e.message}`);
      }
    },

    async _saveTrack(track, rowEl) {
      try {
        const isSaved = this.libraryIds.has(track.videoId);
        const btn = rowEl?.querySelector?.('.ytm-save-btn-row');

        if (isSaved) {
          const libTracks = await this.api.library?.getTracks?.() || [];
          const matched = libTracks.find(lt => lt.source_type === SOURCE_TYPE && lt.external_id === track.videoId);
          if (matched && typeof this.api.library?.removeTrack === 'function') {
            await this.api.library.removeTrack(matched.id);
          } else if (matched && typeof this.api.library?.deleteTrack === 'function') {
            await this.api.library.deleteTrack(matched.id);
          }
          this.libraryIds.delete(track.videoId);
          this._toast(`Removed "${track.title}" from Library`);
          if (btn) {
            btn.classList.remove('saved');
            btn.innerHTML = ICON.heartO;
            btn.title = 'Add to Library';
            btn.setAttribute('aria-label', 'Add to Library');
          }
        } else {
          let dur = track.duration || videoDurationCache.get(track.videoId) || null;
          if ((!dur || dur <= 0) && track.videoId) {
            try {
              const watchData = await API.getWatchPlaylist(track.videoId, null, (u, o) => this._apiFetch(u, o));
              if (watchData && watchData.length && watchData[0].duration > 0) {
                dur = watchData[0].duration;
                track.duration = dur;
                videoDurationCache.set(track.videoId, dur);
              }
            } catch (_) {}
          }
          if (dur && rowEl) {
            const durEl = rowEl.querySelector('.ytm-track-dur');
            if (durEl) durEl.textContent = fmtDuration(dur);
          }

          await this.api.library.addExternalTrack({
            title:       track.title,
            artist:      track.artist || 'Unknown Artist',
            album:       track.album  || '',
            duration:    dur || null,
            cover_url:   track.thumb || ytThumb(track.videoId),
            source_type: SOURCE_TYPE,
            external_id: track.videoId,
            liked:       false,
          });
          this.libraryIds.add(track.videoId);
          this._toast(`Added "${track.title}" to Library`);
          if (btn) {
            btn.classList.add('saved');
            btn.innerHTML = ICON.heart;
            btn.title = 'In Library';
            btn.setAttribute('aria-label', 'In Library');
          }
        }
      } catch (e) {
        this._toast(`Action failed: ${e.message}`);
      }
    },

    async _queueTrack(track, playNext = false) {
      if (!track?.videoId) return;
      const qId = Math.abs(track.videoId.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0) | 0, 0)) || Date.now();
      const trackObj = {
        id:          qId,
        title:       track.title,
        artist:      track.artist || '',
        album:       track.album || '',
        duration:    track.duration || null,
        cover_url:   track.thumb || ytThumb(track.videoId),
        source_type: SOURCE_TYPE,
        external_id: track.videoId,
        path:        `${SOURCE_TYPE}://${track.videoId}`,
        stream_url:  null,
      };

      if (typeof this.api.player.addToQueue === 'function') {
        this.api.player.addToQueue([trackObj]);
        this._toast(playNext ? `Playing next: "${track.title}"` : `Added to queue: "${track.title}"`);
      }
    },

    _updatePlayingHighlight() {
      document.querySelectorAll('#ytm-panel .ytm-track').forEach(el => {
        const isPlaying = el.dataset.id === this._playingVideoId;
        el.classList.toggle('playing', isPlaying);
        const ov = el.querySelector('.ytm-play-ov');
        if (ov) ov.innerHTML = isPlaying ? ICON.pause : ICON.play;
      });
    },

    // ─── Skeleton / Content helpers ────────────────────────────────────────────

    _setSkeleton() {
      const s = (w, h) => `<div class="ytm-skel" style="width:${w};height:${h};margin-bottom:4px;"></div>`;
      const row = `
        <div style="display:grid;grid-template-columns:48px 1fr;gap:10px;padding:6px 8px;align-items:center">
          ${s('48px','48px')}
          <div>${s('65%','13px')}${s('40%','11px')}</div>
        </div>`;
      const html = `
        <div class="ytm-section"><div class="ytm-skel" style="width:120px;height:14px;margin-bottom:12px;"></div>
          <div class="ytm-card-row">${Array(5).fill(`<div class="ytm-skel" style="width:122px;height:122px;border-radius:6px;flex-shrink:0;"></div>`).join('')}</div>
        </div>
        <div class="ytm-section"><div class="ytm-skel" style="width:100px;height:14px;margin-bottom:10px;"></div>
          <div class="ytm-track-list">${Array(6).fill(row).join('')}</div>
        </div>
      `;
      const el = document.createElement('div');
      el.innerHTML = html;
      this._setContent(el);
    },

    _setContent(el) {
      const c = document.getElementById('ytm-content');
      if (!c) return;
      c.innerHTML = '';
      if (el) c.appendChild(el);
    },

    _emptyEl(icon, msg) {
      const el = document.createElement('div');
      el.className = 'ytm-empty';
      el.innerHTML = `<div class="ytm-empty-icon">${icon}</div><div>${esc(msg)}</div>`;
      return el;
    },

    // ─── Toast ─────────────────────────────────────────────────────────────────
    _toastTimer: null,
    _toast(msg) {
      const el = document.getElementById('ytm-toast');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
    },
  };

  // ─── Bootstrap ───────────────────────────────────────────────────────────────
  if (typeof Audion !== 'undefined' && Audion.register) {
    Audion.register(YouTubeMusic);
  } else {
    window.YouTubeMusic = YouTubeMusic;
    window.AudionPlugin  = YouTubeMusic;
  }

})();

