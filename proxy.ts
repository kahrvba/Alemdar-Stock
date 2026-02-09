import { NextResponse } from "next/server";

const ALLOWED_IPS: string[] = [
  "94.78.68.9",
  "185.110.243.138",
  "192.168.9.103",
  "94.78.99.241",
  "127.0.0.1",
  "197.57.53.195",
  "::1",
];
// use it like this: https://alemadmindashboard.vercel.app/?key=d59e89952d716faa6db181b1f735b794
const EMERGENCY_KEY = "d59e89952d716faa6db181b1f735b794";

const EXCLUDED_PATHS = ["/favicon.ico"];

function isExcluded(url: URL) {
  const path = url.pathname;
  // allow Next internals and API calls to bypass the proxy
  if (path.startsWith("/_next/")) return true;
  if (path.startsWith("/api/")) return true;
  if (EXCLUDED_PATHS.includes(path)) return true;
  return false;
}

function getClientIp(req: Request) {
  // @ts-expect-error: ip may exist on the request in some deployments
  const directIp = typeof req.ip === "string" ? req.ip : null;
  if (directIp) return directIp;
  const fwd = req.headers.get("x-forwarded-for");
  if (!fwd) return null;
  const first = fwd.split(",")[0]?.trim();
  return first || null;
}

export default function proxy(req: Request) {
  const url = new URL(req.url);

  if (isExcluded(url)) {
    return NextResponse.next();
  }

  const emergencyKey = url.searchParams.get("key");
  if (emergencyKey && emergencyKey === EMERGENCY_KEY) {
    return NextResponse.next();
  }

  const clientIp = getClientIp(req);

  if (clientIp && ALLOWED_IPS.includes(clientIp)) {
    return NextResponse.next();
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Access Denied</title>
  <style>
    :root { color-scheme: light dark; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; font-family: system-ui, -apple-system, sans-serif; background:#0b0b0b; color:#f5f5f5; }
    .card { padding:24px 28px; border:1px solid #2a2a2a; border-radius:16px; max-width:360px; text-align:center; background:rgba(255,255,255,0.02); box-shadow:0 10px 40px rgba(0,0,0,0.35); }
    h1 { margin:0 0 8px; font-size:20px; letter-spacing:0.04em; text-transform:uppercase; }
    p { margin:6px 0; line-height:1.5; font-size:14px; color:#d0d0d0; }
    code { font-size:13px; color:#7fd1ff; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Access Denied</h1>
    <p>You don't have access to this site.</p>
  </div>
</body>
</html>`;

  return new Response(html, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
