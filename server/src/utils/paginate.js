export function parsePagination(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function parseSort(sortStr, allowed = []) {
  if (!sortStr) return { createdAt: -1 };
  const fields = String(sortStr).split(',').reduce((acc, raw) => {
    const desc = raw.startsWith('-');
    const key = desc ? raw.slice(1) : raw;
    if (allowed.length && !allowed.includes(key)) return acc;
    acc[key] = desc ? -1 : 1;
    return acc;
  }, {});
  return Object.keys(fields).length ? fields : { createdAt: -1 };
}

export function paginatedResponse({ data, page, limit, total }) {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
