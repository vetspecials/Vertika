export const config = { runtime: "edge" };

// نام متغیر محیطی را در پنل ورسل به DATA_SYNC_POINT تغییر دهید
const REMOTE_POINT = (process.env.DATA_SYNC_POINT || "").replace(/\/$/, "");

const IGNORE_LIST = new Set([
  "host",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "forwarded",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-forwarded-port",
]);

export default async function (request) {
  if (!REMOTE_POINT) {
    return new Response("Service Unavailable", { status: 503 });
  }

  try {
    const url = new URL(request.url);
    const targetPath = REMOTE_POINT + url.pathname + url.search;

    const modifiedHeaders = new Headers();
    let addr = null;

    for (const [key, val] of request.headers) {
      const k = key.toLowerCase();
      if (IGNORE_LIST.has(k) || k.startsWith("x-vercel-")) continue;
      if (k === "x-real-ip" || k === "x-forwarded-for") {
        addr = val;
        continue;
      }
      modifiedHeaders.set(key, val);
    }
    
    if (addr) modifiedHeaders.set("x-forwarded-for", addr);

    const reqMode = request.method;
    const isStream = reqMode !== "GET" && reqMode !== "HEAD";

    return await fetch(targetPath, {
      method: reqMode,
      headers: modifiedHeaders,
      body: isStream ? request.body : undefined,
      duplex: "half",
      redirect: "manual",
    });
  } catch (err) {
    return new Response(null, { status: 500 });
  }
}
