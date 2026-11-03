/**
 * Fetch one user's public Xueqiu watchlist as a daily, ordered snapshot.
 * Requires XUEQIU_COOKIE (GitHub Actions secret). No credentials are persisted.
 * Run: node scripts/update-xueqiu.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const OUTPUT = 'public/data/auto-snapshots.json';
export const DEFAULT_USER_ID = '9430706524';

export function beijingDay(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return [value('year'), value('month'), value('day')].join('-');
}

export function normalizeStocks(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('Xueqiu returned an empty or invalid stock list; refusing to overwrite history.');
  }
  if (records.length >= 1000) {
    throw new Error('Xueqiu returned 1000 or more stocks; possible pagination truncation.');
  }

  const seen = new Set();
  const stocks = [];
  for (const row of records) {
    const symbol = String(row?.symbol ?? '').trim().toUpperCase();
    const name = String(row?.name ?? '').trim();
    if (!/^[A-Z0-9._-]{1,24}$/.test(symbol) || !name || name.length > 100) {
      throw new Error('Xueqiu returned an invalid stock entry; refusing partial data.');
    }
    if (!seen.has(symbol)) {
      seen.add(symbol);
      stocks.push({ symbol, name });
    }
  }
  if (!stocks.length) throw new Error('No valid stocks found.');
  return stocks;
}

export function applyDailySnapshot(history, stocks, userId, now, allowLargeDrop = false) {
  if (!Array.isArray(history) || history.some((s) =>
    !s || typeof s.id !== 'string' || !Array.isArray(s.stocks) || typeof s.timestamp !== 'number'
  )) {
    throw new Error('Existing snapshots file is invalid; refusing to modify it.');
  }
  if (!Array.isArray(stocks) || stocks.length === 0) {
    throw new Error('No stocks to save.');
  }

  const prior = [...history].sort((a, b) => b.timestamp - a.timestamp)
    .find((snapshot) => snapshot.id !== 'auto-xueqiu-' + userId + '-' + beijingDay(now));
  if (!allowLargeDrop && prior && prior.stocks.length >= 10 && stocks.length < prior.stocks.length * 0.5) {
    throw new Error('Stock count dropped by over 50%; refusing potentially incomplete crawl. Inspect manually; set ALLOW_LARGE_DROP=true only if confirmed.');
  }

  const id = 'auto-xueqiu-' + userId + '-' + beijingDay(now);
  const snapshot = {
    id,
    date: now.toISOString(),
    timestamp: now.getTime(),
    stocks,
    notes: 'Automated Xueqiu watchlist snapshot (user ' + userId + '; Asia/Shanghai date).'
  };
  return [...history.filter((item) => item.id !== id), snapshot]
    .sort((a, b) => b.timestamp - a.timestamp);
}

async function fetchStockList(userId, cookie, fetchFn = fetch) {
  const endpoint = new URL('https://stock.xueqiu.com/v5/stock/portfolio/stock/list.json');
  endpoint.searchParams.set('category', '1');
  endpoint.searchParams.set('size', '1000');
  endpoint.searchParams.set('uid', userId);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetchFn(endpoint, {
        headers: {
          Cookie: cookie,
          Referer: 'https://xueqiu.com/u/' + userId + '#/stock',
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) {
        const error = new Error('Xueqiu HTTP ' + response.status + ' (check login cookie, access, or rate limit).');
        error.retryable = response.status === 429 || response.status >= 500;
        throw error;
      }
      const payload = await response.json();
      if (payload?.error_code != null && payload.error_code !== 0) {
        throw new Error('Xueqiu API rejected the request (error_code ' + payload.error_code + ').');
      }
      return normalizeStocks(payload?.data?.stocks);
    } catch (error) {
      if (attempt === 3 || error.retryable === false ||
          (error.message.includes('HTTP ') && !error.retryable) ||
          error.message.includes('API rejected') || error.message.includes('stock')) {
        throw error;
      }
      await new Promise((done) => setTimeout(done, 1000 * attempt));
    }
  }
  throw new Error('Xueqiu request failed.');
}

export async function main() {
  const userId = process.env.XUEQIU_USER_ID || DEFAULT_USER_ID;
  const cookie = (process.env.XUEQIU_COOKIE || '').trim();
  if (!/^\d{5,20}$/.test(userId)) throw new Error('Invalid XUEQIU_USER_ID.');
  if (!cookie) throw new Error('Missing XUEQIU_COOKIE. Set it in repository Settings > Secrets and variables > Actions.');
  if (/[\r\n]/.test(cookie)) throw new Error('XUEQIU_COOKIE must be a single line.');

  const now = new Date();
  const stocks = await fetchStockList(userId, cookie);
  const file = resolve(OUTPUT);
  let history = [];
  try {
    history = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const updated = applyDailySnapshot(history, stocks, userId, now, process.env.ALLOW_LARGE_DROP === 'true');
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(updated, null, 2) + '\n', 'utf8');
  console.log('Saved ' + stocks.length + ' stocks for ' + beijingDay(now) +
    '; total daily snapshots: ' + updated.length + '.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('Xueqiu daily update failed: ' + error.message);
    process.exitCode = 1;
  });
}
