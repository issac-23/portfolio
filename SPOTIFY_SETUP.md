# Spotify Setup

The Now Playing section reads from the Spotify Web API using a refresh token.
Spotify refresh tokens expire 6 months after authorization, so you will redo
step 3 about twice a year. The app and its credentials only need to be set up once.

## 1. Create a Spotify app (once)

1. Go to https://developer.spotify.com/dashboard and click **Create app**.
2. Name it anything (e.g. `Issac Portfolio`).
3. Redirect URI: `http://127.0.0.1:8888/callback`. It has to match exactly;
   Spotify rejects anything else with "redirect_uri: Not matching configuration".
4. Check the **Web API** box and save.
5. Copy the **Client ID** and **Client Secret** (View client secret).

## 2. Put the client ID and secret in `.env.local` (once)

```
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
```

## 3. Authorize

```bash
node scripts/spotify-auth.mjs
```

The script reads the client ID and secret from `.env.local` (or takes them as
arguments: `node scripts/spotify-auth.mjs CLIENT_ID CLIENT_SECRET`, which ends
up in your shell history). If it can't find a secret it asks for one.

It opens Spotify in your browser, you approve, and it writes
`SPOTIFY_REFRESH_TOKEN` into `.env.local`, leaving your other lines alone. If
the browser doesn't open, visit the URL it prints.

If something fails (wrong secret, denied access), the page and terminal show
the error and the script keeps running. Fix it and open the printed URL again.
If the error is `invalid_client` (for example the secret was rotated and
`.env.local` is stale), the secret is already loaded, so stop the script with
Ctrl+C, fix `SPOTIFY_CLIENT_SECRET`, and rerun it.

## 4. Deploy

Copy `SPOTIFY_REFRESH_TOKEN` from `.env.local` into the Vercel project's
**Production** environment variables (and `SPOTIFY_CLIENT_SECRET` too if you
rotated it), then redeploy. Restart `npm run dev` locally.

## Token expired

Symptom: `/api/spotify/now-playing` on the site returns
`{"error":"spotify_auth"}` (any other Spotify failure is
`spotify_unavailable`), and Spotify's token endpoint answers
`400 invalid_grant`. The Vercel function log shows `token 400 invalid_grant`.

Check: `node scripts/spotify-auth.mjs --check` tests the token saved in
`.env.local` and prints only statuses and Spotify's error codes.

Fix: rerun `node scripts/spotify-auth.mjs`, update the Vercel env var, and
redeploy. Expect this roughly every 6 months.
