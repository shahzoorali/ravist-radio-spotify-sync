# Ravist Radio → Spotify Playlist Automation

Automated Node.js worker that tracks Ravist Radio’s live “Now Playing” metadata and maintains a **de-duplicated Spotify playlist** in real time using the Spotify Web API.

Each track is added **only once, ever**, even if it plays again.

---

## Features

- Polls Ravist Radio metadata at a fixed interval
- Normalizes artist and track names
- Searches Spotify using official APIs
- Adds tracks to a Ravist-owned Spotify playlist
- Global de-duplication using persistent JSON state
- Uses Spotify refresh tokens (no repeated OAuth)
- Designed to run continuously using PM2
- Restart-safe and production-ready

---

## How it works

Radio Metadata API
↓
Metadata Normalization
↓
Canonical Track Key (artist|track)
↓
Duplicate Check (JSON state)
↓
Spotify Search
↓
Add to Playlist (once)

---

## Project structure

ravist-radio-spotify/
├─ index.js
├─ ravist_state.json (local, not committed)
├─ package.json
├─ README.md
├─ .env (local, not committed)


---

## Configuration

Create a `.env` file:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REFRESH_TOKEN=your_refresh_token
SPOTIFY_PLAYLIST_ID=spotify_playlist_id
RADIO_METADATA_URL=https://api.ravist.in/api/radio/metadata

⚠️ Do NOT commit .env or ravist_state.json.

Run locally

npm install
node index.js


Run in production (PM2)
pm2 start index.js --name ravist-radio-spotify
pm2 save
pm2 startup

Notes

Tracks must exist on Spotify to be added

This project does not stream audio

Metadata accuracy depends on the radio source
