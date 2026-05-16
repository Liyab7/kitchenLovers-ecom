const STORAGE_KEY = 'productSearchHistory';

function normalizeQuery(query) {
  return String(query || '').trim();
}

function readEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Browser storage can fill up. Keep the newest searches if that happens.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-100)));
  }
}

export function getProductSearchHistory() {
  return readEntries();
}

export function storeProductSearch(query, meta = {}) {
  const value = normalizeQuery(query);
  if (!value) return getProductSearchHistory();

  const entries = readEntries();
  const last = entries[entries.length - 1];
  const next = {
    query: value,
    searchedAt: new Date().toISOString(),
    source: meta.source || 'products',
    categoryId: meta.categoryId || undefined,
    categoryName: meta.categoryName || undefined,
    resultsCount: Number.isFinite(meta.resultsCount) ? meta.resultsCount : undefined,
  };

  if (last?.query?.toLowerCase() === value.toLowerCase() && last?.source === next.source) {
    entries[entries.length - 1] = { ...last, ...next };
  } else {
    entries.push(next);
  }

  writeEntries(entries);
  return entries;
}
