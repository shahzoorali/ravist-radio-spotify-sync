const http = require('http');
const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const PORT = 8888;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = 'playlist-modify-public playlist-modify-private';

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('ERROR: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not found in .env');
  console.log('Please create a .env file with those values first.');
  process.exit(1);
}

const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/callback')) {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    const code = url.searchParams.get('code');

    if (code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Authorization Successful!</h1><p>You can close this tab now. Check your terminal for the tokens.</p>');

      try {
        const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: REDIRECT_URI
          })
        });

        const data = await tokenRes.json();

        if (data.refresh_token) {
          console.log('\n✅ REFRESH TOKEN OBTAINED!');
          console.log('---------------------------');
          console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`);
          console.log('---------------------------\n');
          console.log('Add this token to your .env file.');
        } else {
          console.error('Failed to get refresh token:', data);
        }
      } catch (err) {
        console.error('Error during token exchange:', err.message);
      } finally {
        server.close();
        process.exit();
      }
    } else {
      res.writeHead(400);
      res.end('Authorization failed: code not found.');
    }
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log('\n🚀 Spotify Auth Helper Started');
  console.log('1. Visit this URL in your browser:');
  console.log(`\n   ${authUrl}\n`);
  console.log('2. Log in and authorize the app.');
  console.log('3. Once authorized, the refresh token will appear here.');
});
