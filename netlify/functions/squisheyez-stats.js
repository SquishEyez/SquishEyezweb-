// netlify/functions/squisheyez-stats.js
// Robust stats function for the SquishEyez collection on WAX

const https = require('https');

const COLLECTION = 'ssquisheyezz';
const ATOMIC_BASES = [
  'https://wax.api.atomicassets.io',   // Pink.gg
  'https://atomic.wax.io',             // Mirror
  'https://api.wax-aa.bountyblok.io'   // Mirror
];
const DEFAULT_TIMEOUT_MS = 12000;

function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: options.method || 'GET', headers: options.headers || {} }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        const response = {
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: res.headers,
          json: async () => JSON.parse(body || '{}'),
          text: async () => body,
        };
        resolve(response);
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getJSONFromAnyBase(pathOrFull) {
  const isAbs = /^https?:\/\//i.test(pathOrFull);
  const targets = isAbs ? [pathOrFull] : ATOMIC_BASES.map(b => b + pathOrFull);
  let lastErr;
  for (const url of targets) {
    try {
      const res = await fetchWithTimeout(url, { headers: { accept: 'application/json' } });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} @ ${url}`);
        continue;
      }
      const j = await res.json();
      return (j && j.data !== undefined) ? j.data : j;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error(`All endpoints failed for ${pathOrFull}`);
}

// ---- helpers ----
async function fetchCollectionStatsTotal() {
  try {
    const d = await getJSONFromAnyBase(`/atomicassets/v1/collections/${COLLECTION}/stats`);
    const total = Number(d?.assets ?? d?.assets_count ?? d?.num_assets ?? d?.assetsTotal);
    return isFinite(total) && total > 0 ? total : null;
  } catch (_) { return null; }
}

// sums accounts if needed
async function fetchAccountsTotals() {
  let page = 1, limit = 1000, holders = 0, total = 0;
  while (true) {
    const data = await getJSONFromAnyBase(`/atomicassets/v1/accounts?collection_name=${COLLECTION}&page=${page}&limit=${limit}`);
    if (!Array.isArray(data) || data.length === 0) break;
    holders += data.length;
    for (const row of data) {
      if (row.assets) total += Number(row.assets) || 0;
      else if (row.templates) for (const t of row.templates) total += Number(t.assets) || 0;
    }
    if (data.length < limit || page >= 10) break; // safe cap
    page++;
  }
  return { holders, totalBySum: total || null };
}

async function fetchFloorWAX() {
  // v1
  try {
    const d = await getJSONFromAnyBase(`/atomicmarket/v1/sales?collection_name=${COLLECTION}&state=1&order=asc&sort=price&symbol=WAX&limit=1`);
    if (Array.isArray(d) && d.length) {
      const sale = d[0];
      const lp = sale.listing_price || sale.price?.amount || sale.price;
      let wax = null;
      if (typeof lp === 'string') {
        const m = lp.match(/([\d.]+)/);
        if (m) wax = parseFloat(m[1]);
      } else if (typeof lp === 'number') {
        wax = lp / 1e8;
      } else if (lp && lp.amount) {
        wax = Number(lp.amount) / Math.pow(10, lp.token_precision || 8);
      }
      if (isFinite(wax)) return wax;
    }
  } catch (_) {}
  // v2
  try {
    const d2 = await getJSONFromAnyBase(`/atomicmarket/v2/sales?collection_name=${COLLECTION}&state=1&order=asc&sort=price&limit=1`);
    if (Array.isArray(d2) && d2.length) {
      const s = d2[0];
      const p = s.price?.amount || s.listing_price;
      const prec = s.price?.token_precision || 8;
      if (p != null) {
        const wax = Number(p) / Math.pow(10, prec);
        if (isFinite(wax)) return wax;
      }
    }
  } catch (_) {}
  return null;
}

// ---- handler ----
exports.handler = async () => {
  try {
    const [acctTotals, statsTotal, floor_wax] = await Promise.all([
      fetchAccountsTotals(),
      fetchCollectionStatsTotal(),
      fetchFloorWAX()
    ]);
    const holders = acctTotals.holders || 0;
    const total_assets = statsTotal || acctTotals.totalBySum || null;

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-cache, no-store, must-revalidate',
        'access-control-allow-origin': '*'
      },
      body: JSON.stringify({ ok: true, holders, total_assets, floor_wax })
    };
  } catch (err) {
    console.error('[squisheyez-stats] ERROR:', err && err.stack || err);
    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-cache, no-store, must-revalidate',
        'access-control-allow-origin': '*'
      },
      body: JSON.stringify({ ok: false, error: String(err && err.message || err || 'unknown') })
    };
  }
};
