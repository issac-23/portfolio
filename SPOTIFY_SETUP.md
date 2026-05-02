# Spotify Setup (one-time, ~10 minutes)

## Step 1 — Create a Spotify App

1. Go to https://developer.spotify.com/dashboard
2. Click **"Create app"**
3. Fill in:
   - App name: `Issac Portfolio` (anything works)
   - Redirect URI: `http://localhost:3000`
   - Check the **Web API** box
4. Click **Save**

## Step 2 — Copy your credentials

From your app's dashboard, copy:
- **Client ID**
- **Client Secret** (click "View client secret")

## Step 3 — Authorize and get your code

Paste your Client ID into this URL, then open it in your browser:

```
https://accounts.spotify.com/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000&scope=user-read-currently-playing%20user-read-recently-played
```

1. You'll be asked to log in and approve the app
2. After approving, your browser will redirect to `http://localhost:3000/?code=LONG_CODE_HERE`
3. Copy everything after `?code=` in the URL

## Step 4 — Exchange the code for a refresh token

Run this in your terminal (from the project folder):

```bash
node scripts/get-refresh-token.mjs YOUR_CODE YOUR_CLIENT_ID YOUR_CLIENT_SECRET
```

The script will print your three env vars. Copy them.

## Step 5 — Create .env.local

Create a file called `.env.local` in the project root and paste the three values:

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
SPOTIFY_REFRESH_TOKEN=...
```

## Step 6 — Restart the dev server

If it's already running, stop it (Ctrl+C) and run `npm run dev` again.

That's it — the Now Playing section is live.
