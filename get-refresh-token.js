const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const readline = require('readline');
require('dotenv').config();

const REDIRECT_URI = 'http://localhost:8080/callback'; // Must match your Spotify Dashboard exactly
const SCOPES = 'playlist-modify-public playlist-modify-private';

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('ERROR: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET not found in .env');
  process.exit(1);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(SCOPES)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

console.log('\n🚀 Spotify Refresh Token Helper (Manual Mode)');
console.log('1. Visit this URL in your browser:');
console.log(`\n   ${authUrl}\n`);
console.log('2. Log in and click "Agree".');
console.log('3. You will be redirected to a page (which might fail to load).');
console.log('4. COPY THE ENTIRE URL from your browser address bar and paste it below:\n');

rl.question('PASTE REDIRECT URL HERE: ', async (redirectedUrl) => {
  try {
    const url = new URL(redirectedUrl);
    const code = url.searchParams.get('code');

    if (!code) {
      console.error('Error: Could not find "code" in the URL you pasted.');
      process.exit(1);
    }

    console.log('\nExchanging code for tokens...');

    const res = await fetch('https://accounts.spotify.com/api/token', {
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

    const data = await res.json();

    if (data.refresh_token) {
      console.log('\n✅ SUCCESS! YOUR REFRESH TOKEN:');
      console.log('---------------------------');
      console.log(`SPOTIFY_REFRESH_TOKEN=${data.refresh_token}`);
      console.log('---------------------------\n');
      console.log('Add this token to your .env file.');
    } else {
      console.error('Failed to get tokens:', data);
    }
  } catch (err) {
    console.error('Invalid URL or error during exchange:', err.message);
  } finally {
    rl.close();
  }
});
