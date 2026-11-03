# Xueqiu Tracker AI

A React/Vite dashboard that tracks changes to the **ordered stock watchlist** of Xueqiu user **sth_** (`9430706524`). The UI compares snapshots to identify added, removed, and reordered symbols. **Watchlist membership does not prove a trade or actual portfolio position.**

## Run locally

1. Install Node.js 20+ and run `npm ci`.
2. Run `npm run dev`.
3. Run `npm test` to validate the scraper.
4. For optional AI analysis locally, set `GEMINI_API_KEY` in `.env.local`.

## Daily automatic updates

The workflow at [.github/workflows/update-xueqiu.yml](.github/workflows/update-xueqiu.yml) fetches the target user's **stock watchlist (category=1)** daily at **18:15 Beijing time (10:15 UTC)**; it can also be run manually in **Actions → Daily Xueqiu watchlist snapshot → Run workflow**. Scheduled jobs may be delayed.

It uses the stock-list endpoint for `uid=9430706524`, writes ordered daily snapshots to [public/data/auto-snapshots.json](public/data/auto-snapshots.json), and commits the JSON to `main`. This triggers the existing Pages deployment. The frontend fetches that JSON and merges it in memory with browser-local history without overwriting `localStorage`.

### Required first-time setup

1. Sign in to [xueqiu.com](https://xueqiu.com) and verify you can see the [target stock list](https://xueqiu.com/u/9430706524#/stock).
2. In browser developer tools, inspect an authenticated request to `stock.xueqiu.com` and copy its **Cookie request header**. Do not copy the response's `Set-Cookie`. Never paste your cookie into a public issue, commit, or chat.
3. Go to **repository Settings → Secrets and variables → Actions → New repository secret**. Name it `XUEQIU_COOKIE` and paste the Cookie header value. Renew this secret whenever the login session expires.
4. Confirm **Settings → Actions → General → Workflow permissions** allows writing repository contents and Actions are enabled. The workflow declares `contents: write`.
5. Manually run the workflow and inspect its logs. After success, the JSON will contain an `auto-xueqiu-9430706524-YYYY-MM-DD` snapshot; the next GitHub Pages deployment will display it.

Never store cookies or login credentials in the repository or frontend code. Only the Actions runner receives the secret; the published JSON contains stock names/symbols, not the cookie.

### Failure behavior and limits

- Expired cookies, HTTP errors, network problems, empty or invalid responses and suspiciously large stock-list drops cause the run to fail **without overwriting old data**.
- A successful repeat run on the same Beijing calendar day **replaces** that day's snapshot, while a successful new day appends another snapshot even if the list is unchanged.
- If a verified real change removes over half the stocks, temporarily set `ALLOW_LARGE_DROP=true` in the workflow environment for a supervised run, then remove it.
- This web API is not guaranteed to remain stable. Rate limits, access restrictions, anti-automation measures and expiring sessions can interrupt collection. Respect Xueqiu's usage policies; do not attempt to bypass access controls.
- GitHub Actions schedule timing is best-effort. Missed days are **not fabricated**.
- **Public repository and Pages warning:** `public/data/auto-snapshots.json` is publicly visible. Do not use this setup for confidential positions or private watchlists.
- **Clear Local History** clears browser history only; it does not remove auto-generated JSON. JSON export includes both local and automated snapshots. Existing Gist sync operates on browser-local data only.

## Manual import and backups

The **Update Data** page still supports manual import, exporting combined history to JSON, restoring a local JSON backup, and optional GitHub Gist sync. They do not require a Xueqiu cookie.
