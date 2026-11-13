// YouTube Music Plugin for Audion v1.5.0
// Client for YouTube Music: Personalized Home, Mood Feeds, Studio Prioritization, URL Import, and Spotify Playlist Converter.

(function () {
  'use strict';

  // Constants

  const SOURCE_TYPE       = 'youtube';
  const PLUGIN_ID         = 'youtube-music';
  const PLUGIN_LABEL      = '[YTMusic]';
  const SPOTIFY_API_BASE  = 'https://spotify-api-henna.vercel.app/api/playlist';

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

  // Editorial mood category tokens (bypasses unvetted regional community playlists)
  const HOME_VIBES = {
    for_you:   { label: 'For You' },
    chill:     { label: 'Chill',     params: 'ggMPOg1uX1JOQWZFeDByc2Jm' },
    focus:     { label: 'Focus',     params: 'ggMPOg1uX0NvNGNhWThMYWRh' },
    energize:  { label: 'Workout',   params: 'ggMPOg1uX2lRZUZiMnNrQnJW' },
    feel_good: { label: 'Feel Good', params: 'ggMPOg1uXzZQbDB5eThLRTQ3' },
    commute:   { label: 'Commute',   params: 'ggMPOg1uX044Z2o5WERLckpU' },
    party:     { label: 'Party',     params: 'ggMPOg1uXzY3UGd5eTFzV2R1' },
  };

  // SVG Icons

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
    shuffle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`,
    alert:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    settings:`<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    import:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
    link:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    check:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    wand:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 4-2 4 4 2-4-2-2-4Z"/><path d="m3 21 9-9"/><path d="M12.2 6.8 4 15l2 2 8.2-8.2Z"/></svg>`,
    spotify: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 4.32-1.38 9.841-.719 13.44 1.56.42.3.6.84.3 1.26zm.12-3.36C14.939 8.46 8.641 8.28 5.1 9.421c-.6.18-1.26-.12-1.441-.72-.18-.6.12-1.26.72-1.44 4.08-1.26 11.04-1.02 15.361 1.56.6.358.779 1.14.421 1.74-.359.6-1.14.779-1.741.419z"/></svg>`,
    upload:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
    stop:    `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>`,
  };

  // Helpers

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

    // Google image CDN (Fife / ggpht)
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

    // YouTube image CDN
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
      artist: artist || rawArtist || ''
    };
  }

  const canonicalMetaCache = new Map();

  async function fetchCanonicalMetadata(title, artist, apiFetch) {
    const query = `${artist} ${title}`.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const cacheKey = query.toLowerCase();
    if (canonicalMetaCache.has(cacheKey)) return canonicalMetaCache.get(cacheKey);

    // iTunes search API fallback
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

    // Deezer API fallback
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

    if (/^(VL)?(PL|OLAK5uy_|RD|UU|FL|LL)[a-zA-Z0-9_-]+$/.test(str)) {
      const listId = str.startsWith('VL') ? str.slice(2) : str;
      return { type: 'playlist', listId, browseId: `VL${listId}` };
    }
    if (/^MPREb_[a-zA-Z0-9_-]+$/.test(str)) {
      return { type: 'album', browseId: str };
    }
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

  // Spotify converter helpers

  function parseSpotifyUrl(urlOrUri, allowBareId = false) {
    if (!urlOrUri || typeof urlOrUri !== 'string') return null;
    const str = urlOrUri.trim();

    const uriMatch = str.match(/^spotify:playlist:([a-zA-Z0-9]+)(?:\?.*)?$/i);
    if (uriMatch) {
      return {
        type: 'spotify-playlist',
        playlistId: uriMatch[1],
        url: `https://open.spotify.com/playlist/${uriMatch[1]}`,
      };
    }

    if (allowBareId && !/[/:.\s]/.test(str.split('?')[0])) {
      const bareMatch = str.match(/^([a-zA-Z0-9]{15,32})(?:\?.*)?$/);
      if (bareMatch) {
        return {
          type: 'spotify-playlist',
          playlistId: bareMatch[1],
          url: `https://open.spotify.com/playlist/${bareMatch[1]}`,
        };
      }
    }

    try {
      const candidate = /^[a-zA-Z]+:\/\//.test(str) ? str : `https://${str}`;
      const u = new URL(candidate);
      const host = u.hostname.toLowerCase();
      if (!host.includes('spotify.com')) return null;

      const plMatch = u.pathname.match(/\/playlist\/([a-zA-Z0-9]+)/i);
      if (plMatch) {
        return { type: 'spotify-playlist', playlistId: plMatch[1], url: str };
      }

      if (/\/(track|album|artist)\/[a-zA-Z0-9]+/i.test(u.pathname)) {
        return { type: 'spotify-unsupported', url: str };
      }
    } catch (_) {
      return null;
    }

    return null;
  }

  function parseDurationToMs(timeStr) {
    if (!timeStr) return 0;
    if (typeof timeStr === 'number') {
      if (!Number.isFinite(timeStr) || timeStr <= 0) return 0;
      return timeStr > 3600 ? Math.round(timeStr) : Math.round(timeStr * 1000);
    }
    try {
      const parts = String(timeStr).trim().split(':').map(p => parseInt(p, 10));
      if (parts.some(isNaN)) return 0;
      if (parts.length === 3) return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
      if (parts.length === 2) return (parts[0] * 60 + parts[1]) * 1000;
      if (parts.length === 1) return parts[0] * 1000;
    } catch (_) {}
    return 0;
  }

  function normalizeMatchStr(str) {
    if (!str) return '';
    return String(str)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\(\[]\s*(?:feat|ft)\.?\s+[^)\]]+[\)\]]/gi, ' ')
      .replace(/\b(?:feat|ft)\.?\s+[^,-]+/gi, ' ')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeSpotifyTracks(tracks) {
    if (!Array.isArray(tracks)) return [];
    const out = [];
    for (const item of tracks) {
      const t = (item && item.track && typeof item.track === 'object') ? item.track : item;
      if (!t || typeof t !== 'object') continue;
      const rawTitle = (t.songTitle || t.title || t.name || '').trim();
      if (!rawTitle) continue;
      const artist = Array.isArray(t.artist)
        ? t.artist.join(', ')
        : Array.isArray(t.artists)
          ? t.artists.map(a => typeof a === 'string' ? a : (a?.name || '')).filter(Boolean).join(', ')
          : (t.artist || t.artist_name || 'Unknown');
      const album = (t.album && typeof t.album === 'object') ? (t.album.name || null) : (t.album || null);
      const durMs = (typeof t.duration_ms === 'number' && t.duration_ms > 0)
        ? Math.round(t.duration_ms)
        : parseDurationToMs(t.duration || t.durationMs || 0);
      out.push({
        title: rawTitle,
        artist: artist || 'Unknown',
        album,
        duration_ms: durMs,
        cover_url: t.image || t.cover_url || t.cover || null,
        isrc: t.isrc || t.external_ids?.isrc || null,
      });
    }
    return out;
  }

  function normalizeSpotifyJson(json) {
    if (Array.isArray(json)) {
      const tracks = normalizeSpotifyTracks(json);
      return {
        title: 'JSON Import',
        description: `Imported ${tracks.length} tracks`,
        owner: null,
        image: tracks.find(t => t.cover_url)?.cover_url || null,
        tracks,
      };
    }
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON format');
    }
    const rawTracks = Array.isArray(json.tracks)
      ? json.tracks
      : Array.isArray(json.tracks?.items)
        ? json.tracks.items
        : Array.isArray(json.items)
          ? json.items
          : null;
    if (!rawTracks) {
      throw new Error('JSON file does not contain a tracks array');
    }
    const tracks = normalizeSpotifyTracks(rawTracks);
    return {
      title: json.title || json.name || 'JSON Import',
      description: json.description || '',
      owner: (typeof json.owner === 'object' ? (json.owner?.display_name || json.owner?.id) : json.owner) || null,
      image: json.image || json.cover_url || json.cover || (Array.isArray(json.images) ? json.images[0]?.url : null) || null,
      tracks,
    };
  }

  function buildSpotifySearchQuery(title, artist) {
    let qTitle = String(title || '')
      .replace(/[\(\[]\s*(?:feat|ft)\.?\s+[^)\]]+[\)\]]/gi, '')
      .replace(/\s+[-–]\s+(?:remaster(?:ed)?(?:\s+\d{4})?|\d{4}\s+remaster(?:ed)?|radio\s+edit|album\s+version|single\s+version|explicit|clean)$/i, '')
      .replace(/\s*[\(\[]\s*(?:remaster(?:ed)?(?:\s+\d{4})?|\d{4}\s+remaster(?:ed)?)\s*[\)\]]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!qTitle) qTitle = String(title || '').trim();

    let primaryArtist = '';
    if (artist && !/^(unknown|unknown artist|various|various artists)$/i.test(artist.trim())) {
      primaryArtist = artist.split(',')[0].trim();
    }
    return `${qTitle} ${primaryArtist}`.trim();
  }

  function scoreYtmCandidate(spotifyTrack, candidate) {
    if (!candidate || !candidate.videoId) return -Infinity;

    const targetTitleNorm = normalizeMatchStr(spotifyTrack.title);
    const targetCleanBase = normalizeMatchStr(buildSpotifySearchQuery(spotifyTrack.title, ''));
    const candTitleNorm = normalizeMatchStr(candidate.title);
    const rawArtist = (spotifyTrack.artist && !/^(unknown|unknown artist)$/i.test(spotifyTrack.artist))
      ? spotifyTrack.artist
      : '';
    const targetArtistNorm = normalizeMatchStr(rawArtist ? rawArtist.split(',')[0] : '');
    const allSpotifyArtistsNorm = normalizeMatchStr(rawArtist);
    const candArtistNorm = normalizeMatchStr(candidate.artist || '');

    let score = 0;
    let titleMatched = false;

    if (targetTitleNorm && candTitleNorm) {
      if (candTitleNorm === targetTitleNorm || (targetCleanBase && candTitleNorm === targetCleanBase)) {
        score += 50;
        titleMatched = true;
      } else if (
        candTitleNorm.includes(targetTitleNorm) ||
        targetTitleNorm.includes(candTitleNorm) ||
        (targetCleanBase && (candTitleNorm.includes(targetCleanBase) || targetCleanBase.includes(candTitleNorm)))
      ) {
        score += 36;
        titleMatched = true;
      } else {
        const tWords = new Set((targetCleanBase || targetTitleNorm).split(' ').filter(Boolean));
        const cWords = new Set(candTitleNorm.split(' ').filter(Boolean));
        let overlap = 0;
        for (const w of tWords) if (cWords.has(w)) overlap++;
        const recall = tWords.size > 0 ? overlap / tWords.size : 0;
        if (overlap > 0) {
          score += Math.round(recall * 30);
          titleMatched = recall >= 0.4;
        } else {
          score -= 35;
        }
      }
    }

    const derivativeTerms = ['karaoke', 'tribute', 'cover', '8d audio', 'slowed', 'nightcore', 'instrumental', 'sped up'];
    const rawTargetLower = (spotifyTrack.title || '').toLowerCase();
    const rawCandLower = `${candidate.title || ''} ${candidate.subtitle || ''}`.toLowerCase();
    for (const term of derivativeTerms) {
      if (rawCandLower.includes(term) && !rawTargetLower.includes(term)) {
        score -= 25;
        break;
      }
    }

    let artistMatched = false;
    if (targetArtistNorm) {
      if (candArtistNorm && (candArtistNorm === targetArtistNorm || candArtistNorm === allSpotifyArtistsNorm)) {
        score += 32;
        artistMatched = true;
      } else if (
        candArtistNorm &&
        candArtistNorm.length > 1 &&
        (candArtistNorm.includes(targetArtistNorm) ||
          targetArtistNorm.includes(candArtistNorm) ||
          allSpotifyArtistsNorm.includes(candArtistNorm))
      ) {
        score += 26;
        artistMatched = true;
      } else {
        const aWords = targetArtistNorm.split(' ').filter(w => w.length > 1);
        const cHaystack = `${candArtistNorm} ${candTitleNorm}`;
        let aOverlap = 0;
        for (const w of aWords) if (cHaystack.includes(w)) aOverlap++;
        if (aWords.length > 0 && aOverlap > 0) {
          score += Math.round((aOverlap / aWords.length) * 20);
          artistMatched = aOverlap / aWords.length >= 0.5;
        } else {
          score -= 22;
        }
      }
    }

    if (candidate.musicVideoType === 'MUSIC_VIDEO_TYPE_ATV') {
      score += 24;
    } else if (candidate.isSong && !candidate.isVideo) {
      score += 18;
    } else if (candidate.isVideo) {
      score -= 15;
    }

    const targetSec = spotifyTrack.duration_ms > 0 ? Math.round(spotifyTrack.duration_ms / 1000) : 0;
    if (targetSec > 0 && candidate.duration > 0) {
      const diff = Math.abs(targetSec - candidate.duration);
      if (diff <= 3) score += 20;
      else if (diff <= 8) score += 14;
      else if (diff <= 15) score += 6;
      else if (diff > 45) score -= 20;
    }

    if (!titleMatched && !artistMatched) return -50;
    return score;
  }

  async function fetchSpotifyPlaylistFromAPI(playlistId, apiFetch, opts = {}) {
    const { signal, onPage, onLog } = opts;
    const limit = 100;
    let offset = 0;
    let allTracks = [];
    let playlistMeta = null;
    let total = 0;
    let page = 1;

    while (true) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const url = `${SPOTIFY_API_BASE}/${encodeURIComponent(playlistId)}?limit=${limit}&offset=${offset}`;
      const response = await apiFetch(url, signal ? { signal } : {});
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (!response) {
        throw new Error('Spotify API error: Network failure');
      }
      if (!response.ok) {
        let errDetail = '';
        if (typeof response.json === 'function') {
          try {
            const errJson = await response.json();
            if (errJson?.error) errDetail = errJson.error;
          } catch (_) {}
        }
        throw new Error(errDetail || `Spotify API error: ${response.status || 'Request failed'}`);
      }
      const json = await response.json();
      if (!json?.success || !json?.data) {
        throw new Error(json?.error || 'Invalid Spotify API response');
      }
      const data = json.data;

      if (!playlistMeta) {
        playlistMeta = {
          title: data.name || 'Spotify Import',
          description: data.description || '',
          image: data.image || null,
          owner: data.owner || null,
        };
        total = data.total || 0;
      }

      const rawTracks = Array.isArray(data.tracks) ? data.tracks : [];
      const pageTracks = normalizeSpotifyTracks(rawTracks);
      allTracks = allTracks.concat(pageTracks);

      onLog?.(`Page ${page}: ${pageTracks.length} tracks (${allTracks.length}/${total || allTracks.length})`, 'info');
      onPage?.({ ...playlistMeta, total: total || allTracks.length, tracks: allTracks });

      if (!data.next || rawTracks.length === 0 || (total > 0 && allTracks.length >= total)) {
        if (total > 0 && allTracks.length < total) {
          onLog?.(`Fetched ${allTracks.length} of ${total} tracks before pagination ended`, 'warn');
        }
        break;
      }
      offset += limit;
      page++;
    }

    return { ...playlistMeta, total: total || allTracks.length, tracks: allTracks };
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

  // In-memory cache

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

  // InnerTube network client

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

  // Parsers

  // Recursively collect section renderers to handle nesting changes.
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

    for (const key of Object.keys(obj)) {
      if (key === '_raw') continue;
      collectSections(obj[key], depth + 1, out);
    }
    return out;
  }

  function classifyMusicItem(item, parsed = {}) {
    if (!item) return { musicVideoType: null, isSong: false, isVideo: false, itemKind: 'other' };

    const twoRow = item.musicTwoRowItemRenderer;
    const listItem = item.musicResponsiveListItemRenderer;
    const card = item.musicCardShelfRenderer;

    let mType = null;
    if (twoRow) {
      const nav = twoRow.navigationEndpoint;
      mType = (nav?.watchEndpoint || nav?.watchPlaylistEndpoint)?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig?.musicVideoType;
    } else if (listItem) {
      const overlayEndpoint = listItem.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint;
      const col0Nav = listItem.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint;
      mType = (overlayEndpoint?.watchEndpoint || col0Nav?.watchEndpoint || listItem.navigationEndpoint?.watchEndpoint)
        ?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig?.musicVideoType;
    } else if (card) {
      const playBtn = card.buttons?.find(b => b.musicPlayButtonRenderer)?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint;
      mType = (playBtn || card.onTap?.watchEndpoint || card.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint)
        ?.watchEndpointMusicSupportedConfigs?.watchEndpointMusicConfig?.musicVideoType;
    }

    let isSong = false;
    let isVideo = false;

    if (mType === 'MUSIC_VIDEO_TYPE_ATV' || mType === 'MUSIC_VIDEO_TYPE_OFFICIAL_SOURCE_MUSIC') {
      isSong = true;
    } else if (mType === 'MUSIC_VIDEO_TYPE_OMV' || mType === 'MUSIC_VIDEO_TYPE_UGC' || mType === 'MUSIC_VIDEO_TYPE_PODCAST_EPISODE') {
      isVideo = true;
    } else if (parsed?.album || parsed?.isVerifiedArtist) {
      isSong = true;
    } else {
      const sub = (parsed?.subtitle || '').toLowerCase();
      if (sub.startsWith('song') || /\bplays\b/i.test(sub)) {
        isSong = true;
      } else if (sub.startsWith('video') || /\bviews\b/i.test(sub)) {
        isVideo = true;
      }
    }

    const itemKind = isSong ? 'song' : isVideo ? 'video' : (parsed?.pageType?.includes('ARTIST') ? 'artist' : parsed?.pageType?.includes('ALBUM') ? 'album' : 'other');

    return { musicVideoType: mType || null, isSong, isVideo, itemKind };
  }

  function parseMusicItem(item) {
    if (!item) return null;

    const twoRow = item.musicTwoRowItemRenderer;
    if (twoRow) {
      const title = getText(twoRow.title);
      if (!title) return null;

      const thumbThumbnails =
        twoRow.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        twoRow.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        twoRow.thumbnailRenderer?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails;
      const thumb = bestThumb(thumbThumbnails);

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

      const kind = classifyMusicItem(item, { subtitle, pageType });

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
        return {
          title: cleaned.title,
          artist: cleaned.artist,
          thumb,
          browseId,
          videoId,
          playlistId,
          subtitle,
          pageType,
          duration,
          musicVideoType: kind.musicVideoType,
          isSong: kind.isSong,
          isVideo: kind.isVideo,
          itemKind: kind.itemKind,
        };
      }
      return {
        title,
        thumb,
        browseId,
        videoId,
        playlistId,
        subtitle,
        pageType,
        duration,
        musicVideoType: kind.musicVideoType,
        isSong: kind.isSong,
        isVideo: kind.isVideo,
        itemKind: kind.itemKind,
      };
    }

    const listItem = item.musicResponsiveListItemRenderer;
    if (listItem) {
      const cols  = listItem.flexColumns || [];
      const col0  = cols[0]?.musicResponsiveListItemFlexColumnRenderer?.text;
      const col1  = cols[1]?.musicResponsiveListItemFlexColumnRenderer?.text;
      const col2  = cols[2]?.musicResponsiveListItemFlexColumnRenderer?.text;
      const col3  = cols[3]?.musicResponsiveListItemFlexColumnRenderer?.text;

      let title = getText(col0);
      if (!title) return null;

      const overlayEndpoint =
        listItem.overlay?.musicItemThumbnailOverlayRenderer?.content
          ?.musicPlayButtonRenderer?.playNavigationEndpoint;
      const col0Run0Nav = col0?.runs?.[0]?.navigationEndpoint;

      const videoId =
        listItem.playlistItemData?.videoId ||
        overlayEndpoint?.watchEndpoint?.videoId ||
        col0Run0Nav?.watchEndpoint?.videoId;

      const navEndpoint = listItem.navigationEndpoint || col0Run0Nav;
      const browseId = navEndpoint?.browseEndpoint?.browseId || col0Run0Nav?.browseEndpoint?.browseId;
      const pageType = navEndpoint?.browseEndpoint
                         ?.browseEndpointContextSupportedConfigs
                         ?.browseEndpointContextMusicConfig?.pageType ||
                       col0Run0Nav?.browseEndpoint
                         ?.browseEndpointContextSupportedConfigs
                         ?.browseEndpointContextMusicConfig?.pageType;

      const thumb = bestThumb(
        listItem.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
        listItem.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails
      ) || (videoId ? ytThumb(videoId, 'hqdefault') : null);

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

      const cleaned = cleanTitleAndArtist(title, artist, isVerifiedArtist ? 'MUSIC_PAGE_TYPE_ARTIST' : (pageType || 'MUSIC_PAGE_TYPE_USER_CHANNEL'), !!videoId);
      title = cleaned.title;
      artist = cleaned.artist;

      const isExplicit = !!(listItem.badges?.some(b =>
        b.musicInlineBadgeRenderer?.icon?.iconType === 'MUSIC_EXPLICIT_BADGE'
      ));

      const subText = cols.map(c => getText(c?.musicResponsiveListItemFlexColumnRenderer?.text)).join(' • ');
      const kind = classifyMusicItem(item, { subtitle: subText, album, isVerifiedArtist, pageType });

      return {
        title,
        artist,
        album,
        artistBrowseId,
        albumBrowseId,
        thumb,
        videoId,
        browseId,
        pageType,
        duration,
        isExplicit,
        musicVideoType: kind.musicVideoType,
        isSong: kind.isSong,
        isVideo: kind.isVideo,
        itemKind: kind.itemKind,
      };
    }

    return null;
  }

  // YouTube Music API

  const API = {

    async search(query, apiFetch, filter = null) {
      // filter: 'songs' | 'videos' | 'albums' | 'artists' | 'playlists' | null (all)
      const params = {
        songs:     'EgWKAQIIAWoKEAoQBRAJEAMQBA%3D%3D',
        videos:    'EgWKAQIQAWoKEAoQBRAJEAMQBA%3D%3D',
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

    async getMoodCategory(params, apiFetch) {
      const data = await ytmPost('browse', {
        browseId: 'FEmusic_moods_and_genres_category',
        params,
      }, apiFetch);
      return parseBrowse(data);
    },

    async getNewReleases(apiFetch) {
      const data = await ytmPost('browse', {
        browseId: 'FEmusic_new_releases',
      }, apiFetch);
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
    const officialSongs = [];
    const videos = [];
    const entities = [];
    let rawHeroCard = null;

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

        const cardKind = classifyMusicItem(c, { subtitle, pageType });
        const cardTracks = (card.contents || []).map(parseMusicItem).filter(Boolean);

        rawHeroCard = {
          _type: 'card-hero',
          title: 'Top Result',
          item: {
            title: heroTitle,
            subtitle,
            thumb,
            browseId,
            pageType,
            videoId,
            artist: cardArtist,
            duration: cardDuration,
            musicVideoType: cardKind.musicVideoType,
            isSong: cardKind.isSong,
            isVideo: cardKind.isVideo,
            itemKind: cardKind.itemKind,
          },
          items: cardTracks,
        };
      } else if (c.itemSectionRenderer) {
        for (const itemWrapper of (c.itemSectionRenderer.contents || [])) {
          const parsed = parseMusicItem(itemWrapper);
          if (parsed) {
            if (parsed.videoId) {
              if (parsed.isSong && !parsed.isVideo) {
                officialSongs.push(parsed);
              } else if (parsed.isVideo) {
                videos.push(parsed);
              } else if (parsed.album || parsed.artistBrowseId) {
                officialSongs.push(parsed);
              } else {
                videos.push(parsed);
              }
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

    // Promote top studio song to hero result when original hero is a video
    if (rawHeroCard) {
      const isCardArtist = rawHeroCard.item.pageType?.includes('ARTIST') || rawHeroCard.item.browseId?.startsWith('UC');
      const isCardAlbum = rawHeroCard.item.pageType?.includes('ALBUM') || rawHeroCard.item.browseId?.startsWith('MPRE');

      if (!isCardArtist && !isCardAlbum && rawHeroCard.item.isVideo && officialSongs.length > 0) {
        const promotedSong = officialSongs[0];
        if (!videos.some(v => v.videoId === rawHeroCard.item.videoId)) {
          videos.unshift(rawHeroCard.item);
        }
        for (const it of rawHeroCard.items) {
          if (it.isVideo && !videos.some(v => v.videoId === it.videoId)) {
            videos.push(it);
          }
        }

        sections.push({
          _type: 'card-hero',
          title: 'Top Result',
          item: {
            ...promotedSong,
            subtitle: `Song • ${promotedSong.artist}${promotedSong.album ? ' • ' + promotedSong.album : ''}`,
            isSong: true,
            isVideo: false,
          },
          items: officialSongs.slice(1, 5),
        });
      } else {
        sections.push(rawHeroCard);
      }
    }

    if (officialSongs.length) {
      sections.push({ title: 'Songs', items: officialSongs, _type: 'shelf' });
    }
    if (entities.length) {
      sections.push({ title: 'Albums, Artists & Playlists', items: entities, _type: 'carousel' });
    }
    if (videos.length) {
      sections.push({ title: 'Videos', items: videos, _type: 'shelf' });
    }

    return sections.length ? sections : collectSections(data);
  }

  function parseBrowse(data) {
    const raw = collectSections(data);
    return raw.filter(sec => {
      const title = (sec.title || '').toLowerCase();
      if (title.includes('community playlist') || title.includes('trending community')) return false;
      return true;
    });
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
          if (item.videoId && (!item.artist || item.artist === 'Unknown Artist' || isStatOrType(item.artist))) {
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
      const filtered = subRuns.filter(r => r.navigationEndpoint?.browseEndpoint).map(r => r.text).join('');
      if (filtered && !isStatOrType(filtered)) {
        artist = filtered;
        artistBrowseId = artistRun?.navigationEndpoint?.browseEndpoint?.browseId || null;
      }
    }
    if (!artist || isStatOrType(artist)) {
      const desc = data?.microformat?.microformatDataRenderer?.description || '';
      const parts = desc.split('•').map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (!isStatOrType(p)) {
          artist = p;
          break;
        }
      }
    }

    const year = subRuns.find(r => /^\d{4}$/.test(r.text?.trim()))?.text;
    const thumb = bestThumb(
      header?.thumbnail?.croppedSquareThumbnailRenderer?.thumbnail?.thumbnails ||
      header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails ||
      data?.microformat?.microformatDataRenderer?.thumbnail?.thumbnails
    );

    const sections = collectSections(data);
    const trackSection = sections.find(s => s.items.some(i => i.videoId));
    const tracks = (trackSection?.items || []).map((p, idx) => {
      const hasSpecificArtist = p.artist && p.artist !== 'Unknown Artist' && !isStatOrType(p.artist);
      const trackArtist = hasSpecificArtist ? p.artist : (artist || 'Unknown Artist');
      const trackArtistBrowseId = hasSpecificArtist ? (p.artistBrowseId || null) : (artistBrowseId || null);

      return {
        ...p,
        trackNumber: idx + 1,
        artist: trackArtist,
        album: title || p.album,
        albumArtist: artist || p.albumArtist || 'Unknown Artist',
        thumb: p.thumb || (p.videoId ? ytThumb(p.videoId, 'hqdefault') : null) || thumb,
        artistBrowseId: trackArtistBrowseId,
      };
    });
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
    const sections = collectSections(data);
    const trackSection = sections.find(s => s.items.some(i => i.videoId));
    const tracks = (trackSection?.items || []).map(p => {
      let trackArtist = (p.artist && p.artist !== 'Unknown Artist' && !isStatOrType(p.artist)) ? p.artist : '';
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

  // Stream resolution

  const videoDurationCache = new Map();

  async function resolveStream(videoId, apiFetch) {
    const INNERTUBE_BASE = 'https://www.youtube.com/youtubei/v1';

    // InnerTube un-ciphered clients
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

    // Piped fallback
    if (!rawStreamUrl) {
      try {
        const { data } = await tryInstances(PIPED_INSTANCES, base => `${base}/streams/${videoId}`, apiFetch);
        if (data?.duration > 0) videoDurationCache.set(videoId, data.duration);
        const u = pickBestAudioPiped(data.audioStreams || []);
        if (u) { console.log(`${PLUGIN_LABEL} stream via Piped`); rawStreamUrl = u; }
      } catch (e) { console.warn(`${PLUGIN_LABEL} Piped:`, e.message); }
    }

    // Invidious fallback
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

    // Prefer dedicated audio streams
    const audio = formats.filter(f => f.url && f.mimeType?.startsWith('audio/') && !f.width && !f.height);
    if (audio.length) {
      const m4a  = audio.filter(f => f.mimeType.includes('mp4') || f.mimeType.includes('m4a'));
      const pool = m4a.length ? m4a : audio;
      pool.sort((a, b) => (b.bitrate || b.averageBitrate || 0) - (a.bitrate || a.averageBitrate || 0));
      return pool[0]?.url || null;
    }

    // Fall back to muxed MP4 containers (Audion plays audio directly)
    const muxed = formats.filter(f => f.url && (f.mimeType?.includes('video/mp4') || f.mimeType?.includes('audio')));
    if (muxed.length) {
      muxed.sort((a, b) => (b.audioQuality === 'AUDIO_QUALITY_MEDIUM' ? 1 : 0) - (a.audioQuality === 'AUDIO_QUALITY_MEDIUM' ? 1 : 0));
      return muxed[0]?.url || null;
    }

    // Any available plain URL
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

  // Styles

  const CSS = `
    /* Design Tokens */
    :root {
      --ytm-red: #ff0033;
      --ytm-red-hover: #e6002e;
      --ytm-red-subtle: rgba(255, 0, 51, 0.12);
    }

    /* Root container */
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
      .ytm-header { gap: 6px; padding: 10px 12px; }
    }

    /* Header */
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

    /* Tabs nav */
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

    /* Search bar */
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

    /* Home vibe chips */
    .ytm-vibe-row {
      display: flex; gap: 8px; padding: 10px 16px; flex-shrink: 0;
      overflow-x: auto; scrollbar-width: none; background: var(--bg-elevated, #181818);
      border-bottom: 1px solid var(--border-color, #2a2a2a);
    }
    .ytm-vibe-row::-webkit-scrollbar { display: none; }
    .ytm-vibe-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: var(--radius-full, 9999px);
      font-size: var(--font-size-xs, 12px); font-weight: 500;
      cursor: pointer; white-space: nowrap; transition: all var(--transition-fast, 150ms ease);
      border: 1px solid var(--border-color, #404040);
      background: rgba(255, 255, 255, 0.05); color: var(--text-secondary, #c8c8c8);
    }
    .ytm-vibe-pill:hover { border-color: var(--text-secondary, #c8c8c8); color: var(--text-primary, #ffffff); background: rgba(255, 255, 255, 0.09); }
    .ytm-vibe-pill.active { background: var(--ytm-red, #ff0033); border-color: var(--ytm-red, #ff0033); color: #ffffff; font-weight: 600; }

    /* Shortcuts grid */
    .ytm-shortcuts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
      padding: 16px 16px 8px;
    }
    .ytm-shortcut-card {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--bg-surface, #282828);
      border: 1px solid var(--border-color, #383838);
      border-radius: var(--radius-md, 8px);
      padding: 10px 14px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: background var(--transition-fast, 150ms ease), border-color var(--transition-fast, 150ms ease), transform var(--transition-fast, 150ms ease);
    }
    .ytm-shortcut-card:hover {
      background: var(--bg-elevated, #333333);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-1px);
    }
    .ytm-shortcut-thumb {
      width: 48px;
      height: 48px;
      border-radius: var(--radius-sm, 6px);
      object-fit: cover;
      flex-shrink: 0;
      background: var(--bg-base, #1c1c1c);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: #fff;
    }
    .ytm-shortcut-thumb.circle {
      border-radius: 50%;
    }
    .ytm-shortcut-info {
      flex: 1;
      min-width: 0;
    }
    .ytm-shortcut-title {
      font-size: var(--font-size-sm, 13px);
      font-weight: 600;
      color: var(--text-primary, #ffffff);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ytm-shortcut-sub {
      font-size: 11px;
      color: var(--text-subdued, #8e8e8e);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .ytm-shortcut-play-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--ytm-red, #ff0033);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      flex-shrink: 0;
      opacity: 0;
      transform: scale(0.85);
      transition: all var(--transition-fast, 150ms ease);
    }
    .ytm-shortcut-card:hover .ytm-shortcut-play-btn,
    .ytm-shortcut-card:focus-within .ytm-shortcut-play-btn {
      opacity: 1;
      transform: scale(1);
    }
    .ytm-shortcut-play-btn:hover {
      background: var(--ytm-red-hover, #e6002e);
      transform: scale(1.08);
    }

    /* Vibe tiles */
    .ytm-vibe-tiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 12px;
      padding: 0 16px 16px;
    }
    .ytm-vibe-tile {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: flex-end;
      height: 76px;
      padding: 12px;
      border-radius: var(--radius-md, 8px);
      cursor: pointer;
      font-weight: 700;
      font-size: 13px;
      color: #ffffff;
      transition: transform var(--transition-fast, 150ms ease), filter var(--transition-fast, 150ms ease);
      position: relative;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .ytm-vibe-tile:hover {
      transform: translateY(-2px);
      filter: brightness(1.1);
    }
    .ytm-vibe-tile-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: -0.1px;
    }
    .ytm-vibe-tile-desc {
      font-size: 11px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Content */
    .ytm-content {
      flex: 1; overflow-y: auto; overflow-x: hidden;
      background: var(--bg-base, #121212);
    }
    .ytm-content::-webkit-scrollbar { width: 6px; }
    .ytm-content::-webkit-scrollbar-thumb { background: var(--border-color, #404040); border-radius: 3px; }

    /* Sections */
    .ytm-section { padding: 18px 16px 8px; }
    .ytm-section-title {
      font-size: var(--font-size-base, 14px); font-weight: 700; color: var(--text-primary, #ffffff);
      margin: 0 0 12px; letter-spacing: -0.1px;
    }

    /* Cards */
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

    /* Track list */
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
    .ytm-video-badge { font-size: 9px; font-weight: 700; background: rgba(255, 255, 255, 0.12); color: var(--text-secondary, #aaa); padding: 1px 4px; border-radius: 2px; margin-left: 6px; text-transform: uppercase; letter-spacing: 0.3px; }

    /* Top Result hero */
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

    /* Action buttons */
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

    /* Entity links */
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

    /* Skeleton */
    .ytm-skel { background: var(--bg-surface, #282828); border-radius: var(--radius-sm, 4px); display: block; animation: ytm-pulse 1.4s infinite; }
    @keyframes ytm-pulse { 0%, 100% { opacity: 0.35 } 50% { opacity: 0.65 } }

    /* Empty state */
    .ytm-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 60px 24px; gap: 12px; color: var(--text-subdued, #8e8e8e); font-size: 13px; text-align: center;
    }
    .ytm-empty-icon { font-size: 24px; color: var(--text-subdued, #8e8e8e); display: flex; align-items: center; justify-content: center; }

    /* Toast */
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

    /* Playerbar button */
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

    /* Artist/album hero */
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

    /* Settings */
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

    /* Import modal */
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

    /* URL detected card */
    .ytm-url-detected-card {
      margin: 12px 18px; padding: 16px; background: var(--bg-surface, #242424);
      border: 1px solid var(--ytm-red, #ff0033); border-radius: var(--radius-md, 8px);
      display: flex; flex-direction: column; gap: 10px;
    }
    .ytm-url-detected-card.spotify { border-color: #1db954; }
    .ytm-url-badge { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--ytm-red, #ff0033); text-transform: uppercase; letter-spacing: 0.5px; }
    .ytm-url-badge.spotify { color: #1ed760; }
    .ytm-url-detected-title { font-size: 16px; font-weight: 700; color: #fff; }
    .ytm-url-detected-desc { font-size: 12px; color: var(--text-secondary, #bbb); word-break: break-all; font-family: monospace; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px; }
    .ytm-url-detected-actions { display: flex; gap: 8px; margin-top: 4px; }

    /* Spotify converter inside import modal */
    .ytm-import-tabs {
      display: flex; gap: 4px; padding: 0 24px;
      border-bottom: 1px solid var(--border-color, #333333);
      background: var(--bg-elevated, #181818); flex-shrink: 0;
    }
    .ytm-import-tab {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 10px 14px; font-size: var(--font-size-xs, 12px); font-weight: 600;
      color: var(--text-secondary, #c8c8c8); cursor: pointer;
      background: none; border: none; border-bottom: 2px solid transparent;
      transition: color var(--transition-fast, 150ms ease), border-color var(--transition-fast, 150ms ease);
      white-space: nowrap;
    }
    .ytm-import-tab:hover { color: var(--text-primary, #ffffff); }
    .ytm-import-tab.active { color: var(--text-primary, #ffffff); border-bottom-color: var(--ytm-red, #ff0033); }
    .ytm-import-tab:disabled { opacity: 0.45; cursor: not-allowed; }
    .ytm-import-tab[data-import-mode="spotify"] svg { color: #1ed760; }
    .ytm-import-modal-spotify #ytm-import-modal-logo { color: #1ed760; }

    #ytm-import-pane-youtube, #ytm-import-pane-spotify {
      display: flex; flex-direction: column; gap: 14px;
    }
    .ytm-sp-clear-btn {
      position: absolute; right: 8px; width: 24px; height: 24px; border-radius: 4px;
      background: rgba(255,255,255,0.08); border: none; color: #c8c8c8; cursor: pointer;
      display: flex; align-items: center; justify-content: center; font-size: 12px;
      transition: background var(--transition-fast, 150ms ease), color var(--transition-fast, 150ms ease);
    }
    .ytm-sp-clear-btn:hover { background: rgba(255,255,255,0.16); color: #fff; }
    .ytm-sp-input-pad { padding-right: 36px !important; }
    .ytm-sp-upload-row {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 2px;
    }
    .ytm-sp-upload-btn {
      display: inline-flex; align-items: center; gap: 7px;
      padding: 6px 12px; min-height: 32px; box-sizing: border-box;
      background: var(--bg-surface, #282828); border: 1px dashed var(--border-color, #484848);
      border-radius: var(--radius-sm, 6px); color: var(--text-secondary, #c8c8c8);
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: border-color var(--transition-fast, 150ms ease), color var(--transition-fast, 150ms ease), background var(--transition-fast, 150ms ease);
    }
    .ytm-sp-upload-btn:hover {
      border-color: var(--text-secondary, #c8c8c8); color: #ffffff; background: var(--bg-highlight, #343434);
    }
    .ytm-sp-pill {
      display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; min-height: 32px; box-sizing: border-box;
      background: var(--bg-surface, #282828); border: 1px solid var(--border-color, #484848);
      border-radius: var(--radius-sm, 6px); max-width: 100%;
    }
    .ytm-sp-pill-icon { color: #22c55e; display: flex; flex-shrink: 0; }
    .ytm-sp-pill-text { font-size: 12px; color: var(--text-primary, #ffffff); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ytm-sp-pill-remove {
      background: transparent; border: none; border-radius: 4px; color: var(--text-secondary, #c8c8c8);
      cursor: pointer; padding: 2px 5px; font-size: 12px; display: flex; align-items: center; justify-content: center;
    }
    .ytm-sp-pill-remove:hover { background: rgba(239, 68, 68, 0.25); color: #fca5a5; }
    .ytm-sp-help-btn {
      background: none; border: none; padding: 4px 6px; margin-left: auto; cursor: pointer;
      color: var(--text-secondary, #c8c8c8); font-size: 12px; font-weight: 600; text-decoration: underline;
    }
    .ytm-sp-help-btn:hover { color: #ffffff; }
    .ytm-sp-help-box {
      background: var(--bg-base, #141414); border: 1px solid var(--border-color, #333333);
      border-radius: var(--radius-sm, 6px); padding: 10px 14px; font-size: 12px;
      color: var(--text-secondary, #c8c8c8); line-height: 1.65;
    }
    .ytm-sp-help-box strong { color: #ffffff; }
    .ytm-sp-help-box a { color: #60a5fa; font-weight: 600; }
    .ytm-sp-help-box ol { margin: 6px 0 0 18px; padding: 0; }
    .ytm-sp-error {
      background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.35);
      border-radius: var(--radius-md, 8px); padding: 10px 14px; font-size: 12px;
      color: #fca5a5; display: flex; align-items: center; gap: 8px;
    }
    .ytm-sp-thumb-placeholder {
      width: 90px; height: 90px; border-radius: var(--radius-md, 8px);
      background: var(--bg-base, #161616); border: 1px solid var(--border-color, #383838);
      display: flex; align-items: center; justify-content: center; color: #1ed760; flex-shrink: 0;
    }
    .ytm-sp-priority-badge {
      display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 999px;
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
      background: var(--ytm-red-subtle, rgba(255, 0, 51, 0.14)); color: #ff8596;
      border: 1px solid rgba(255, 0, 51, 0.35);
    }
    .ytm-sp-row-art-fallback {
      width: 34px; height: 34px; border-radius: 4px; background: #2c2c2c; color: var(--text-subdued, #8e8e8e);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .ytm-sp-row-badge {
      display: inline-block; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
      padding: 1px 5px; border-radius: 4px; vertical-align: middle; margin-left: 5px;
    }
    .ytm-sp-row-badge.added { background: rgba(34, 197, 94, 0.18); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.35); }
    .ytm-sp-row-badge.lib { background: rgba(245, 158, 11, 0.18); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.35); }
    .ytm-sp-row-badge.miss { background: rgba(239, 68, 68, 0.18); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.35); }
    .ytm-sp-prog-hdr { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .ytm-sp-prog-label { font-size: 12px; font-weight: 600; color: var(--text-primary, #ffffff); }
    .ytm-sp-prog-pct { font-size: 13px; font-weight: 700; color: var(--text-primary, #ffffff); font-variant-numeric: tabular-nums; }
    .ytm-sp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .ytm-sp-stat { border-radius: var(--radius-sm, 6px); padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; background: var(--bg-base, #121212); border: 1px solid var(--border-color, #2f2f2f); }
    .ytm-sp-stat-val { font-size: 18px; font-weight: 700; line-height: 1.1; font-variant-numeric: tabular-nums; }
    .ytm-sp-stat.green .ytm-sp-stat-val { color: #22c55e; }
    .ytm-sp-stat.amber .ytm-sp-stat-val { color: #fbbf24; }
    .ytm-sp-stat.red .ytm-sp-stat-val { color: #f87171; }
    .ytm-sp-stat-lbl { font-size: 11px; font-weight: 600; color: var(--text-secondary, #c8c8c8); }
    .ytm-sp-log-card {
      background: var(--bg-base, #121212); border: 1px solid var(--border-color, #2f2f2f);
      border-radius: var(--radius-sm, 6px); display: flex; flex-direction: column; overflow: hidden;
    }
    .ytm-sp-log-hdr {
      padding: 6px 10px; border-bottom: 1px solid var(--border-color, #2a2a2a);
      font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #a0a0a0;
    }
    .ytm-sp-log-wrap { max-height: 130px; overflow-y: auto; padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; }
    .ytm-sp-log-wrap::-webkit-scrollbar { width: 4px; }
    .ytm-sp-log-wrap::-webkit-scrollbar-thumb { background: var(--border-color, #404040); border-radius: 3px; }
    .ytm-sp-log-line { display: flex; align-items: baseline; gap: 8px; font-size: 11.5px; line-height: 1.45; }
    .ytm-sp-log-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; background: #737373; }
    .ytm-sp-log-msg { color: var(--text-secondary, #c8c8c8); word-break: break-word; }
    .ytm-sp-log-line.success .ytm-sp-log-dot { background: #22c55e; }
    .ytm-sp-log-line.success .ytm-sp-log-msg { color: #86efac; }
    .ytm-sp-log-line.warn .ytm-sp-log-dot { background: #fbbf24; }
    .ytm-sp-log-line.warn .ytm-sp-log-msg { color: #fde68a; }
    .ytm-sp-log-line.error .ytm-sp-log-dot { background: #f87171; }
    .ytm-sp-log-line.error .ytm-sp-log-msg { color: #fca5a5; }
    .ytm-sp-log-line.info .ytm-sp-log-dot { background: #60a5fa; }
    .ytm-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }
    @media (max-width: 600px) {
      .ytm-import-body { padding: 14px 16px; }
      .ytm-import-tabs { padding: 0 16px; }
      .ytm-import-hero { flex-direction: column; align-items: flex-start; gap: 12px; }
      .ytm-import-actions-bar { flex-direction: column; align-items: stretch; }
      .ytm-import-action-buttons { flex-wrap: wrap; }
    }

    /* Utilities */
    .hidden { display: none !important; }
    .ytm-badge-new { background: var(--ytm-red, #ff0033); color: #fff; font-size: 9px; font-weight: 800; padding: 1px 5px; border-radius: 3px; margin-left: 5px; }
  `;

  // Plugin object

  const YouTubeMusic = {
    api:        null,
    _API:       API,
    _Spotify: {
      parseSpotifyUrl,
      parseDurationToMs,
      normalizeMatchStr,
      normalizeSpotifyTracks,
      normalizeSpotifyJson,
      buildSpotifySearchQuery,
      scoreYtmCandidate,
      fetchSpotifyPlaylistFromAPI,
    },
    isOpen:     false,
    libraryIds: new Set(),
    _searchTimer: null,
    _currentQuery: '',
    _navStack: [],   // navigation history: [{ type, id, query, filter, tab, title }]
    _currentNavState: { type: 'tab', tab: 'home', title: 'YouTube Music' },
    _currentView: null,
    _currentData: null,
    _currentTitle: 'YouTube Music',
    _searchFilter: 'songs', // default to 'songs' to prioritize studio music
    _activeTab: 'home',
    _activeHomeVibe: 'for_you',
    _recentPlayed: [],
    _playingVideoId: null,
    _searchCache: new MemCache(5 * 60 * 1000),   // 5 min
    _browseCache:  new MemCache(10 * 60 * 1000),  // 10 min
    _importAbortController: null,
    _fixAbortController: null,
    _importedData: null,
    _selectedTrackIndices: new Set(),
    _spotifySelectedIndices: new Set(),
    _spotifyTracksData: [],
    _importMode: 'youtube',
    _spotifyTrackCache: new Map(),
    _spotifyState: {
      isConverting: false,
      stopRequested: false,
      abortController: null,
      importedData: null,
      fetchedUrl: '',
      sourceKind: null,
      isHelpOpen: false,
    },

    config: {
      pipedInstances: [...PIPED_INSTANCES],
      invidiousInstances: [...INVIDIOUS_INSTANCES],
      preferredQuality: 'best', // 'best' | 'low'
      preferStudioAudio: true, // auto-switch videos to studio audio tracks
    },

    // Init

    async init(api) {
      this.api     = api;

      await this._loadConfig();
      await this._loadPlayHistory();
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
          if (typeof p.preferStudioAudio === 'boolean') this.config.preferStudioAudio = p.preferStudioAudio;
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

    // Play history & personalization helpers

    async _loadPlayHistory() {
      try {
        const raw = await this.api.storage?.get?.('ytm_recent_played');
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            this._recentPlayed = list;
          }
        }
      } catch (e) { /* ignore */ }
    },

    async _recordPlayHistory(track) {
      if (!track || !track.videoId) return;
      try {
        const item = {
          videoId: track.videoId,
          title: track.title,
          artist: track.artist || '',
          album: track.album || '',
          thumb: track.thumb || ytThumb(track.videoId),
          duration: track.duration || 0,
          isSong: true,
          playedAt: Date.now(),
        };
        this._recentPlayed = [
          item,
          ...this._recentPlayed.filter(t => t.videoId !== track.videoId)
        ].slice(0, 20);

        await this.api.storage?.set?.('ytm_recent_played', JSON.stringify(this._recentPlayed));
      } catch (e) { /* ignore */ }
    },

    async _analyzeLibrary() {
      try {
        const tracks = await this.api.library?.getTracks?.() || [];
        if (!tracks.length) return { topArtists: [], totalTracks: 0, tracks: [] };

        const artistCounts = new Map();
        for (const t of tracks) {
          const a = (t.artist || '').trim();
          if (!a || /^(unknown artist|various artists|various)$/i.test(a)) continue;
          artistCounts.set(a, (artistCounts.get(a) || 0) + 1);
        }

        const sortedArtists = [...artistCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));

        return {
          topArtists: sortedArtists.slice(0, 6),
          totalTracks: tracks.length,
          tracks,
        };
      } catch (e) {
        return { topArtists: [], totalTracks: 0, tracks: [] };
      }
    },

    async _shuffleLibraryTracks() {
      try {
        const tracks = await this.api.library?.getTracks?.() || [];
        if (!tracks.length) {
          this._toast('Your Audion library is empty. Save some tracks first!');
          return;
        }

        const shuffled = [...tracks];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        if (typeof this.api.player?.playQueue === 'function') {
          await this.api.player.playQueue(shuffled, 0, {
            type: 'library_shuffle',
            name: 'Shuffle Library',
          });
          this._toast(`Shuffling ${shuffled.length} tracks from your library`);
        } else if (typeof this.api.player?.setTrack === 'function') {
          await this.api.player.setTrack(shuffled[0]);
          this._toast(`Playing "${shuffled[0].title}"`);
        }
      } catch (e) {
        console.error(`${PLUGIN_LABEL} shuffle library error:`, e);
        this._toast('Failed to shuffle library');
      }
    },

    async _searchAndOpenArtist(artistName) {
      if (!artistName) return;
      this._setSkeleton();
      try {
        const res = await API.search(artistName, (u, o) => this._apiFetch(u, o), 'artists');
        const artistItem = res?.find(s => s.items?.length)?.items?.[0] || res?.[0]?.items?.[0];
        if (artistItem?.browseId) {
          this._pushNav(artistItem.title || artistName, () => this._loadArtist(artistItem.browseId), null);
        } else {
          this._switchTab('search');
          const input = document.getElementById('ytm-search-input');
          if (input) input.value = artistName;
          this._performSearch(artistName);
        }
      } catch (_) {
        this._switchTab('search');
        const input = document.getElementById('ytm-search-input');
        if (input) input.value = artistName;
        this._performSearch(artistName);
      }
    },

    // Cross-plugin search source

    async _crossPluginSearch(query, onResult) {
      try {
        const q = `${query.title || ''} ${query.artist || ''}`.trim();
        if (!q) return onResult({ sourceId: SOURCE_TYPE, status: 'not_found' });
        const sections = await API.search(q, (u, o) => this._apiFetch(u, o), 'songs');
        const all = sections.flatMap(s => s.items).filter(i => i.videoId);
        if (!all.length) return onResult({ sourceId: SOURCE_TYPE, status: 'not_found' });
        const best = all.find(i => i.isSong && !i.isVideo) || all[0];
        onResult({
          sourceId: SOURCE_TYPE, status: 'success',
          title: best.title, artist: best.artist, duration: best.duration,
          cover_url: best.thumb, source_type: SOURCE_TYPE, external_id: best.videoId,
        });
      } catch (e) {
        onResult({ sourceId: SOURCE_TYPE, status: 'error', error: e });
      }
    },

    // Styles

    _injectStyles() {
      if (document.getElementById('ytm-styles')) return;
      const s = document.createElement('style');
      s.id = 'ytm-styles';
      s.textContent = CSS;
      document.head.appendChild(s);
    },

    // DOM construction

    _buildDOM() {
      if (document.getElementById('ytm-panel')) return;

      const ov = document.createElement('div');
      ov.id = 'ytm-overlay';
      ov.onclick = () => this.close();
      document.body.appendChild(ov);

      const toast = document.createElement('div');
      toast.id = 'ytm-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);

      const panel = document.createElement('div');
      panel.id = 'ytm-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', 'YouTube Music');
      panel.setAttribute('aria-modal', 'true');
      panel.innerHTML = `
        <div id="ytm-settings" role="region" aria-label="Settings">
          <div class="ytm-header">
            <div class="ytm-title">Settings</div>
            <button id="ytm-settings-close" class="ytm-icon-btn" title="Close settings" aria-label="Close settings">${ICON.close}</button>
          </div>
          <div class="ytm-settings-body" id="ytm-settings-body"></div>
        </div>

        <div id="ytm-import-modal" role="region" aria-label="Import Playlist">
          <div class="ytm-header">
            <div class="ytm-logo" id="ytm-import-modal-logo" aria-hidden="true">${ICON.import}</div>
            <div class="ytm-title" id="ytm-import-modal-title">Import Playlist</div>
            <button id="ytm-import-close" class="ytm-icon-btn" title="Close import" aria-label="Close import dialog">${ICON.close}</button>
          </div>
          <div class="ytm-import-tabs" role="tablist" aria-label="Import mode">
            <button class="ytm-import-tab active" data-import-mode="youtube" role="tab" aria-selected="true">${ICON.ytmusic} YouTube URL</button>
            <button class="ytm-import-tab" data-import-mode="spotify" role="tab" aria-selected="false">${ICON.spotify} Spotify to YouTube</button>
          </div>
          <div class="ytm-import-body" id="ytm-import-body"></div>
        </div>

        <div class="ytm-header">
          <button id="ytm-back-btn" class="ytm-icon-btn hidden" title="Back" aria-label="Back">${ICON.back}</button>
          <div class="ytm-logo" aria-hidden="true">${ICON.ytmusic}</div>
          <div class="ytm-title" id="ytm-panel-title">YouTube Music</div>
          <button id="ytm-spotify-open" class="ytm-icon-btn" title="Spotify to YouTube Converter" aria-label="Convert Spotify playlist to YouTube Music">${ICON.spotify}</button>
          <button id="ytm-import-open" class="ytm-icon-btn" title="Import from URL" aria-label="Import playlist from URL">${ICON.import}</button>
          <button id="ytm-settings-open" class="ytm-icon-btn" title="Settings" aria-label="Settings">${ICON.settings}</button>
          <button id="ytm-close-btn" class="ytm-icon-btn" title="Close" aria-label="Close dialog">${ICON.close}</button>
        </div>

        <div class="ytm-tabs" id="ytm-tabs" role="tablist" aria-label="Browse sections">
          <button class="ytm-tab active" data-tab="home" role="tab" aria-selected="true">${ICON.home} Home</button>
          <button class="ytm-tab" data-tab="trending" role="tab" aria-selected="false">${ICON.trending} Trending</button>
          <button class="ytm-tab" data-tab="search" role="tab" aria-selected="false">${ICON.search} Search</button>
        </div>

        <div class="ytm-vibe-row" id="ytm-home-vibe-row" role="group" aria-label="Home vibes">
          <button class="ytm-vibe-pill active" data-vibe="for_you" aria-pressed="true">For You</button>
          <button class="ytm-vibe-pill" data-vibe="chill" aria-pressed="false">Chill</button>
          <button class="ytm-vibe-pill" data-vibe="focus" aria-pressed="false">Focus</button>
          <button class="ytm-vibe-pill" data-vibe="energize" aria-pressed="false">Workout</button>
          <button class="ytm-vibe-pill" data-vibe="feel_good" aria-pressed="false">Feel Good</button>
          <button class="ytm-vibe-pill" data-vibe="commute" aria-pressed="false">Commute</button>
          <button class="ytm-vibe-pill" data-vibe="party" aria-pressed="false">Party</button>
        </div>

        <div class="ytm-search-row hidden" id="ytm-search-row">
          <div class="ytm-search-wrap">
            <div class="ytm-search-icon" aria-hidden="true">${ICON.search}</div>
            <input type="text" id="ytm-search-input" class="ytm-search-input" placeholder="Search songs, albums, artists…" aria-label="Search YouTube Music" autocomplete="off">
          </div>
        </div>
        <div class="ytm-filter-row hidden" id="ytm-filter-row" role="group" aria-label="Search categories">
          <button class="ytm-chip" data-filter="" aria-pressed="false">All</button>
          <button class="ytm-chip active" data-filter="songs" aria-pressed="true">${ICON.music} Songs</button>
          <button class="ytm-chip" data-filter="albums" aria-pressed="false">${ICON.album} Albums</button>
          <button class="ytm-chip" data-filter="artists" aria-pressed="false">${ICON.artist} Artists</button>
          <button class="ytm-chip" data-filter="playlists" aria-pressed="false">${ICON.list} Playlists</button>
        </div>

        <div class="ytm-content" id="ytm-content" role="region" aria-label="Content"></div>
      `;
      document.body.appendChild(panel);
    },

    _buildSettingsBody() {
      const body = document.getElementById('ytm-settings-body');
      if (!body) return;

      body.innerHTML = `
        <p class="ytm-field-label">Audio & Music Preference</p>
        <label class="ytm-checkbox-label" style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-top:8px;font-size:13px;color:var(--text-primary,#fff);">
          <input type="checkbox" id="ytm-prefer-studio" ${this.config.preferStudioAudio !== false ? 'checked' : ''} style="cursor:pointer;accent-color:var(--ytm-red,#ff0033);width:16px;height:16px;">
          <span><strong>Prioritize Studio Audio</strong>: Auto-replace music videos with official album tracks</span>
        </label>
        <p class="ytm-field-hint" style="margin-top:4px;">When playing music videos or video links, automatically resolves to the studio album recording to avoid video dialogue, silence, and sound effects.</p>

        <hr class="ytm-divider">

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
        this.config.preferStudioAudio = document.getElementById('ytm-prefer-studio')?.checked ?? true;
        this.config.pipedInstances = [...document.querySelectorAll('#ytm-piped-list .ytm-text-input')].map(el => el.value.trim()).filter(Boolean);
        this.config.invidiousInstances = [...document.querySelectorAll('#ytm-inv-list .ytm-text-input')].map(el => el.value.trim()).filter(Boolean);
        await this._saveConfig();
        document.getElementById('ytm-settings')?.classList.remove('open');
        this._toast('Settings saved');
      };
    },

    // Import dialog

    _openImportModal(prefillUrl = '', mode = null) {
      const modal = document.getElementById('ytm-import-modal');
      if (!modal) return;

      const spInfo = prefillUrl ? parseSpotifyUrl(prefillUrl) : null;
      const targetMode = mode || (spInfo ? 'spotify' : 'youtube');

      // Preserve live UI if conversion is currently running unless explicitly finished
      if (this._spotifyState.isConverting) {
        modal.classList.add('open');
        this._setImportMode('spotify');
        return;
      }

      this._buildImportBody(targetMode);
      modal.classList.add('open');

      if (targetMode === 'spotify') {
        const spInput = document.getElementById('ytm-spotify-url-input');
        const spClear = document.getElementById('ytm-spotify-url-clear');
        if (spInput) {
          if (prefillUrl) {
            spInput.value = prefillUrl;
            spClear?.classList.remove('hidden');
            this._loadSpotifyUrl();
          } else {
            setTimeout(() => spInput.focus(), 80);
          }
        }
        return;
      }

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
      if (this._spotifyState.isConverting) {
        this._toast('Conversion in progress. Click Stop first to cancel.');
        return;
      }
      if (this._importAbortController) {
        this._importAbortController.abort();
        this._importAbortController = null;
      }
      if (this._fixAbortController) {
        this._fixAbortController.abort();
        this._fixAbortController = null;
      }
      if (this._spotifyState.abortController) {
        this._spotifyState.abortController.abort();
        this._spotifyState.abortController = null;
      }
      document.getElementById('ytm-import-modal')?.classList.remove('open');
    },

    _setImportMode(mode) {
      if (this._spotifyState.isConverting && mode !== 'spotify') {
        this._toast('Wait for conversion to finish or click Stop first.');
        return;
      }
      this._importMode = mode === 'spotify' ? 'spotify' : 'youtube';

      const modal = document.getElementById('ytm-import-modal');
      const logoEl = document.getElementById('ytm-import-modal-logo');
      const titleEl = document.getElementById('ytm-import-modal-title');
      const ytPane = document.getElementById('ytm-import-pane-youtube');
      const spPane = document.getElementById('ytm-import-pane-spotify');

      modal?.classList.toggle('ytm-import-modal-spotify', this._importMode === 'spotify');
      if (logoEl) logoEl.innerHTML = this._importMode === 'spotify' ? ICON.spotify : ICON.import;
      if (titleEl) titleEl.textContent = this._importMode === 'spotify' ? 'Spotify to YouTube Music' : 'Import Playlist from URL';

      ytPane?.classList.toggle('hidden', this._importMode !== 'youtube');
      spPane?.classList.toggle('hidden', this._importMode !== 'spotify');

      document.querySelectorAll('#ytm-import-modal .ytm-import-tab').forEach(tab => {
        const isActive = tab.dataset.importMode === this._importMode;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });
    },

    _buildImportBody(initialMode = 'youtube') {
      const body = document.getElementById('ytm-import-body');
      if (!body) return;

      this._spotifyTracksData = [];
      this._spotifySelectedIndices = new Set();
      this._spotifyState = {
        ...this._spotifyState,
        isConverting: false,
        stopRequested: false,
        abortController: null,
        importedData: null,
        fetchedUrl: '',
        sourceKind: null,
        isHelpOpen: false,
      };

      body.innerHTML = `
        <div id="ytm-import-pane-youtube">
          <div class="ytm-import-input-section">
            <label class="ytm-field-label" for="ytm-import-url-input">YouTube or YouTube Music URL</label>
            <div class="ytm-import-bar">
              <div class="ytm-import-input-wrap">
                <span class="ytm-import-link-icon" aria-hidden="true">${ICON.link}</span>
                <input type="text" id="ytm-import-url-input" class="ytm-text-input" placeholder="Paste YouTube, YTM, or Spotify playlist URL…" autocomplete="off">
              </div>
              <button type="button" id="ytm-import-paste-btn" class="ytm-btn ytm-btn-secondary" title="Paste from clipboard">Paste</button>
              <button type="button" id="ytm-import-fetch-btn" class="ytm-btn ytm-btn-primary">Fetch</button>
            </div>
            <p class="ytm-field-hint">Supports YouTube & YouTube Music playlist, album, and track links. Spotify playlist links switch automatically.</p>
          </div>
          <div id="ytm-import-content" class="ytm-import-content"></div>
        </div>

        <div id="ytm-import-pane-spotify" class="hidden">
          <div class="ytm-import-input-section">
            <label class="ytm-field-label" for="ytm-spotify-url-input">Spotify Playlist URL, ID, or JSON Backup</label>
            <div class="ytm-import-bar">
              <div class="ytm-import-input-wrap">
                <span class="ytm-import-link-icon" aria-hidden="true">${ICON.spotify}</span>
                <input type="text" id="ytm-spotify-url-input" class="ytm-text-input ytm-sp-input-pad" placeholder="Paste Spotify playlist URL or ID…" autocomplete="off">
                <button type="button" class="ytm-sp-clear-btn hidden" id="ytm-spotify-url-clear" title="Clear URL" aria-label="Clear Spotify URL">${ICON.close}</button>
              </div>
              <button type="button" id="ytm-spotify-paste-btn" class="ytm-btn ytm-btn-secondary" title="Paste from clipboard">Paste</button>
              <button type="button" id="ytm-spotify-fetch-btn" class="ytm-btn ytm-btn-primary">Fetch</button>
            </div>

            <div class="ytm-sp-upload-row">
              <label for="ytm-spotify-file" class="ytm-sp-upload-btn" id="ytm-spotify-json-label" tabindex="0" role="button" aria-label="Upload Spotify JSON backup file">
                ${ICON.upload}
                <span>Or upload JSON backup</span>
              </label>
              <input type="file" id="ytm-spotify-file" accept=".json,application/json" class="hidden">

              <div class="ytm-sp-pill hidden" id="ytm-spotify-pill">
                <span class="ytm-sp-pill-icon" aria-hidden="true">${ICON.check}</span>
                <span class="ytm-sp-pill-text" id="ytm-spotify-pill-text"></span>
                <button type="button" class="ytm-sp-pill-remove" id="ytm-spotify-pill-remove" aria-label="Remove uploaded JSON file" title="Remove file">${ICON.close}</button>
              </div>

              <button type="button" class="ytm-sp-help-btn" id="ytm-spotify-help-toggle" aria-expanded="false">Export help</button>
            </div>

            <p class="ytm-field-hint">Playlist must be <strong>public</strong>. Converter prioritizes official YouTube Music studio tracks and lets you fix metadata before converting.</p>

            <div class="ytm-sp-help-box hidden" id="ytm-spotify-help">
              <strong>Alternative method if automatic fetching fails:</strong>
              <ol>
                <li>Open <a href="https://spotify-api-henna.vercel.app/" target="_blank" rel="noopener noreferrer">spotify-api-henna.vercel.app</a></li>
                <li>Paste your Spotify playlist URL or ID, fetch it, and click <strong>Export All as JSON</strong></li>
                <li>Upload the <code>.json</code> file using <strong>Or upload JSON backup</strong> above</li>
              </ol>
            </div>
          </div>

          <div class="ytm-sp-error hidden" id="ytm-spotify-error" role="alert">
            <span aria-hidden="true" style="display:flex;flex-shrink:0;">${ICON.alert}</span>
            <span id="ytm-spotify-error-text"></span>
          </div>

          <div id="ytm-spotify-content" class="ytm-import-content"></div>
        </div>
      `;

      // Wire modal tabs
      document.querySelectorAll('#ytm-import-modal .ytm-import-tab').forEach(tab => {
        tab.onclick = () => this._setImportMode(tab.dataset.importMode);
      });

      // Wire YouTube pane controls
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

      document.getElementById('ytm-import-fetch-btn').onclick = () => {
        this._fetchImportUrl();
      };

      document.getElementById('ytm-import-url-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this._fetchImportUrl();
        }
      });

      // Wire Spotify pane controls
      const spInput = document.getElementById('ytm-spotify-url-input');
      const spClear = document.getElementById('ytm-spotify-url-clear');
      const spFile  = document.getElementById('ytm-spotify-file');
      const spJsonLabel = document.getElementById('ytm-spotify-json-label');
      const spHelpToggle = document.getElementById('ytm-spotify-help-toggle');

      document.getElementById('ytm-spotify-paste-btn').onclick = async () => {
        if (this._spotifyState.isConverting) return;
        try {
          if (navigator.clipboard?.readText) {
            const text = await navigator.clipboard.readText();
            if (text && spInput && !spInput.disabled) {
              spInput.value = text.trim();
              spClear?.classList.toggle('hidden', !spInput.value);
              this._loadSpotifyUrl();
            }
          } else {
            this._toast('Clipboard access not supported. Please paste manually (Ctrl+V).');
          }
        } catch (_) {
          this._toast('Could not read clipboard. Please paste manually (Ctrl+V).');
        }
      };

      spInput?.addEventListener('input', () => {
        const v = spInput.value.trim();
        spClear?.classList.toggle('hidden', !v);
        if (this._spotifyState.sourceKind === 'api' && v !== this._spotifyState.fetchedUrl) {
          this._spotifyState.importedData = null;
          this._spotifyState.fetchedUrl = '';
          this._spotifyState.sourceKind = null;
        }
        this._spotifyClearError();
      });

      spInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this._loadSpotifyUrl();
        }
      });

      spClear.onclick = () => {
        if (this._spotifyState.isConverting) return;
        if (spInput) spInput.value = '';
        spClear.classList.add('hidden');
        this._spotifyState.importedData = null;
        this._spotifyState.fetchedUrl = '';
        this._spotifyState.sourceKind = null;
        this._spotifyTracksData = [];
        this._spotifySelectedIndices = new Set();
        const spContent = document.getElementById('ytm-spotify-content');
        if (spContent) spContent.innerHTML = '';
        this._spotifyClearError();
        spInput?.focus();
      };

      document.getElementById('ytm-spotify-fetch-btn').onclick = () => {
        this._loadSpotifyUrl();
      };

      spFile?.addEventListener('change', (e) => this._handleSpotifyFileUpload(e));
      spJsonLabel?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          spFile?.click();
        }
      });
      document.getElementById('ytm-spotify-pill-remove').onclick = () => {
        if (!this._spotifyState.isConverting) this._clearSpotifyFile();
      };

      spHelpToggle.onclick = () => {
        const helpEl = document.getElementById('ytm-spotify-help');
        if (!helpEl) return;
        const open = !helpEl.classList.contains('hidden');
        helpEl.classList.toggle('hidden', open);
        this._spotifyState.isHelpOpen = !open;
        spHelpToggle.textContent = open ? 'Export help' : 'Hide help';
        spHelpToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
      };

      this._setImportMode(initialMode);
    },

    async _fetchImportUrl() {
      const input = document.getElementById('ytm-import-url-input');
      const val = input?.value.trim();
      const content = document.getElementById('ytm-import-content');
      if (!content) return;

      if (!val) {
        content.innerHTML = `<div class="ytm-empty" style="padding:24px 0;"><div class="ytm-empty-icon">${ICON.alert}</div><div class="ytm-empty-text">Please enter a YouTube link or ID.</div></div>`;
        return;
      }

      const spInfo = parseSpotifyUrl(val);
      if (spInfo) {
        this._setImportMode('spotify');
        const spInput = document.getElementById('ytm-spotify-url-input');
        const spClear = document.getElementById('ytm-spotify-url-clear');
        if (spInput) {
          spInput.value = val;
          spClear?.classList.remove('hidden');
        }
        this._loadSpotifyUrl();
        return;
      }

      const parsed = parseYouTubeUrl(val);
      if (!parsed) {
        content.innerHTML = `
          <div class="ytm-empty" style="padding:24px 0;">
            <div class="ytm-empty-icon">${ICON.alert}</div>
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
            <div class="ytm-empty-icon">${ICON.alert}</div>
            <div class="ytm-empty-text">Failed to fetch content: ${esc(err.message)}</div>
          </div>
        `;
      }
    },

    _renderImportResult(data) {
      const content = document.getElementById('ytm-import-content');
      if (!content || !data) return;

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

      const tracks = data.tracks || [];
      if (!tracks.length) {
        content.innerHTML = `
          <div class="ytm-empty" style="padding:24px 0;">
            <div class="ytm-empty-icon">${ICON.music}</div>
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

          <div id="ytm-import-progress-wrap" class="ytm-import-progress-wrap hidden">
            <div class="ytm-progress-bar-bg">
              <div id="ytm-import-progress-bar" class="ytm-progress-bar-fill" style="width: 0%;"></div>
            </div>
            <div class="ytm-import-progress-status">
              <span id="ytm-import-progress-text">Importing…</span>
              <button id="ytm-import-cancel-btn" class="ytm-btn ytm-btn-danger ytm-btn-sm">Cancel</button>
            </div>
          </div>

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

      content.querySelectorAll('.ytm-import-track-chk').forEach(c => {
        c.onchange = (e) => {
          const idx = parseInt(c.dataset.idx, 10);
          if (c.checked) this._selectedTrackIndices.add(idx);
          else this._selectedTrackIndices.delete(idx);
          if (selectAllEl) selectAllEl.checked = this._selectedTrackIndices.size === tracks.length;
          this._updateSelectedCount(tracks.length);
        };
      });

      const fixBtn = document.getElementById('ytm-import-fix-btn');
      if (fixBtn) {
        fixBtn.onclick = () => {
          this._fixImportMetadata(data);
        };
      }

      document.getElementById('ytm-import-play-btn').onclick = () => {
        const selected = tracks.filter((_, i) => this._selectedTrackIndices.has(i));
        if (!selected.length) {
          this._toast('Please select at least one track to play');
          return;
        }
        this._playTrack(selected[0], selected);
        this._closeImportModal();
      };

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
      const actionsBar   = document.querySelector('#ytm-import-content .ytm-import-actions-bar');
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

          const localCleaned = cleanTitleAndArtist(t.title, t.artist, 'MUSIC_PAGE_TYPE_USER_CHANNEL', true);
          let targetTitle = localCleaned.title;
          let targetArtist = localCleaned.artist;
          let targetCover = t.thumb || (t.videoId ? ytThumb(t.videoId, 'hqdefault') : null);

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

          t.title = targetTitle;
          t.artist = targetArtist;
          if (targetCover) t.thumb = targetCover;

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

          if (idx === 0 && targetCover) {
            const heroThumb = document.querySelector('#ytm-import-content .ytm-import-thumb');
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
      const actionsBar   = document.querySelector('#ytm-import-content .ytm-import-actions-bar');

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
          const trackArtist = (t.artist && t.artist !== 'Unknown Artist')
            ? t.artist
            : (t.albumArtist && t.albumArtist !== 'Unknown Artist'
                ? t.albumArtist
                : 'Unknown Artist');
          const trackId = await this.api.library.addExternalTrack({
            title:       t.title,
            artist:      trackArtist,
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

    // Spotify converter

    _spotifyShowError(msg) {
      const box = document.getElementById('ytm-spotify-error');
      const txt = document.getElementById('ytm-spotify-error-text');
      if (txt) txt.textContent = msg;
      box?.classList.remove('hidden');
    },

    _spotifyClearError() {
      document.getElementById('ytm-spotify-error')?.classList.add('hidden');
    },

    _spotifyLog(msg, type = 'info') {
      const log = document.getElementById('ytm-sp-log');
      if (!log) return;
      const line = document.createElement('div');
      line.className = `ytm-sp-log-line ${type}`;
      const dot = document.createElement('div');
      dot.className = 'ytm-sp-log-dot';
      const span = document.createElement('span');
      span.className = 'ytm-sp-log-msg';
      span.textContent = msg;
      line.appendChild(dot);
      line.appendChild(span);
      log.appendChild(line);
      log.scrollTop = log.scrollHeight;
    },

    _spotifyUpdateProgress(percent) {
      const p = Math.max(0, Math.min(100, Math.round(percent)));
      const fill = document.getElementById('ytm-sp-prog-fill');
      const pct  = document.getElementById('ytm-sp-prog-pct');
      const bar  = document.getElementById('ytm-sp-prog-bar');
      if (fill) fill.style.width = `${p}%`;
      if (pct) pct.textContent = `${p}%`;
      bar?.setAttribute('aria-valuenow', String(p));
    },

    _spotifyUpdateStats(added, inLibrary, notFound) {
      const nEl = document.getElementById('ytm-sp-stat-new');
      const lEl = document.getElementById('ytm-sp-stat-lib');
      const mEl = document.getElementById('ytm-sp-stat-miss');
      if (nEl) nEl.textContent = String(added);
      if (lEl) lEl.textContent = String(inLibrary);
      if (mEl) mEl.textContent = String(notFound);
    },

    _spotifySetStatus(text) {
      const txt = document.getElementById('ytm-sp-status-txt');
      if (txt) txt.textContent = text;
    },

    _renderSpotifyPreview(data) {
      const content = document.getElementById('ytm-spotify-content');
      if (!content || !data) return;

      const tracks = Array.isArray(data.tracks) ? data.tracks : [];
      if (!tracks.length) {
        this._spotifyTracksData = [];
        this._spotifySelectedIndices = new Set();
        content.innerHTML = `
          <div class="ytm-empty" style="padding:24px 0;">
            <div class="ytm-empty-icon">${ICON.music}</div>
            <div class="ytm-empty-text">No tracks found in this Spotify playlist.</div>
          </div>
        `;
        return;
      }

      this._spotifyTracksData = tracks;
      this._spotifySelectedIndices = new Set(tracks.map((_, i) => i));

      const totalSec = tracks.reduce((acc, t) => acc + (t.duration_ms > 0 ? Math.round(t.duration_ms / 1000) : 0), 0);
      const totalDurStr = totalSec > 0 ? fmtDuration(totalSec) : '';
      const thumb = data.image || tracks.find(t => t.cover_url)?.cover_url || '';
      const owner = data.owner || '';
      const totalCount = data.total || tracks.length;

      content.innerHTML = `
        <div class="ytm-import-card" id="ytm-spotify-preview">
          <div class="ytm-import-hero">
            <div id="ytm-spotify-prev-art">
              ${thumb
                ? `<img class="ytm-import-thumb" src="${esc(thumb)}" alt="" onerror="this.remove()">`
                : `<div class="ytm-sp-thumb-placeholder" aria-hidden="true">${ICON.spotify}</div>`
              }
            </div>
            <div class="ytm-import-info">
              <label class="ytm-field-label" for="ytm-spotify-title-input">Playlist Title (editable)</label>
              <input type="text" id="ytm-spotify-title-input" class="ytm-text-input ytm-import-title-input" value="${esc(data.title || 'Spotify Import')}">
              <div class="ytm-import-sub">
                ${owner ? `<span class="ytm-import-owner" id="ytm-spotify-prev-owner">${esc(owner)}</span><span class="ytm-dot">·</span>` : `<span class="ytm-import-owner hidden" id="ytm-spotify-prev-owner"></span>`}
                <span class="ytm-import-count" id="ytm-spotify-prev-count">${totalCount} tracks</span>
                ${totalDurStr ? `<span class="ytm-dot">·</span><span class="ytm-import-dur">${totalDurStr}</span>` : ''}
                <span class="ytm-dot">·</span>
                <span class="ytm-sp-priority-badge">${ICON.music} Studio Priority</span>
              </div>
            </div>
          </div>

          <div class="ytm-import-actions-bar" id="ytm-sp-actions-bar">
            <label class="ytm-checkbox-label" for="ytm-spotify-select-all">
              <input type="checkbox" id="ytm-spotify-select-all" checked>
              <span>Select All (<span id="ytm-sp-selected-count">${tracks.length}</span>)</span>
            </label>
            <div class="ytm-import-action-buttons">
              <button type="button" id="ytm-sp-fix-btn" class="ytm-btn ytm-btn-secondary" title="Fix artist, song title & fetch album cover art via iTunes/Deezer">
                ${ICON.wand} <span id="ytm-sp-fix-label">Fix All Metadata</span>
              </button>
              <button type="button" id="ytm-sp-convert" class="ytm-btn ytm-btn-primary">
                ${ICON.heart} <span id="ytm-sp-convert-label">Convert & Import</span>
              </button>
            </div>
          </div>

          <div id="ytm-sp-fix-progress-wrap" class="ytm-import-progress-wrap hidden">
            <div class="ytm-progress-bar-bg">
              <div id="ytm-sp-fix-progress-bar" class="ytm-progress-bar-fill" style="width: 0%;"></div>
            </div>
            <div class="ytm-import-progress-status">
              <span id="ytm-sp-fix-progress-text">Fixing metadata…</span>
              <button type="button" id="ytm-sp-cancel-fix-btn" class="ytm-btn ytm-btn-danger ytm-btn-sm">Cancel</button>
            </div>
          </div>

          <div id="ytm-spotify-progress-card" class="ytm-import-progress-wrap hidden">
            <div class="ytm-sp-prog-hdr">
              <span class="ytm-sp-prog-label" id="ytm-sp-prog-label">Matching studio tracks on YouTube Music…</span>
              <div style="display:flex;align-items:center;gap:10px;">
                <span class="ytm-sp-prog-pct" id="ytm-sp-prog-pct">0%</span>
                <button type="button" id="ytm-sp-stop" class="ytm-btn ytm-btn-danger ytm-btn-sm">Stop</button>
              </div>
            </div>
            <div class="ytm-progress-bar-bg" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="ytm-sp-prog-bar">
              <div class="ytm-progress-bar-fill" id="ytm-sp-prog-fill" style="width: 0%;"></div>
            </div>
            <div class="ytm-sp-stats">
              <div class="ytm-sp-stat green">
                <div class="ytm-sp-stat-val" id="ytm-sp-stat-new">0</div>
                <div class="ytm-sp-stat-lbl">Added</div>
              </div>
              <div class="ytm-sp-stat amber">
                <div class="ytm-sp-stat-val" id="ytm-sp-stat-lib">0</div>
                <div class="ytm-sp-stat-lbl">In Library</div>
              </div>
              <div class="ytm-sp-stat red">
                <div class="ytm-sp-stat-val" id="ytm-sp-stat-miss">0</div>
                <div class="ytm-sp-stat-lbl">Not Found</div>
              </div>
            </div>
            <div class="ytm-sp-log-card">
              <div class="ytm-sp-log-hdr" id="ytm-sp-status-txt">Ready</div>
              <div class="ytm-sp-log-wrap" id="ytm-sp-log" role="log" aria-live="polite"></div>
            </div>
          </div>

          <div class="ytm-import-track-list" id="ytm-sp-track-list">
            ${tracks.map((t, idx) => {
              const dur = t.duration_ms > 0 ? fmtDuration(Math.round(t.duration_ms / 1000)) : '';
              const sub = t.album ? `${t.artist || 'Unknown Artist'} · ${t.album}` : (t.artist || 'Unknown Artist');
              return `
                <div class="ytm-import-track-row" data-idx="${idx}">
                  <input type="checkbox" class="ytm-sp-track-chk" data-idx="${idx}" aria-label="Select ${esc(t.title)}" checked>
                  <span class="ytm-import-track-num">${idx + 1}</span>
                  ${t.cover_url
                    ? `<img class="ytm-import-track-thumb" src="${esc(t.cover_url)}" alt="" loading="lazy" onerror="this.style.display='none'">`
                    : `<div class="ytm-sp-row-art-fallback" aria-hidden="true">${ICON.music}</div>`
                  }
                  <div class="ytm-import-track-meta">
                    <div class="ytm-import-track-title">${esc(t.title)}</div>
                    <div class="ytm-import-track-sub">${esc(sub)}</div>
                  </div>
                  ${dur ? `<div class="ytm-import-track-dur">${esc(dur)}</div>` : ''}
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;

      const titleInput = document.getElementById('ytm-spotify-title-input');
      titleInput?.addEventListener('input', () => {
        titleInput.dataset.userEdited = '1';
      });

      const selectAllEl = document.getElementById('ytm-spotify-select-all');
      selectAllEl.onchange = (e) => {
        if (this._spotifyState.isConverting) {
          e.target.checked = !e.target.checked;
          return;
        }
        const checked = e.target.checked;
        content.querySelectorAll('.ytm-sp-track-chk').forEach(c => {
          c.checked = checked;
          const idx = parseInt(c.dataset.idx, 10);
          if (checked) this._spotifySelectedIndices.add(idx);
          else this._spotifySelectedIndices.delete(idx);
        });
        this._updateSpotifySelectedCount(tracks.length);
      };

      content.querySelectorAll('.ytm-sp-track-chk').forEach(c => {
        c.onchange = () => {
          if (this._spotifyState.isConverting) {
            c.checked = !c.checked;
            return;
          }
          const idx = parseInt(c.dataset.idx, 10);
          if (c.checked) this._spotifySelectedIndices.add(idx);
          else this._spotifySelectedIndices.delete(idx);
          if (selectAllEl) selectAllEl.checked = this._spotifySelectedIndices.size === tracks.length;
          this._updateSpotifySelectedCount(tracks.length);
        };
      });

      document.getElementById('ytm-sp-fix-btn').onclick = () => this._fixSpotifyMetadata();
      document.getElementById('ytm-sp-convert').onclick = () => this._startSpotifyConversion();
      document.getElementById('ytm-sp-stop').onclick = () => this._stopSpotifyConversion();

      this._updateSpotifySelectedCount(tracks.length);
    },

    _showSpotifyPreview(data) {
      this._renderSpotifyPreview(data);
    },

    _updateSpotifySelectedCount(total) {
      const selSize = this._spotifySelectedIndices.size;
      const countEl = document.getElementById('ytm-sp-selected-count');
      const fixBtn = document.getElementById('ytm-sp-fix-btn');
      const fixLabel = document.getElementById('ytm-sp-fix-label');
      const convBtn = document.getElementById('ytm-sp-convert');
      const convLabel = document.getElementById('ytm-sp-convert-label');
      const disabled = selSize === 0;

      if (countEl) countEl.textContent = String(selSize);
      if (fixBtn) fixBtn.disabled = disabled;
      if (convBtn) convBtn.disabled = disabled;
      if (fixLabel) {
        fixLabel.textContent = (selSize === total || selSize === 0) ? 'Fix All Metadata' : `Fix Selected (${selSize})`;
      }
      if (convLabel) {
        convLabel.textContent = (selSize === total || selSize === 0) ? 'Convert & Import' : `Convert Selected (${selSize})`;
      }
    },

    async _fixSpotifyMetadata() {
      if (this._spotifyState.isConverting || this._fixAbortController) return;
      const data = this._spotifyState.importedData;
      const selectedIndices = Array.from(this._spotifySelectedIndices).sort((a, b) => a - b);
      if (!data || !selectedIndices.length) {
        this._toast('No tracks selected to fix');
        return;
      }

      const actionsBar   = document.getElementById('ytm-sp-actions-bar');
      const progressWrap = document.getElementById('ytm-sp-fix-progress-wrap');
      const progressBar  = document.getElementById('ytm-sp-fix-progress-bar');
      const progressText = document.getElementById('ytm-sp-fix-progress-text');
      const cancelBtn    = document.getElementById('ytm-sp-cancel-fix-btn');
      const trackListEl  = document.getElementById('ytm-sp-track-list');
      const fetchBtn     = document.getElementById('ytm-spotify-fetch-btn');
      const pasteBtn     = document.getElementById('ytm-spotify-paste-btn');

      progressWrap?.classList.remove('hidden');
      actionsBar?.classList.add('hidden');
      cancelBtn?.classList.remove('hidden');
      if (fetchBtn) fetchBtn.disabled = true;
      if (pasteBtn) pasteBtn.disabled = true;
      document.querySelectorAll('#ytm-import-modal .ytm-import-tab').forEach(t => { t.disabled = true; });
      document.querySelectorAll('#ytm-sp-track-list .ytm-sp-track-chk, #ytm-spotify-select-all').forEach(c => { c.disabled = true; });

      this._fixAbortController = new AbortController();
      const signal = this._fixAbortController.signal;
      if (cancelBtn) {
        cancelBtn.onclick = () => {
          this._fixAbortController?.abort();
        };
      }

      let fixedCount = 0;
      const total = selectedIndices.length;

      try {
        for (let i = 0; i < total; i++) {
          if (signal.aborted) {
            throw new DOMException('Metadata fix stopped by user', 'AbortError');
          }

          const idx = selectedIndices[i];
          const t = data.tracks[idx];
          if (!t) continue;

          const pct = Math.round(((i + 1) / total) * 100);
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressText) progressText.textContent = `Fixing ${i + 1}/${total}: "${t.title}"…`;

          // Strip remaster/edition noise while keeping main artist intact
          const origTitle = t.title;
          const origArtist = t.artist;
          const baseTitle = buildSpotifySearchQuery(t.title, '');
          const cleaned = cleanTitleAndArtist(baseTitle || t.title, t.artist, 'MUSIC_PAGE_TYPE_ARTIST', false);
          let targetTitle = cleaned.title;
          let targetArtist = cleaned.artist;
          let targetAlbum = t.album || '';
          let targetCover = t.cover_url || null;

          const primaryArtist = (targetArtist && !/^(unknown|unknown artist|various)$/i.test(targetArtist))
            ? targetArtist.split(',')[0].trim()
            : '';

          let canonical = null;
          try {
            canonical = await fetchCanonicalMetadata(targetTitle, primaryArtist, (u, o) => this._apiFetch(u, signal ? { ...o, signal } : o));
          } catch (_) {}

          if (signal.aborted) {
            throw new DOMException('Metadata fix stopped by user', 'AbortError');
          }

          if (canonical) {
            if (canonical.title) targetTitle = canonical.title;
            if (canonical.artist) targetArtist = canonical.artist;
            if (canonical.album) targetAlbum = canonical.album;
            if (canonical.thumb) targetCover = canonical.thumb;
          }

          const wasUpdated = Boolean(canonical) || targetTitle !== origTitle || targetArtist !== origArtist;
          if (!wasUpdated) continue;

          t.title = targetTitle;
          t.artist = targetArtist;
          if (targetAlbum) t.album = targetAlbum;
          if (targetCover) t.cover_url = targetCover;

          if (trackListEl) {
            const row = trackListEl.querySelector(`.ytm-import-track-row[data-idx="${idx}"]`);
            if (row) {
              const titleEl = row.querySelector('.ytm-import-track-title');
              const artistEl = row.querySelector('.ytm-import-track-sub');
              if (titleEl) {
                titleEl.innerHTML = `${esc(targetTitle)} <span class="ytm-meta-fixed-pill">Fixed</span>`;
              }
              if (artistEl) {
                artistEl.textContent = targetAlbum ? `${targetArtist} · ${targetAlbum}` : targetArtist;
              }
              if (targetCover) {
                const imgEl = row.querySelector('.ytm-import-track-thumb');
                if (imgEl) {
                  imgEl.src = targetCover;
                } else {
                  const ph = row.querySelector('.ytm-sp-row-art-fallback');
                  if (ph) {
                    const img = document.createElement('img');
                    img.className = 'ytm-import-track-thumb';
                    img.src = targetCover;
                    img.alt = '';
                    img.loading = 'lazy';
                    img.onerror = function () { this.style.display = 'none'; };
                    ph.replaceWith(img);
                  }
                }
              }
            }
          }

          if (!data.image && targetCover) {
            const artWrap = document.getElementById('ytm-spotify-prev-art');
            if (artWrap && !artWrap.querySelector('img')) {
              artWrap.innerHTML = `<img class="ytm-import-thumb" src="${esc(targetCover)}" alt="" onerror="this.remove()">`;
              data.image = targetCover;
            }
          }

          fixedCount++;
        }

        this._toast(fixedCount > 0 ? `Fixed metadata for ${fixedCount} track${fixedCount === 1 ? '' : 's'}!` : 'No metadata updates found for selected tracks');
      } catch (err) {
        if (err.name === 'AbortError') {
          this._toast('Metadata fix cancelled');
        } else {
          console.error(`${PLUGIN_LABEL} Spotify metadata fix error:`, err);
          this._toast(`Metadata fix error: ${err.message}`);
        }
      } finally {
        this._fixAbortController = null;
        progressWrap?.classList.add('hidden');
        actionsBar?.classList.remove('hidden');
        if (progressBar) progressBar.style.width = '0%';
        if (fetchBtn) fetchBtn.disabled = false;
        if (pasteBtn) pasteBtn.disabled = false;
        document.querySelectorAll('#ytm-import-modal .ytm-import-tab').forEach(t => { t.disabled = false; });
        document.querySelectorAll('#ytm-sp-track-list .ytm-sp-track-chk, #ytm-spotify-select-all').forEach(c => { c.disabled = false; });
      }
    },

    _handleSpotifyFileUpload(event) {
      const file = event?.target?.files?.[0];
      if (!file) return;
      this._spotifyClearError();

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          const playlistData = normalizeSpotifyJson(json);
          this._spotifyState.importedData = playlistData;
          this._spotifyState.fetchedUrl = '';
          this._spotifyState.sourceKind = 'json';

          const pillText = document.getElementById('ytm-spotify-pill-text');
          const pill = document.getElementById('ytm-spotify-pill');
          const jsonLabel = document.getElementById('ytm-spotify-json-label');
          const urlInput = document.getElementById('ytm-spotify-url-input');
          const clearBtn = document.getElementById('ytm-spotify-url-clear');

          if (pillText) pillText.textContent = `${playlistData.tracks.length} tracks · ${file.name}`;
          pill?.classList.remove('hidden');
          jsonLabel?.classList.add('hidden');
          if (urlInput) {
            urlInput.value = '';
            urlInput.placeholder = 'Using uploaded JSON backup';
            urlInput.disabled = true;
          }
          clearBtn?.classList.add('hidden');

          this._renderSpotifyPreview(playlistData);
        } catch (err) {
          console.error(`${PLUGIN_LABEL} JSON import parse error:`, err);
          this._spotifyShowError(`Could not parse JSON file: ${err.message}`);
          if (event?.target) event.target.value = '';
        }
      };
      reader.readAsText(file);
    },

    _clearSpotifyFile() {
      this._spotifyState.importedData = null;
      this._spotifyState.fetchedUrl = '';
      this._spotifyState.sourceKind = null;
      this._spotifyTracksData = [];
      this._spotifySelectedIndices = new Set();

      const fileEl = document.getElementById('ytm-spotify-file');
      const urlEl = document.getElementById('ytm-spotify-url-input');
      const pill = document.getElementById('ytm-spotify-pill');
      const jsonLabel = document.getElementById('ytm-spotify-json-label');
      const spContent = document.getElementById('ytm-spotify-content');

      if (fileEl) fileEl.value = '';
      if (urlEl) {
        urlEl.value = '';
        urlEl.disabled = false;
        urlEl.placeholder = 'Paste Spotify playlist URL or ID…';
      }
      if (spContent) spContent.innerHTML = '';
      document.getElementById('ytm-spotify-url-clear')?.classList.add('hidden');
      pill?.classList.add('hidden');
      jsonLabel?.classList.remove('hidden');
      this._spotifyClearError();
    },

    async _loadSpotifyUrl() {
      const input = document.getElementById('ytm-spotify-url-input');
      const fetchBtn = document.getElementById('ytm-spotify-fetch-btn');
      const content = document.getElementById('ytm-spotify-content');
      const rawUrl = input?.value.trim();

      this._spotifyClearError();
      if (!rawUrl) {
        this._spotifyShowError('Enter a public Spotify playlist URL or ID.');
        return null;
      }

      const parsed = parseSpotifyUrl(rawUrl, true);
      if (!parsed) {
        this._spotifyShowError('Unrecognized Spotify URL or ID. Paste a link like open.spotify.com/playlist/... or a playlist ID.');
        return null;
      }
      if (parsed.type === 'spotify-unsupported') {
        this._spotifyShowError('Only Spotify playlist links are supported. Albums and single tracks are not supported.');
        return null;
      }

      if (this._spotifyState.abortController) {
        this._spotifyState.abortController.abort();
      }
      const controller = new AbortController();
      this._spotifyState.abortController = controller;

      if (fetchBtn) {
        fetchBtn.disabled = true;
        fetchBtn.textContent = 'Fetching…';
      }
      if (content) {
        content.innerHTML = `
          <div class="ytm-empty" style="padding:32px 0;">
            <div class="ytm-empty-icon ytm-spin">${ICON.sync}</div>
            <div class="ytm-empty-text" id="ytm-sp-fetch-status">Connecting to Spotify…</div>
          </div>
        `;
      }

      try {
        const playlistData = await fetchSpotifyPlaylistFromAPI(
          parsed.playlistId,
          (u, o) => this._apiFetch(u, o),
          {
            signal: controller.signal,
            onPage: (partial) => {
              const statusEl = document.getElementById('ytm-sp-fetch-status');
              if (statusEl) {
                const totalTxt = partial.total ? ` of ${partial.total}` : '';
                statusEl.textContent = `Loaded ${partial.tracks.length}${totalTxt} tracks…`;
              }
            },
          }
        );

        this._spotifyState.importedData = playlistData;
        this._spotifyState.fetchedUrl = rawUrl;
        this._spotifyState.sourceKind = 'api';
        this._renderSpotifyPreview(playlistData);
        return playlistData;
      } catch (err) {
        if (err.name === 'AbortError') return null;
        console.error(`${PLUGIN_LABEL} Spotify fetch error:`, err);
        if (content) {
          content.innerHTML = `
            <div class="ytm-empty" style="padding:24px 0;">
              <div class="ytm-empty-icon">${ICON.alert}</div>
              <div class="ytm-empty-text">Failed to fetch playlist: ${esc(err.message)}</div>
            </div>
          `;
        }
        return null;
      } finally {
        if (this._spotifyState.abortController === controller) {
          this._spotifyState.abortController = null;
        }
        if (fetchBtn) {
          fetchBtn.disabled = false;
          fetchBtn.textContent = 'Fetch';
        }
      }
    },

    async _getLibraryIndex() {
      const map = new Map();
      if (typeof this.api?.library?.getTracks === 'function') {
        try {
          const tracks = await this.api.library.getTracks();
          if (Array.isArray(tracks)) {
            for (const t of tracks) {
              if (t?.source_type && t?.external_id && t.id != null) {
                map.set(`${t.source_type}:${t.external_id}`, t.id);
                if (t.source_type === SOURCE_TYPE) {
                  this.libraryIds.add(t.external_id);
                }
              }
            }
          }
        } catch (err) {
          console.warn(`${PLUGIN_LABEL} getLibraryIndex failed:`, err);
        }
      }
      return map;
    },

    async _matchSpotifyTrackToYtm(spotifyTrack, signal) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const query = buildSpotifySearchQuery(spotifyTrack?.title, spotifyTrack?.artist);
      if (!query) return null;

      const preferStudio = this.config?.preferStudioAudio !== false;

      const abortSafeFetch = async (u, o = {}) => {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const res = await this._apiFetch(u, signal ? { ...o, signal } : o);
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        return res;
      };

      const collectCandidates = (sections, seenIds) => {
        const list = [];
        for (const sec of (sections || [])) {
          if (sec.item?.videoId && !seenIds.has(sec.item.videoId)) {
            seenIds.add(sec.item.videoId);
            list.push(sec.item);
          }
          for (const item of (sec.items || [])) {
            if (item?.videoId && !seenIds.has(item.videoId)) {
              seenIds.add(item.videoId);
              list.push(item);
            }
          }
        }
        return list;
      };

      const seenIds = new Set();
      let bestSongCandidate = null;
      let bestSongScore = -Infinity;
      let bestAnyCandidate = null;
      let bestAnyScore = -Infinity;

      const evalCandidates = (items) => {
        for (const cand of items) {
          const sc = scoreYtmCandidate(spotifyTrack, cand);
          if (sc > bestAnyScore) {
            bestAnyScore = sc;
            bestAnyCandidate = cand;
          }
          if (cand.isSong && !cand.isVideo && sc > bestSongScore) {
            bestSongScore = sc;
            bestSongCandidate = cand;
          }
        }
      };

      const songsSections = await API.search(query, abortSafeFetch, 'songs');
      const songCandidates = collectCandidates(songsSections, seenIds);
      evalCandidates(songCandidates);

      // Broad fallback search only when studio songs search found no strong match
      if (songCandidates.length === 0 || bestSongScore < 25) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const allSections = await API.search(query, abortSafeFetch, null);
        const fallbackCandidates = collectCandidates(allSections, seenIds);
        evalCandidates(fallbackCandidates);
      }

      if (preferStudio && bestSongCandidate && bestSongScore >= 15) {
        return bestSongCandidate;
      }
      if (bestAnyCandidate && bestAnyScore >= 15) {
        return bestAnyCandidate;
      }
      return null;
    },

    _setSpotifyRowResult(rowIdx, statusKind, coverUrl) {
      const row = document.querySelector(`#ytm-sp-track-list .ytm-import-track-row[data-idx="${rowIdx}"]`);
      if (!row) return;
      const titleEl = row.querySelector('.ytm-import-track-title');
      if (titleEl) {
        titleEl.querySelectorAll('.ytm-sp-row-badge').forEach(b => b.remove());
        const badge = document.createElement('span');
        badge.className = `ytm-sp-row-badge ${statusKind}`;
        badge.textContent = statusKind === 'added' ? 'Added' : statusKind === 'lib' ? 'In Library' : 'Not Found';
        titleEl.appendChild(badge);
      }
      if (coverUrl) {
        const imgEl = row.querySelector('.ytm-import-track-thumb');
        if (imgEl) {
          imgEl.src = coverUrl;
        } else {
          const ph = row.querySelector('.ytm-sp-row-art-fallback');
          if (ph) {
            const img = document.createElement('img');
            img.className = 'ytm-import-track-thumb';
            img.src = coverUrl;
            img.alt = '';
            img.loading = 'lazy';
            img.onerror = function () { this.style.display = 'none'; };
            ph.replaceWith(img);
          }
        }
      }
    },

    async _startSpotifyConversion() {
      if (this._spotifyState.isConverting) return;
      if (this._fixAbortController) {
        this._fixAbortController.abort();
      }

      const urlEl = document.getElementById('ytm-spotify-url-input');
      const actionsBar = document.getElementById('ytm-sp-actions-bar');
      const convertBtn = document.getElementById('ytm-sp-convert');
      const fixBtn = document.getElementById('ytm-sp-fix-btn');
      const stopBtn = document.getElementById('ytm-sp-stop');
      const fetchBtn = document.getElementById('ytm-spotify-fetch-btn');
      const pasteBtn = document.getElementById('ytm-spotify-paste-btn');
      const progressCard = document.getElementById('ytm-spotify-progress-card');
      const progLabel = document.getElementById('ytm-sp-prog-label');
      const logWrap = document.getElementById('ytm-sp-log');

      this._spotifyClearError();

      let playlistData = null;
      const rawUrl = urlEl?.value.trim() || '';

      if (
        this._spotifyState.importedData &&
        (this._spotifyState.sourceKind === 'json' || (this._spotifyState.sourceKind === 'api' && rawUrl === this._spotifyState.fetchedUrl))
      ) {
        playlistData = this._spotifyState.importedData;
      } else {
        const parsed = parseSpotifyUrl(rawUrl, true);
        if (!parsed || parsed.type !== 'spotify-playlist') {
          const msg = parsed?.type === 'spotify-unsupported'
            ? 'Only Spotify playlist links or JSON exports are supported.'
            : 'Enter a valid Spotify playlist URL, ID, or upload a JSON export.';
          this._spotifyShowError(msg);
          this._spotifySetStatus('Invalid input');
          return;
        }
        playlistData = await this._loadSpotifyUrl();
        if (!playlistData) return;
      }

      if (!playlistData.tracks || !playlistData.tracks.length) {
        this._spotifyShowError('This playlist contains no tracks to convert.');
        return;
      }

      const selectedItems = playlistData.tracks
        .map((track, rowIdx) => ({ track, rowIdx }))
        .filter(item => this._spotifySelectedIndices.has(item.rowIdx));

      if (!selectedItems.length) {
        this._toast('Please select at least one track to convert');
        return;
      }

      document.querySelectorAll('#ytm-sp-track-list .ytm-sp-row-badge').forEach(b => b.remove());

      const titleInput = document.getElementById('ytm-spotify-title-input');
      const playlistTitle = (titleInput?.value || playlistData.title || 'Spotify Import').trim();

      this._spotifyState.isConverting = true;
      this._spotifyState.stopRequested = false;
      this._spotifyState.abortController = new AbortController();
      const signal = this._spotifyState.abortController.signal;

      if (progressCard) progressCard.classList.remove('hidden');
      if (actionsBar) actionsBar.classList.add('hidden');
      if (convertBtn) convertBtn.disabled = true;
      if (fixBtn) fixBtn.disabled = true;
      if (stopBtn) {
        stopBtn.disabled = false;
        stopBtn.classList.remove('hidden');
      }
      if (fetchBtn) fetchBtn.disabled = true;
      if (pasteBtn) pasteBtn.disabled = true;
      if (urlEl) urlEl.disabled = true;
      document.querySelectorAll('#ytm-import-modal .ytm-import-tab').forEach(t => { t.disabled = true; });
      document.querySelectorAll('#ytm-sp-track-list .ytm-sp-track-chk, #ytm-spotify-select-all').forEach(c => { c.disabled = true; });

      this._spotifyUpdateProgress(0);
      this._spotifyUpdateStats(0, 0, 0);
      this._spotifySetStatus('Converting…');
      if (progLabel) progLabel.textContent = 'Matching studio tracks on YouTube Music…';
      if (logWrap) logWrap.innerHTML = '';

      this._spotifyLog(`Playlist: ${playlistTitle}`, 'info');
      this._spotifyLog(`${selectedItems.length} tracks selected (studio audio preferred)`, 'info');

      try {
        const existingTracks = await this._getLibraryIndex();
        this._spotifyLog(`${existingTracks.size} existing tracks in library index`, 'info');

        const total = selectedItems.length;
        let processed = 0;
        let successes = 0;
        let fromLibrary = 0;
        let notFound = 0;
        const foundTracks = new Array(total).fill(null);
        const inFlight = new Map();
        const libraryWriteLocks = new Map();
        const concurrency = 3;
        const queue = selectedItems.map((item, idx) => ({ track: item.track, rowIdx: item.rowIdx, idx }));

        const resolveAndSaveTrack = async (track) => {
          await new Promise(r => setTimeout(r, 100 + Math.random() * 100));
          if (this._spotifyState.stopRequested || signal.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }

          const best = await this._matchSpotifyTrackToYtm(track, signal);
          if (!best) return null;

          const libraryKey = `${SOURCE_TYPE}:${best.videoId}`;
          if (existingTracks.has(libraryKey)) {
            return {
              id: existingTracks.get(libraryKey),
              isNew: false,
              cover: best.thumb || track.cover_url || ytThumb(best.videoId, 'hqdefault'),
              matchedTitle: best.title,
            };
          }

          if (libraryWriteLocks.has(libraryKey)) {
            const lockedId = await libraryWriteLocks.get(libraryKey);
            return {
              id: lockedId,
              isNew: false,
              cover: best.thumb || track.cover_url || ytThumb(best.videoId, 'hqdefault'),
              matchedTitle: best.title,
            };
          }

          const writePromise = (async () => {
            const durSec = (best.duration && best.duration > 0)
              ? best.duration
              : (videoDurationCache.get(best.videoId) || (track.duration_ms > 0 ? Math.round(track.duration_ms / 1000) : null));
            const cover = best.thumb || (best.videoId ? ytThumb(best.videoId, 'hqdefault') : null) || track.cover_url || null;
            const resolvedArtist = (best.artist && best.artist !== 'Unknown Artist')
              ? best.artist
              : (best.albumArtist && best.albumArtist !== 'Unknown Artist' ? best.albumArtist : (track.artist || 'Unknown Artist'));

            const newId = await this.api.library.addExternalTrack({
              title:       best.title || track.title,
              artist:      resolvedArtist,
              album:       best.album || track.album || playlistTitle || null,
              duration:    durSec || null,
              cover_url:   cover,
              source_type: SOURCE_TYPE,
              external_id: best.videoId,
              liked:       false,
            });
            if (newId != null) {
              existingTracks.set(libraryKey, newId);
              this.libraryIds.add(best.videoId);
            }
            return newId;
          })();

          libraryWriteLocks.set(libraryKey, writePromise);
          let resolvedId;
          try {
            resolvedId = await writePromise;
          } finally {
            libraryWriteLocks.delete(libraryKey);
          }

          if (resolvedId == null) return null;
          return {
            id: resolvedId,
            isNew: true,
            cover: best.thumb || track.cover_url || ytThumb(best.videoId, 'hqdefault'),
            matchedTitle: best.title,
          };
        };

        const searchWorker = async () => {
          while (queue.length > 0 && !this._spotifyState.stopRequested && !signal.aborted) {
            const item = queue.shift();
            if (!item) break;
            const { track, rowIdx, idx } = item;
            const cacheKey = `${normalizeMatchStr(track.title)}|${normalizeMatchStr(track.artist)}|${track.duration_ms || 0}`;
            let trackId = null;
            let cover = null;
            let wasInLibrary = false;

            const cached = this._spotifyTrackCache.get(cacheKey);
            if (cached) {
              trackId = cached.trackId;
              cover = cached.cover || null;
              wasInLibrary = true;
              fromLibrary++;
              this._setSpotifyRowResult(rowIdx, 'lib', cover);
            } else if (inFlight.has(cacheKey)) {
              try {
                const res = await inFlight.get(cacheKey);
                if (res && res.id != null) {
                  trackId = res.id;
                  cover = res.cover || null;
                  wasInLibrary = !res.isNew;
                  res.isNew ? successes++ : fromLibrary++;
                  this._setSpotifyRowResult(rowIdx, res.isNew ? 'added' : 'lib', cover);
                } else {
                  notFound++;
                  this._setSpotifyRowResult(rowIdx, 'miss', null);
                }
              } catch (err) {
                if (err.name === 'AbortError') break;
                notFound++;
                this._setSpotifyRowResult(rowIdx, 'miss', null);
              }
            } else {
              const p = resolveAndSaveTrack(track);
              inFlight.set(cacheKey, p);
              try {
                const res = await p;
                if (res && res.id != null) {
                  trackId = res.id;
                  cover = res.cover || null;
                  wasInLibrary = !res.isNew;
                  this._spotifyTrackCache.set(cacheKey, { trackId: res.id, cover: res.cover });
                  res.isNew ? successes++ : fromLibrary++;
                  this._setSpotifyRowResult(rowIdx, res.isNew ? 'added' : 'lib', cover);
                } else {
                  notFound++;
                  this._setSpotifyRowResult(rowIdx, 'miss', null);
                  this._spotifyLog(`No YouTube match: ${track.title} - ${track.artist}`, 'warn');
                }
              } catch (err) {
                if (err.name === 'AbortError') break;
                console.warn(`${PLUGIN_LABEL} Spotify track match failed for "${track.title}":`, err);
                notFound++;
                this._setSpotifyRowResult(rowIdx, 'miss', null);
                this._spotifyLog(`Match error: ${track.title}`, 'error');
              } finally {
                inFlight.delete(cacheKey);
              }
            }

            foundTracks[idx] = { track, trackId, cover, wasInLibrary, title: track.title };
            processed++;

            if (processed % 5 === 0 || processed === total) {
              this._spotifyUpdateProgress((processed / total) * 50);
              this._spotifyUpdateStats(successes, fromLibrary, notFound);
              this._spotifyLog(`Matched ${processed}/${total}: ${successes} added, ${fromLibrary} in library, ${notFound} not found`, 'info');
            }
          }
        };

        const workers = [];
        for (let i = 0; i < concurrency; i++) {
          workers.push(searchWorker());
        }
        await Promise.all(workers);

        const skipped = foundTracks.filter(e => e === null).length;

        if (this._spotifyState.stopRequested || signal.aborted) {
          this._spotifyLog(`Conversion stopped (${processed}/${total} processed).`, 'warn');
          this._spotifySetStatus('Stopped');
          if (progLabel) progLabel.textContent = 'Conversion stopped';
          if (successes > 0 && typeof this.api?.library?.refresh === 'function') {
            try { await this.api.library.refresh(); } catch (_) {}
          }
          return;
        }

        const matchedEntries = foundTracks.filter(e => e && e.trackId != null);
        if (!matchedEntries.length) {
          this._spotifyUpdateProgress(100);
          this._spotifyUpdateStats(successes, fromLibrary, notFound);
          this._spotifyLog('No matching tracks could be resolved on YouTube Music.', 'error');
          this._spotifySetStatus('No matches found');
          if (progLabel) progLabel.textContent = 'No matches found';
          return;
        }

        if (progLabel) progLabel.textContent = 'Creating playlist and adding tracks…';
        const coverThumb = playlistData.image || matchedEntries.find(e => e.cover)?.cover || null;
        const audionPlaylistId = await this.api.library.createPlaylist(playlistTitle, coverThumb);
        if (audionPlaylistId == null) {
          throw new Error('Failed to create Audion playlist');
        }
        this._spotifyLog(`Created playlist "${playlistTitle}" (${matchedEntries.length} tracks)`, 'success');

        for (let i = 0; i < matchedEntries.length; i++) {
          if (this._spotifyState.stopRequested || signal.aborted) break;
          const entry = matchedEntries[i];
          try {
            await new Promise(r => setTimeout(r, 40));
            await this.api.library.addTrackToPlaylist(audionPlaylistId, entry.trackId);
          } catch (err) {
            this._spotifyLog(`Failed to add to playlist: ${entry.title}`, 'error');
          }
          this._spotifyUpdateProgress(50 + ((i + 1) / matchedEntries.length) * 50);
        }

        if (this._spotifyState.stopRequested || signal.aborted) {
          this._spotifyLog('Playlist assembly stopped by user.', 'warn');
          this._spotifySetStatus('Stopped');
          if (progLabel) progLabel.textContent = 'Conversion stopped';
          if (typeof this.api?.library?.refresh === 'function') {
            try { await this.api.library.refresh(); } catch (_) {}
          }
          return;
        }

        this._spotifyUpdateProgress(100);
        this._spotifyUpdateStats(successes, fromLibrary, notFound);
        this._spotifyLog(
          `Conversion complete: ${matchedEntries.length}/${total} placed in "${playlistTitle}" (${successes} new, ${fromLibrary} in library, ${notFound} not found${skipped > 0 ? `, ${skipped} skipped` : ''}).`,
          'success'
        );
        this._spotifySetStatus(`Done: ${matchedEntries.length} of ${total} tracks converted`);
        if (progLabel) progLabel.textContent = 'Conversion complete';
        this._toast(`Converted "${playlistTitle}" (${matchedEntries.length} tracks)`);

        if (typeof this.api?.library?.refresh === 'function') {
          try { await this.api.library.refresh(); } catch (_) {}
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          this._spotifyLog('Conversion stopped by user.', 'warn');
          this._spotifySetStatus('Stopped');
          if (progLabel) progLabel.textContent = 'Conversion stopped';
        } else {
          console.error(`${PLUGIN_LABEL} Spotify conversion error:`, err);
          this._spotifyShowError(err.message);
          this._spotifyLog(`Conversion error: ${err.message}`, 'error');
          this._spotifySetStatus('Error');
          if (progLabel) progLabel.textContent = 'Conversion failed';
        }
      } finally {
        this._spotifyState.isConverting = false;
        this._spotifyState.abortController = null;
        if (actionsBar) actionsBar.classList.remove('hidden');
        if (convertBtn) convertBtn.disabled = this._spotifySelectedIndices.size === 0;
        if (fixBtn) fixBtn.disabled = this._spotifySelectedIndices.size === 0;
        if (stopBtn) {
          stopBtn.disabled = true;
          stopBtn.classList.add('hidden');
        }
        if (fetchBtn) fetchBtn.disabled = false;
        if (pasteBtn) pasteBtn.disabled = false;
        if (urlEl && this._spotifyState.sourceKind !== 'json') urlEl.disabled = false;
        document.querySelectorAll('#ytm-import-modal .ytm-import-tab').forEach(t => { t.disabled = false; });
        document.querySelectorAll('#ytm-sp-track-list .ytm-sp-track-chk, #ytm-spotify-select-all').forEach(c => { c.disabled = false; });
      }
    },

    _stopSpotifyConversion() {
      if (!this._spotifyState.isConverting) return;
      this._spotifyState.stopRequested = true;
      if (this._spotifyState.abortController) {
        this._spotifyState.abortController.abort();
      }
      const stopBtn = document.getElementById('ytm-sp-stop');
      if (stopBtn) stopBtn.disabled = true;
      const progLabel = document.getElementById('ytm-sp-prog-label');
      if (progLabel) progLabel.textContent = 'Stopping…';
    },

    _renderUrlDetectedCard(urlInfo, rawUrl) {
      const isSpotify = urlInfo.type === 'spotify-playlist';
      const typeLabel = isSpotify
        ? 'Spotify Playlist'
        : urlInfo.type === 'playlist'
          ? 'YouTube / YTM Playlist'
          : urlInfo.type === 'album'
            ? 'YouTube Music Album'
            : 'YouTube Song';
      const badgeIcon = isSpotify ? ICON.spotify : ICON.link;
      const badgeLabel = isSpotify ? 'Spotify Link Detected' : 'YouTube Link Detected';
      const btnIcon = isSpotify ? ICON.sync : (urlInfo.type === 'track' ? ICON.play : ICON.import);
      const btnText = isSpotify ? 'Preview & Convert Playlist' : (urlInfo.type === 'track' ? 'Play / Inspect Song' : 'Preview & Import Playlist');
      const cardCls = isSpotify ? 'ytm-url-detected-card spotify' : 'ytm-url-detected-card';
      const badgeCls = isSpotify ? 'ytm-url-badge spotify' : 'ytm-url-badge';
      const btnCls = 'ytm-btn ytm-btn-primary';

      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="${cardCls}">
          <div class="${badgeCls}">${badgeIcon} ${badgeLabel}</div>
          <div class="ytm-url-detected-title">${typeLabel}</div>
          <div class="ytm-url-detected-desc">${esc(rawUrl)}</div>
          <div class="ytm-url-detected-actions">
            <button class="${btnCls}" id="ytm-url-open-btn">
              ${btnIcon} ${btnText}
            </button>
          </div>
        </div>
      `;

      wrap.querySelector('#ytm-url-open-btn').onclick = () => {
        this._openImportModal(rawUrl, isSpotify ? 'spotify' : 'youtube');
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

    // Events

    _wireEvents() {
      document.getElementById('ytm-close-btn').onclick = () => this.close();
      document.getElementById('ytm-back-btn').onclick  = () => this._goBack();

      document.getElementById('ytm-settings-open').onclick = () => {
        this._buildSettingsBody();
        document.getElementById('ytm-settings')?.classList.add('open');
      };
      document.getElementById('ytm-settings-close').onclick = () => {
        document.getElementById('ytm-settings')?.classList.remove('open');
      };

      document.getElementById('ytm-spotify-open').onclick = () => {
        this._openImportModal('', 'spotify');
      };
      document.getElementById('ytm-import-open').onclick = () => {
        this._openImportModal();
      };
      document.getElementById('ytm-import-close').onclick = () => {
        this._closeImportModal();
      };

      document.getElementById('ytm-tabs').onclick = (e) => {
        const btn = e.target.closest('[data-tab]');
        if (!btn) return;
        this._switchTab(btn.dataset.tab);
      };

      document.getElementById('ytm-home-vibe-row')?.addEventListener('click', (e) => {
        const pill = e.target.closest('[data-vibe]');
        if (!pill) return;
        const vibe = pill.dataset.vibe;
        if (vibe === this._activeHomeVibe) return;
        this._setHomeVibe(vibe);
      });

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

      const input = document.getElementById('ytm-search-input');
      input?.addEventListener('input', (e) => {
        const q = e.target.value.trim();
        this._currentQuery = q;
        clearTimeout(this._searchTimer);
        if (!q) { this._setContent(this._emptyEl(ICON.music, 'Start typing to search…')); return; }

        const spInfo = parseSpotifyUrl(q);
        if (spInfo && spInfo.type === 'spotify-playlist') {
          this._renderUrlDetectedCard(spInfo, q);
          return;
        }

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
          const spInfo = parseSpotifyUrl(q);
          if (spInfo && spInfo.type === 'spotify-playlist') {
            e.preventDefault();
            this._openImportModal(q, 'spotify');
            return;
          }
          const urlInfo = parseYouTubeUrl(q);
          if (urlInfo) {
            e.preventDefault();
            this._openImportModal(q, 'youtube');
          }
        }
      });

      // Escape key closes modals or panel
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

    // Playerbar button

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
      setTimeout(() => this._buildPlayerbarButton(), 600);
    },

    // Open / close

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

    // Tab switching

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
      const vibeRow     = document.getElementById('ytm-home-vibe-row');
      const backBtn     = document.getElementById('ytm-back-btn');
      const panelTitle  = document.getElementById('ytm-panel-title');

      searchRow?.classList.toggle('hidden', tab !== 'search');
      filterRow?.classList.toggle('hidden', tab !== 'search');
      vibeRow?.classList.toggle('hidden', tab !== 'home');
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
        else this._setContent(this._emptyEl(ICON.search, 'Search for songs, albums, artists, or playlists'));
        setTimeout(() => document.getElementById('ytm-search-input')?.focus(), 80);
      }
    },

    // Navigation stack

    _pushNav(title, renderFn, data) {
      if (this._currentNavState) {
        this._navStack.push(this._currentNavState);
      }
      document.getElementById('ytm-panel-title').textContent = title;
      document.getElementById('ytm-back-btn')?.classList.remove('hidden');
      document.querySelectorAll('.ytm-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('ytm-home-vibe-row')?.classList.add('hidden');
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
        document.getElementById('ytm-home-vibe-row')?.classList.toggle('hidden', prev.tab !== 'home');
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

    // Home and personalized vibe feeds

    _setHomeVibe(vibe) {
      this._activeHomeVibe = vibe;
      document.querySelectorAll('#ytm-home-vibe-row .ytm-vibe-pill').forEach(p => {
        const isActive = p.dataset.vibe === vibe;
        p.classList.toggle('active', isActive);
        p.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      this._loadHome(true);
    },

    async _loadHome(force = false) {
      const vibe = this._activeHomeVibe || 'for_you';
      const cacheKey = `home:${vibe}`;
      if (!force) {
        const cached = this._browseCache.get(cacheKey);
        if (cached) return this._renderSections(cached);
      }
      this._setSkeleton();
      try {
        let sections;
        if (vibe === 'for_you') {
          sections = await this._buildPersonalizedHome();
        } else {
          const vibeInfo = HOME_VIBES[vibe];
          if (vibeInfo?.params) {
            sections = await API.getMoodCategory(vibeInfo.params, (u, o) => this._apiFetch(u, o));
          } else {
            sections = await API.getHome((u, o) => this._apiFetch(u, o));
          }
        }
        this._browseCache.set(cacheKey, sections);
        this._renderSections(sections);
      } catch (e) {
        console.error(`${PLUGIN_LABEL} load home error:`, e);
        this._setContent(this._emptyEl(ICON.alert, `Failed to load home: ${e.message}`));
      }
    },

    async _buildPersonalizedHome() {
      const sections = [];
      const libData = await this._analyzeLibrary();

      const topArtistName = libData.topArtists?.[0]?.name;

      const [editorialRes, newReleasesRes, artistSongsRes] = await Promise.allSettled([
        API.getMoodCategory(HOME_VIBES.chill.params, (u, o) => this._apiFetch(u, o)),
        API.getNewReleases((u, o) => this._apiFetch(u, o)),
        topArtistName
          ? API.search(topArtistName, (u, o) => this._apiFetch(u, o), 'songs')
          : API.getHotTracks((u, o) => this._apiFetch(u, o))
      ]);

      const shortcutItems = [];

      if (libData.totalTracks > 0) {
        shortcutItems.push({
          title: 'Shuffle My Library',
          subtitle: `${libData.totalTracks} saved tracks`,
          iconSvg: ICON.shuffle,
          hasPlay: true,
          onClick: () => this._shuffleLibraryTracks(),
          onPlay: () => this._shuffleLibraryTracks(),
        });
      }

      if (this._recentPlayed && this._recentPlayed.length > 0) {
        const lastPlayed = this._recentPlayed[0];
        shortcutItems.push({
          title: lastPlayed.title,
          subtitle: `Recent • ${lastPlayed.artist || 'Unknown'}`,
          thumb: lastPlayed.thumb,
          hasPlay: true,
          onClick: () => this._playTrack(lastPlayed, this._recentPlayed),
          onPlay: () => this._playTrack(lastPlayed, this._recentPlayed),
        });
      }

      if (libData.topArtists?.length) {
        for (const a of libData.topArtists.slice(0, 2)) {
          shortcutItems.push({
            title: a.name,
            subtitle: `${a.count} saved songs`,
            iconSvg: ICON.artist,
            isCircle: true,
            hasPlay: false,
            onClick: () => this._searchAndOpenArtist(a.name),
          });
        }
      }

      if (shortcutItems.length < 4) {
        shortcutItems.push({
          title: 'New Studio Releases',
          subtitle: 'Fresh albums & singles',
          iconSvg: ICON.album,
          hasPlay: false,
          onClick: () => {
            const el = document.querySelector('.ytm-new-releases-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          },
        });
      }
      if (shortcutItems.length < 4) {
        shortcutItems.push({
          title: 'Chill Out Mixes',
          subtitle: 'Acoustics & Lo-Fi',
          iconSvg: ICON.music,
          hasPlay: false,
          onClick: () => this._setHomeVibe('chill'),
        });
      }

      sections.push({
        _type: 'shortcuts-grid',
        items: shortcutItems,
      });

      if (this._recentPlayed && this._recentPlayed.length > 0) {
        sections.push({
          title: 'Jump Back In',
          items: this._recentPlayed.slice(0, 10),
          _type: 'shelf',
        });
      }

      if (topArtistName && artistSongsRes.status === 'fulfilled' && artistSongsRes.value?.length) {
        const songsSec = artistSongsRes.value.find(s => s.items?.length);
        const songs = (songsSec ? songsSec.items : []).filter(i => i.videoId);
        if (songs.length) {
          sections.push({
            title: `Because you like ${topArtistName}`,
            items: songs.slice(0, 6),
            _type: 'shelf',
          });
        }
      }

      if (editorialRes.status === 'fulfilled' && editorialRes.value?.length) {
        for (const sec of editorialRes.value) {
          if (sec.items?.length && (sec._type === 'carousel' || sec._type === 'shelf')) {
            sections.push({
              title: sec.title || 'Curated Moods & Mixes',
              items: sec.items,
              _type: sec._type,
            });
            break;
          }
        }
      }

      if (newReleasesRes.status === 'fulfilled' && newReleasesRes.value?.length) {
        for (const sec of newReleasesRes.value) {
          if (sec.items?.length) {
            sections.push({
              title: sec.title || 'New Releases',
              items: sec.items,
              _type: 'carousel',
              className: 'ytm-new-releases-section',
            });
            break;
          }
        }
      }

      sections.push({
        _type: 'vibe-tiles',
        title: 'Explore by Mood & Moment',
      });

      return sections;
    },

    _renderShortcutsGrid(section) {
      const container = document.createElement('div');
      container.className = 'ytm-shortcuts-grid';

      for (const item of (section.items || [])) {
        const card = document.createElement('div');
        card.className = 'ytm-shortcut-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const thumbHtml = item.thumb
          ? `<img class="ytm-shortcut-thumb${item.isCircle ? ' circle' : ''}" src="${esc(item.thumb)}" loading="lazy" onerror="this.outerHTML='<div class=\\'ytm-shortcut-thumb${item.isCircle ? ' circle' : ''}\\'>${item.iconSvg || ICON.music}</div>'">`
          : `<div class="ytm-shortcut-thumb${item.isCircle ? ' circle' : ''}">${item.iconSvg || ICON.music}</div>`;

        card.innerHTML = `
          ${thumbHtml}
          <div class="ytm-shortcut-info">
            <div class="ytm-shortcut-title">${esc(item.title)}</div>
            <div class="ytm-shortcut-sub">${esc(item.subtitle)}</div>
          </div>
          ${item.hasPlay ? `<button class="ytm-shortcut-play-btn" title="Play">${ICON.play}</button>` : ''}
        `;

        card.onclick = (e) => {
          if (item.onPlay && e.target.closest('.ytm-shortcut-play-btn')) {
            e.stopPropagation();
            item.onPlay();
            return;
          }
          if (item.onClick) item.onClick();
        };

        card.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (item.onClick) item.onClick();
          }
        };

        container.appendChild(card);
      }

      return container;
    },

    _renderVibeTiles(section) {
      const container = document.createElement('div');
      container.className = 'ytm-section';
      container.innerHTML = `<div class="ytm-section-title">${esc(section.title || 'Explore by Mood & Moment')}</div>`;

      const grid = document.createElement('div');
      grid.className = 'ytm-vibe-tiles-grid';

      const tiles = [
        { vibe: 'chill', label: 'Chill', desc: 'Acoustic and ambient', bg: 'linear-gradient(145deg, #1a2a3a 0%, #203548 100%)' },
        { vibe: 'focus', label: 'Focus', desc: 'Instrumental and beats', bg: 'linear-gradient(145deg, #162f2f 0%, #1f423f 100%)' },
        { vibe: 'energize', label: 'Workout', desc: 'High energy and drive', bg: 'linear-gradient(145deg, #3d171d 0%, #542220 100%)' },
        { vibe: 'feel_good', label: 'Feel Good', desc: 'Upbeat and bright', bg: 'linear-gradient(145deg, #3b2c12 0%, #523b18 100%)' },
        { vibe: 'commute', label: 'Commute', desc: 'Road trip rotation', bg: 'linear-gradient(145deg, #231c38 0%, #362955 100%)' },
        { vibe: 'party', label: 'Party', desc: 'Dance and celebrations', bg: 'linear-gradient(145deg, #3b1828 0%, #582136 100%)' },
      ];

      for (const t of tiles) {
        const tile = document.createElement('div');
        tile.className = 'ytm-vibe-tile';
        tile.style.background = t.bg;
        tile.setAttribute('role', 'button');
        tile.setAttribute('tabindex', '0');
        tile.innerHTML = `
          <div class="ytm-vibe-tile-title">${esc(t.label)}</div>
          <div class="ytm-vibe-tile-desc">${esc(t.desc)}</div>
        `;
        tile.onclick = () => {
          this._setHomeVibe(t.vibe);
          document.getElementById('ytm-content')?.scrollTo({ top: 0, behavior: 'smooth' });
        };
        tile.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._setHomeVibe(t.vibe);
            document.getElementById('ytm-content')?.scrollTo({ top: 0, behavior: 'smooth' });
          }
        };
        grid.appendChild(tile);
      }

      container.appendChild(grid);
      return container;
    },

    // Trending

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
        this._setContent(this._emptyEl(ICON.alert, `Failed to load trending: ${e.message}`));
      }
    },

    // Search

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
        this._setContent(this._emptyEl(ICON.alert, `Search failed: ${e.message}`));
      }
    },

    // Section list rendering

    _renderSections(sections, isSearch = false) {
      if (!sections || !sections.length) {
        return this._setContent(this._emptyEl(ICON.music, 'Nothing to show'));
      }

      const wrap = document.createElement('div');
      for (const section of sections) {
        if (!section.item && (!section.items || !section.items.length) && section._type !== 'vibe-tiles') continue;

        let el;
        if (section._type === 'shortcuts-grid') {
          el = this._renderShortcutsGrid(section);
        } else if (section._type === 'vibe-tiles') {
          el = this._renderVibeTiles(section);
        } else if (section._type === 'card-hero') {
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
            const songSection = { title: section.title, items: items.filter(i => i.videoId), className: section.className };
            const cardSection = { title: null,           items: items.filter(i => i.browseId && !i.videoId), className: section.className };
            el = document.createElement('div');
            if (cardSection.items.length) el.appendChild(this._renderCardSection(cardSection));
            if (songSection.items.length) el.appendChild(this._renderTrackSection(songSection));
          } else {
            el = this._renderCardSection(section);
          }
        }
        if (el) wrap.appendChild(el);
      }

      if (!wrap.children.length) return this._setContent(this._emptyEl(ICON.music, 'Nothing to show'));
      this._setContent(wrap);
    },

    _renderCardHero(section) {
      const container = document.createElement('div');
      container.className = 'ytm-section ytm-top-result-section';
      container.innerHTML = `<div class="ytm-section-title">${esc(section.title || 'Top Result')}</div>`;

      const heroCard = document.createElement('div');
      heroCard.className = 'ytm-top-result-card';
      const isArtist = section.item.pageType?.includes('ARTIST') || section.item.browseId?.startsWith('UC');
      const isVideo = section.item.isVideo;
      const thumbUrl = section.item.thumb || '';
      const badgeText = isArtist ? 'Artist' : (isVideo ? 'Video' : 'Song');

      heroCard.innerHTML = `
        <div class="ytm-top-result-left">
          ${thumbUrl ? `<img class="ytm-top-result-thumb${isArtist ? ' circle' : ''}" src="${esc(thumbUrl)}" loading="lazy" onerror="this.style.background='var(--bg-elevated)'">` : ''}
          <div class="ytm-top-result-info">
            <div class="ytm-top-result-title">${esc(section.item.title)}</div>
            <div class="ytm-top-result-sub">${esc(section.item.subtitle || (isArtist ? 'Artist' : ''))}</div>
            <span class="ytm-top-result-badge">${badgeText}</span>
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
      container.className = 'ytm-section' + (section.className ? ' ' + section.className : '');
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
      container.className = 'ytm-section' + (section.className ? ' ' + section.className : '');
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
        const videoBadge = (item.isVideo && !item.isSong) ? `<span class="ytm-video-badge" title="Music Video">Video</span>` : '';

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
            <div class="ytm-track-title">${esc(item.title)}${explicit}${videoBadge}</div>
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

    // Navigation helpers

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
        this._setContent(this._emptyEl(ICON.alert, `Failed to load artist: ${e.message}`));
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
        this._setContent(this._emptyEl(ICON.alert, `Failed to load album: ${e.message}`));
      }
    },

    _renderAlbumPage(album) {
      const wrap = document.createElement('div');

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
            const trackArtist = (t.artist && t.artist !== 'Unknown Artist')
              ? t.artist
              : (album.artist || t.albumArtist || 'Unknown Artist');
            await this.api.library.addExternalTrack({
              title:       t.title,
              artist:      trackArtist,
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
        this._setContent(this._emptyEl(ICON.alert, `Failed to load playlist: ${e.message}`));
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
        if (!tracks.length) return this._setContent(this._emptyEl(ICON.music, 'No tracks found'));
        const section = { title: 'Related tracks', items: tracks };
        const list = this._renderTrackSection(section);
        this._setContent(list || this._emptyEl(ICON.music, 'No tracks found'));
      } catch (e) {
        this._setContent(this._emptyEl(ICON.alert, `Failed to load: ${e.message}`));
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

    // Playback

    async _resolveOfficialSong(track) {
      if (!track || !track.title) return null;
      if (track.isSong && !track.isVideo && track.musicVideoType === 'MUSIC_VIDEO_TYPE_ATV') {
        return null;
      }
      try {
        const q = `${track.title} ${track.artist || ''}`
          .replace(/\(Official Music Video\)|\(Official Video\)|\(Lyric Video\)|\[MV\]|\[Official Video\]/gi, '')
          .trim();
        const searchSections = await API.search(q, (u, o) => this._apiFetch(u, o), 'songs');
        const songs = (searchSections.find(s => s.title === 'Songs' || s._type === 'shelf')?.items || [])
          .filter(it => it.videoId && it.isSong && !it.isVideo);
        if (!songs.length) return null;

        const best = songs[0];
        if (best.videoId && best.videoId !== track.videoId) {
          return best;
        }
      } catch (e) {
        console.warn(`${PLUGIN_LABEL} resolveOfficialSong failed:`, e);
      }
      return null;
    },

    async _playTrack(track, queue = []) {
      if (!track?.videoId) return;

      let targetTrack = track;
      if (this.config.preferStudioAudio !== false && (track.isVideo || track.musicVideoType === 'MUSIC_VIDEO_TYPE_OMV' || track.musicVideoType === 'MUSIC_VIDEO_TYPE_UGC')) {
        const studioSong = await this._resolveOfficialSong(track);
        if (studioSong) {
          this._toast(`Playing studio audio for "${studioSong.title}"…`);
          targetTrack = {
            ...track,
            videoId: studioSong.videoId,
            title: studioSong.title,
            artist: studioSong.artist || track.artist,
            album: studioSong.album || track.album,
            thumb: studioSong.thumb || track.thumb,
            duration: studioSong.duration || track.duration,
            isSong: true,
            isVideo: false,
          };
        }
      }

      this._toast(`Loading "${targetTrack.title}"…`);

      try {
        // Resolve stream and proxy through Rust → blob: URL to bypass CORS.
        const rawStreamUrl = await resolveStream(targetTrack.videoId, (u, o) => this._apiFetch(u, o));
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

        const exactDuration = targetTrack.duration || videoDurationCache.get(targetTrack.videoId) || null;

        const queueItems = (Array.isArray(queue) && queue.length > 0) ? queue : [targetTrack];
        const fullQueue = queueItems.filter(t => t.videoId).map(t => {
          const isTarget = t.videoId === track.videoId || t.videoId === targetTrack.videoId;
          const actualItem = isTarget ? targetTrack : t;
          const qId = Math.abs(actualItem.videoId.split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0) | 0, 0)) || Date.now();
          const trackArtist = (actualItem.artist && actualItem.artist !== 'Unknown Artist')
            ? actualItem.artist
            : (actualItem.albumArtist || '');
          return {
            id:          qId,
            title:       actualItem.title,
            artist:      trackArtist,
            album:       actualItem.album || '',
            duration:    actualItem.duration || (isTarget ? exactDuration : null),
            cover_url:   actualItem.thumb || ytThumb(actualItem.videoId),
            source_type: SOURCE_TYPE,
            external_id: actualItem.videoId,
            path:        `${SOURCE_TYPE}://${actualItem.videoId}`,
            stream_url:  isTarget ? finalUrl : null,
          };
        });

        const startIndex = Math.max(0, fullQueue.findIndex(t => t.external_id === targetTrack.videoId));

        if (typeof this.api.player.playQueue === 'function') {
          await this.api.player.playQueue(fullQueue, startIndex, {
            type: SOURCE_TYPE,
            name: targetTrack.title,
          });
        } else {
          await this.api.player.setTrack(fullQueue[startIndex]);
        }

        this._recordPlayHistory(targetTrack);
        this._playingVideoId = targetTrack.videoId;
        this._updatePlayingHighlight();
      } catch (e) {
        console.error(`${PLUGIN_LABEL} playback failed:`, e);
        this._toast(`Playback failed: ${e.message}`);
      }
    },

    async _saveTrack(track, rowEl) {
      try {
        let targetTrack = track;
        if (this.config.preferStudioAudio !== false && (track.isVideo || track.musicVideoType === 'MUSIC_VIDEO_TYPE_OMV' || track.musicVideoType === 'MUSIC_VIDEO_TYPE_UGC')) {
          const studioSong = await this._resolveOfficialSong(track);
          if (studioSong) targetTrack = studioSong;
        }

        const isSaved = this.libraryIds.has(targetTrack.videoId) || this.libraryIds.has(track.videoId);
        const btn = rowEl?.querySelector?.('.ytm-save-btn-row');

        if (isSaved) {
          const libTracks = await this.api.library?.getTracks?.() || [];
          const matched = libTracks.find(lt => lt.source_type === SOURCE_TYPE && (lt.external_id === targetTrack.videoId || lt.external_id === track.videoId));
          if (matched && typeof this.api.library?.removeTrack === 'function') {
            await this.api.library.removeTrack(matched.id);
          } else if (matched && typeof this.api.library?.deleteTrack === 'function') {
            await this.api.library.deleteTrack(matched.id);
          }
          this.libraryIds.delete(targetTrack.videoId);
          this.libraryIds.delete(track.videoId);
          this._toast(`Removed "${targetTrack.title}" from Library`);
          if (btn) {
            btn.classList.remove('saved');
            btn.innerHTML = ICON.heartO;
            btn.title = 'Add to Library';
            btn.setAttribute('aria-label', 'Add to Library');
          }
        } else {
          let dur = targetTrack.duration || videoDurationCache.get(targetTrack.videoId) || null;
          if ((!dur || dur <= 0) && targetTrack.videoId) {
            try {
              const watchData = await API.getWatchPlaylist(targetTrack.videoId, null, (u, o) => this._apiFetch(u, o));
              if (watchData && watchData.length && watchData[0].duration > 0) {
                dur = watchData[0].duration;
                targetTrack.duration = dur;
                videoDurationCache.set(targetTrack.videoId, dur);
              }
            } catch (_) {}
          }
          if (dur && rowEl) {
            const durEl = rowEl.querySelector('.ytm-track-dur');
            if (durEl) durEl.textContent = fmtDuration(dur);
          }

          const finalArtist = (targetTrack.artist && targetTrack.artist !== 'Unknown Artist')
            ? targetTrack.artist
            : (targetTrack.albumArtist && targetTrack.albumArtist !== 'Unknown Artist'
                ? targetTrack.albumArtist
                : 'Unknown Artist');

          await this.api.library.addExternalTrack({
            title:       targetTrack.title,
            artist:      finalArtist,
            album:       targetTrack.album  || '',
            duration:    dur || null,
            cover_url:   targetTrack.thumb || ytThumb(targetTrack.videoId),
            source_type: SOURCE_TYPE,
            external_id: targetTrack.videoId,
            liked:       false,
          });
          this.libraryIds.add(targetTrack.videoId);
          this._toast(`Added "${targetTrack.title}" to Library`);
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
      const trackArtist = (track.artist && track.artist !== 'Unknown Artist')
        ? track.artist
        : (track.albumArtist || '');
      const trackObj = {
        id:          qId,
        title:       track.title,
        artist:      trackArtist,
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

    // Skeleton & content helpers

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
      el.innerHTML = `<div class="ytm-empty-icon">${icon || ICON.music}</div><div>${esc(msg)}</div>`;
      return el;
    },

    // Toast
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

  // Bootstrap
  if (typeof Audion !== 'undefined' && Audion.register) {
    Audion.register(YouTubeMusic);
  } else {
    window.YouTubeMusic = YouTubeMusic;
    window.AudionPlugin  = YouTubeMusic;
  }

})();

