// This route executes only on the Next.js server. Never use NEXT_PUBLIC for the key.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ path: string[] }> };
const methods: Record<string, string[]> = {
  login: ["POST"],
  me: ["GET", "PUT"],
  logout: ["POST"],
  "change-password": ["POST"],
  roles: ["GET"],
  organizations: ["GET"],
  users: ["GET"],
  register: ["POST"],
  "register/organizations": ["GET"],
  apps: ["GET", "POST"],
};

function error(status: number, message: string) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

async function proxy(request: Request, context: Context) {
  const { path } = await context.params;
  const endpoint = path.join("/");
  const allowed = methods[endpoint] ?? (
    /^users\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(endpoint) ? ["GET"] :
    /^apps\/[a-z][a-z0-9_-]{1,63}\/rotate-key$/.test(endpoint) ? ["POST"] :
    /^apps\/[a-z][a-z0-9_-]{1,63}$/.test(endpoint) ? ["DELETE"] : []
  );
  if (!allowed.includes(request.method)) return error(404, "Endpoint tidak tersedia");

  // Browser requests must originate from this application. No credentialed CORS proxy.
  const origin = request.headers.get("origin");
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return error(403, "Akses ditolak");
  }
  const key = process.env.MANRIS_APP_KEY;
  if (!key) return error(503, "Konfigurasi layanan auth belum tersedia");

  try {
    const base = process.env.AUTH_SERVICE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
    const target = new URL(`${base.replace(/\/$/, "")}/auth/${endpoint}`);
    if (target.protocol !== "https:" && !(target.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname))) {
      return error(503, "Konfigurasi layanan auth tidak valid");
    }
    target.search = new URL(request.url).search;
    const headers = new Headers({ "X-App-Key": key, "Content-Type": "application/json" });
    const authorization = request.headers.get("authorization");
    if (authorization) headers.set("Authorization", authorization);
    let body: string | undefined;
    if (!["GET", "HEAD"].includes(request.method)) {
      body = await request.text();
      if (new TextEncoder().encode(body).byteLength > 64 * 1024) return error(413, "Input terlalu besar");
    }
    const upstream = await fetch(target, {
      method: request.method, headers, body, cache: "no-store", redirect: "error",
      signal: AbortSignal.timeout(5000),
    });
    if (upstream.ok && endpoint === "me" && request.method === "GET" && upstream.headers.get("X-Auth-App-Id") !== "manris") {
      return error(503, "Konfigurasi aplikasi auth tidak sesuai");
    }
    if (upstream.ok && ["login", "change-password"].includes(endpoint)) {
      const payload = await upstream.clone().json();
      if (payload?.data?.appId !== "manris") return error(503, "Konfigurasi aplikasi auth tidak sesuai");
    }
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["Content-Type", "Retry-After", "X-Auth-App-Id"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return error(503, "Layanan auth tidak tersedia");
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as DELETE };
