import { api } from '../services/api';

/**
 * Sentinel per_page value that signals card/grid mode.
 * Matches the backend's max per_page cap (500).
 * When a hook sees per_page >= this value, it uses fetchAllPages.
 */
export const CARD_VIEW_PER_PAGE = 500;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  last_page: number;
}

const PARALLEL_BATCH_SIZE = 4;

/**
 * Fetches all pages from a paginated API endpoint and aggregates results.
 * Used by card/grid views to display the complete filtered dataset.
 *
 * - Fetches page 1 to determine total pages
 * - Fetches remaining pages in parallel batches of 4
 * - Returns aggregated data with last_page=1 so pagination controls hide
 */
export async function fetchAllPages<T>(
  endpoint: string,
  filterParams: string,
): Promise<PaginatedResult<T>> {
  const buildUrl = (page: number) => {
    const pageParams = `page=${page}&per_page=${CARD_VIEW_PER_PAGE}`;
    return filterParams
      ? `${endpoint}?${pageParams}&${filterParams}`
      : `${endpoint}?${pageParams}`;
  };

  const first = await api.get<PaginatedResult<T>>(buildUrl(1));
  const allData: T[] = [...(first.data || [])];
  const { total, last_page } = first;

  if (last_page <= 1) {
    return { data: allData, total, page: 1, per_page: total || CARD_VIEW_PER_PAGE, last_page: 1 };
  }

  // Fetch remaining pages in parallel batches
  const remainingPages = Array.from({ length: last_page - 1 }, (_, i) => i + 2);

  for (let i = 0; i < remainingPages.length; i += PARALLEL_BATCH_SIZE) {
    const batch = remainingPages.slice(i, i + PARALLEL_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(p => api.get<PaginatedResult<T>>(buildUrl(p))),
    );
    for (const r of results) {
      allData.push(...(r.data || []));
    }
  }

  return { data: allData, total, page: 1, per_page: total || CARD_VIEW_PER_PAGE, last_page: 1 };
}

/**
 * Builds a URL query string from a filter object, excluding page and per_page.
 * Used to pass only filter/sort/search params to fetchAllPages.
 */
export function buildFilterQuery(filters: Record<string, unknown>): string {
  return Object.entries(filters)
    .filter(([k, v]) => k !== 'page' && k !== 'per_page' && v !== '' && v !== 0 && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
}
