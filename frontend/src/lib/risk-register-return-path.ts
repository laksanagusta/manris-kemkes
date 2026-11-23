const fallback = "/risk/register";
const routingOrigin = "https://manris.invalid";
const returnPaths = new Set([
  fallback,
  "/risk/annual-profiles",
  "/work",
  "/intelligence/minutes",
  "/intelligence/transcript",
]);

export function getRiskRegisterReturnPath(raw: string | null): string {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return fallback;
  try {
    const url = new URL(raw, routingOrigin);
    if (url.origin !== routingOrigin) return fallback;
    if (!returnPaths.has(url.pathname) && !/^\/risk\/annual-profiles\/\d{4}$/.test(url.pathname)) {
      return fallback;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
