const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
const readline = require('readline');
require('dotenv').config();

const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
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

rl.question('PASTE THE REDIRECT URL (with the code): ', async (redirectedUrl) => {
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
    console.error('Error during exchange:', err.message);
  } finally {
    rl.close();
  }
});
