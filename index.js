require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'ravist_state.json');

/* ---------- STATE ---------- */

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { added_track_keys: {}, total_added: 0 };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/* ---------- NORMALIZATION ---------- */

function normalizeArtist(artist) {
  if (!artist) return null;
  return artist.toLowerCase().trim();
}

function normalizeTrack(track) {
  if (!track) return null;

  return track
    .toLowerCase()
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\boriginal mix\b/g, '')
    .replace(/\bextended mix\b/g, '')
    .replace(/\bradio edit\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildTrackKey(artist, track) {
  if (!artist || !track) return null;
  return `${artist}|${track}`;
}

/* ---------- RADIO ---------- */

async function fetchRadioMetadata() {
  // Try internal address first (more reliable on server)
  try {
    const res = await fetch('http://localhost:3001/api/radio/metadata');
    if (res.ok) {
      const json = await res.json();
      return json.data;
    }
  } catch (e) {
    // Fallback to .env URL
  }

  const res = await fetch(process.env.RADIO_METADATA_URL);
  if (!res.ok) {
    throw new Error(`Metadata fetch failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

/* ---------- SPOTIFY ---------- */

async function getSpotifyAccessToken() {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization':
        'Basic ' +
        Buffer.from(
          `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN
    })
  });

  const json = await res.json();
  if (!json.access_token) {
    throw new Error('Failed to refresh Spotify access token');
  }
  return json.access_token;
}

async function searchSpotifyTrack(token, artist, track) {
  const q = `artist:${artist} track:${track}`;
  const url =
    `https://api.spotify.com/v1/search` +
    `?q=${encodeURIComponent(q)}` +
    `&type=track&limit=1`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const json = await res.json();
  const item = json.tracks?.items?.[0];
  return item || null;
}

async function addTrackToPlaylist(token, trackId) {
  const url = `https://api.spotify.com/v1/playlists/${process.env.SPOTIFY_PLAYLIST_ID}/tracks`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uris: [`spotify:track:${trackId}`]
    })
  });

  if (!res.ok) {
    throw new Error(`Failed to add track to playlist`);
  }
}

/* ---------- MAIN ---------- */

async function runOnce() {
  try {
    const metadata = await fetchRadioMetadata();

    let rawArtist = metadata.artist;
    let rawTrack = metadata.track;

    if (!rawArtist && rawTrack && rawTrack.includes(' - ')) {
      const parts = rawTrack.split(' - ');
      rawArtist = parts[0];
      rawTrack = parts.slice(1).join(' - ');
    }

    const artist = normalizeArtist(rawArtist);
    const track = normalizeTrack(rawTrack);
    const trackKey = buildTrackKey(artist, track);

    if (!trackKey) {
      console.log('Skipping: unable to build track key');
      return;
    }

    const state = loadState();

    if (state.added_track_keys[trackKey]) {
      console.log('Duplicate — already in playlist:', trackKey);
      return;
    }

    console.log('New track detected:', trackKey);

    const token = await getSpotifyAccessToken();
    const spotifyTrack = await searchSpotifyTrack(token, artist, track);

    if (!spotifyTrack) {
      console.log('Spotify track not found, skipping:', trackKey);
      return;
    }

    await addTrackToPlaylist(token, spotifyTrack.id);

    state.added_track_keys[trackKey] = {
      spotify_track_id: spotifyTrack.id,
      added_at: new Date().toISOString()
    };
    state.total_added += 1;

    saveState(state);

    console.log('Added to Spotify:', spotifyTrack.name);
    console.log('Total unique tracks:', state.total_added);

  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

console.log('Ravist Spotify worker started');

runOnce(); // run immediately on start

setInterval(() => {
  runOnce();
}, 3 * 60 * 1000); // every 3 minutes
