/**
 * adminFetch — wrapper around fetch() that automatically attaches
 * the admin magic keyword as a Bearer token in the Authorization header.
 *
 * Usage: replace `fetch(url, options)` with `adminFetch(url, options)`
 * in all admin pages.
 */
const ADMIN_KEYWORD = "kariah2026";

export function adminFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${ADMIN_KEYWORD}`);

  return fetch(url, { ...options, headers });
}
