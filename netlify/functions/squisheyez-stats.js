// netlify/functions/squisheyez-stats.js
// Serverless function to fetch SquishEyez stats from public Atomic APIs (WAX)

export default async (req, context) => {
  const COLLECTION = 'ssquisheyezz';
  const ATOMIC_BASE = 'https://wax.api.atomicassets.io'; // try CryptoLions node or swap if needed
  const AA = `${ATOMIC_BASE}/atomicassets/v1`;
  const AM = `${ATOMIC_BASE}/atomicmarket/v1`;

  // helper fetch with timeout
  const get = async (url) => {
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 12000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (j && j.data !== undefined) return j.data;
      return j;
    } finally {
      clearTimeout(t);
    }
  };

  // 1) Holders + (fallback) total by summing balances (paginates)
  const fetchAccountsPaged = async () => {
    let page = 1, more = true, holders = 0, totalBySum = 0;
    while (more) {
      const url = `${AA}/accounts?collection_name=${COLLECTION}&page=${page}&limit=1000`;
      const data = await get(url);
      if (!Array.isArray(data) || data.length === 0) { more = false; break; }
      holders += data.length;
      // each entry often has "assets" (count) or "templates" balances; sum the "assets" if present
      for (const acc of data) {
        if (acc.assets) totalBySum += Number(acc.assets) || 0;
        else if (acc.templates) {
          // some APIs expose per-template buckets; sum amounts
          for (const t of acc.templates) totalBySum += Number(t.assets) || 0;
        }
      }
      more = data.length === 1000;
      page++;
      if (page > 50) break; // hard stop to avoid runaway
    }
    return { holders, totalBySum };
  };

  // 2) Total assets from collection stats (if available)
  const fetchCollectionStats = async () => {
    try {
      const data = await get(`${AA}/collections/${COLLECTION}/stats`);
      // try common keys: "assets", "assets_count", "num_assets"
      const total = Number(
        data?.assets ?? data?.assets_count ?? data?.num_assets ?? data?.assetsTotal
      );
      return isFinite(total) && total > 0 ? total : null;
    } catch {
      return null;
    }
  };

  // 3) Floor price from active sales (sorted asc by price)
  const fetchFloorWAX = async () => {
    try {
      const url = `${AM}/sales?collection_name=${COLLECTION}&state=1&order=asc&sort=price&symbol=WAX&limit=1`;
      const data = await get(url);
      if (Array.isArray(data) && data.length) {
        const sale = data[0];
        // AtomicMarket usually provides price in sale.listing_price (string WAX int) or sale.price
        // Prefer token symbol WAX; normalize to plain WAX number
        const listing = sale.listing_price || sale.price?.amount || sale.price;
        let wax = null;
        if (typeof listing === 'string') {
          // Often like "123.45670000 WAX"
          const m = listing.match(/([\d.]+)/);
          if (m) wax = parseFloat(m[1]);
        } else if (typeof listing === 'number') {
          // If it’s an integer in 8 decimals, convert — but usually WAX is 8 decimals on-chain, markets show decimal string already
          wax = listing / 100000000;
        } else if (listing && listing.token_symbol === 'WAX' && listing.amount) {
          wax = Number(listing.amount) / Math.pow(10, listing.token_precision || 8);
        }
        return isFinite(wax) ? wax : null;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Do the work
  let holders = 0, total_assets = null, floor_wax = null;

  const [{ holders: h, totalBySum }, totalFromStats, floor] = await Promise.all([
    fetchAccountsPaged(),
    fetchCollectionStats(),
    fetchFloorWAX()
  ]);
  holders = h || 0;
  total_assets = totalFromStats || (totalBySum || null);
  floor_wax = floor;

  // Response
  return new Response(
    JSON.stringify({ ok: true, holders, total_assets, floor_wax }),
    { headers: { 'content-type': 'application/json', 'cache-control':'no-cache' } }
  );
};
