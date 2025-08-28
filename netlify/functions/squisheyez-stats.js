// netlify/functions/squisheyez-stats.js
// Robust stats function for the SquishEyez collection on WAX
// Works on Netlify classic functions (CommonJS export) and Node 16+ / 18+.

const COLLECTION = 'ssquisheyezz';

// Multiple Atomic API bases to improve resilience
const ATOMIC_BASES = [
  'https://wax.api.atomicassets.io',   // Pink.gg
  'https://atomic.wax.io',             // Alternate mirror
  'https://api.wax-aa.bountyblok.io'   // Bountyblok mirror
];

const DEFAULT_TIMEOUT_MS = 12000;

// Helper: fetch with timeout & fallback if global fetch is missing (Node < 18)
async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  // Use native fetch if present (Node 18+ / Netlify latest)
  if (typeof fetch === 'function') {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      return res;
    } finally {
      clearTimeout(id);
    }
  }

  // Tiny https fallback (for older runtimes)
  const https = await import('node:https');
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: options.method || 'GET', headers: options.headers || {} }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        // Create a very small Response-like object
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          headers: res.headers,
          json: async () => JSON.parse(body.toString('utf-8')),
          text: async () => body.toString('utf-8'),
        });
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('timeout'));
    });
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getJSONFromAnyBase(pathOrFull) {
  const isAbsolute = /^https?:\/\//i.test(pathOrFull);
  const targets = isAbsolute ? [pathOrFull] : ATOMIC_BASES.map((b) => b + pathOrFull);

  let lastErr;
  for (const url of targets) {
    try {
      const res = await fetchWithTimeout(url, { headers: { 'accept': 'application/json' } });
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

// ========== STAT HELPERS ==========

// 1) Holders & Total Assets via /accounts pagination.
// We also try collection stats endpoint (faster) and fall back to sums.
async function fetchAccountsTotals() {
  let page = 1, limit = 1000, holders = 0, total = 0;
  while (true) {
    const data = await getJSONFromAnyBase(`/atomicassets/v1/accounts?collection_name=${COLLECTION}&page=${page}&limit=${limit}`);
    if (!Array.isArray(data) || data.length === 0) break;
    holders += data.length;
    for (const row of data) {
      if (row.assets) total += Number(row.assets) || 0;
      else if (row.templates) {
        for (const t of row.templates) total += Number(t.assets) || 0;
      }
    }
    if (data.length < limit || page >= 10) break; // cap pages for safety
    page++;
  }
  return { holders, totalBySum: total || null };
}

async function fetchCollectionStatsTotal() {
  try {
    const d = await getJSONFromAnyBase(`/atomicassets/v1/collections/${COLLECTION}/stats`);
    const total = Number(
      d?.assets ?? d?.assets_count ?? d?.num_assets ?? d?.assetsTotal
    );
    return isFinite(total) && total > 0 ? total : null;
  } catch (e) {
    return null;
  }
}

// 2) Floor (WAX) via AtomicMarket sales sorted by price
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
        wax = lp / 1e8; // if int in 8 dp
      } else if (lp && lp.amount) {
        wax = Number(lp.amount) / Math.pow(10, lp.token_precision || 8);
      }
      if (isFinite(wax)) return wax;
    }
  } catch (e) {
    // fall through
  }
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
  } catch (e) {
    // give up
  }
  return null;
}

// ========== NETLIFY HANDLER ==========

exports.handler = async (event, context) => {
  try {
    // Parallelize
    const [acctTotals, statsTotal, floor_wax] = await Promise.all([
      fetchAccountsTotals(),
      fetchCollectionStatsTotal(),
      fetchFloorWAX()
    ]);

    const holders = acctTotals.holders || 0;
    const total_assets = statsTotal || acctTotals.totalBySum || null;

    const result = {
      ok: true,
      holders,
      total_assets,
      floor_wax
    };

    return {
      statusCode: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-cache, no-store, must-revalidate',
        'access-control-allow-origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (err) {
    // Log to Netlify function logs (visible in dashboard)
    console.error('[squisheyez-stats] ERROR:', err && err.stack || err);

    return {
      statusCode: 200, // keep 200 so UI renders gracefully
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-cache, no-store, must-revalidate',
        'access-control-allow-origin': '*'
      },
      body: JSON.stringify({
        ok: false,
        error: String(err && err.message || err || 'unknown')
      })
    };
  }
};
