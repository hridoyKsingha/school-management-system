const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 50;

export function parseListPage(query = {}) {
  const requestedPage = Number.parseInt(query.page, 10);
  const requestedLimit = Number.parseInt(query.limit, 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, requestedLimit))
    : DEFAULT_PAGE_SIZE;

  return { page, limit, skip: (page - 1) * limit };
}

export function escapeSearchTerm(value = '') {
  return String(value).trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function createTextSearch(fields, value) {
  const safeTerm = escapeSearchTerm(value);
  if (!safeTerm) return null;
  const expression = new RegExp(safeTerm, 'i');
  return { $or: fields.map((field) => ({ [field]: expression })) };
}

export function createPageMetadata(page, limit, total) {
  const pages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    pages,
    hasPreviousPage: page > 1,
    hasNextPage: page < pages,
  };
}
