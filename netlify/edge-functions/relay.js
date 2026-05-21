const FALLBACK_PAGE = "https://ir-netlify.github.io/NETLIFY/new/new.html";

const BLOCKED_HEADERS = [
  "host", "connection", "keep-alive", "proxy-authenticate",
  "proxy-authorization", "te", "trailer", "transfer-encoding",
  "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto", "x-forwarded-port"
];

const METHOD_WITHOUT_BODY = new Set(["GET", "HEAD"]);

const normalizeOrigin = (value) => value?.replace(/\/+$/, "") || "";

const buildUrl = (origin, path, query) => {
  if (!origin) return null;
  if (origin.startsWith("http://") || origin.startsWith("https://")) {
    return `${origin}${path}${query}`;
  }
  const isHttps = !origin.includes(":") || origin.includes(":443") || /^s\d+\./.test(origin);
  return `${isHttps ? "https://" : "http://"}${origin}${path}${query}`;
};

const copyRequestHeaders = (req) => {
  const headers = new Headers();
  let forwardedFor = null;

  req.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (
      BLOCKED_HEADERS.includes(lowerKey) ||
      lowerKey.startsWith("x-nf-") ||
      lowerKey.startsWith("x-netlify-") ||
      lowerKey === "x-host"
    ) {
      return;
    }

    if (lowerKey === "x-real-ip" || lowerKey === "x-forwarded-for") {
      if (!forwardedFor) forwardedFor = value;
      return;
    }

    headers.set(lowerKey, value);
  });

  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  return headers;
};

const resolveRouteMode = (req) => {
  const mode = (Deno.env.get("PROXY_MODE") || "auto").toLowerCase();
  if (mode === "first" || mode === "second") return mode;

  if (req.headers.get("x-proxy-hop") === "project-1") return "second";
  return "first";
};

const resolveUpstream = (mode, req) => {
  const xHost = req.headers.get("x-host");

  if (mode === "first") {
    return normalizeOrigin(Deno.env.get("NEXT_PROJECT_URL") || xHost);
  }

  return normalizeOrigin(Deno.env.get("TARGET_ORIGIN") || xHost);
};

const setHopHeaders = (mode, headers) => {
  if (mode === "first") {
    headers.set("x-proxy-hop", "project-1");
  }
  if (mode === "second") {
    headers.set("x-proxy-hop", "project-2");
  }
};

export default async (req) => {
  try {
    const parsedUrl = new URL(req.url);
    const routeMode = resolveRouteMode(req);
    const upstream = resolveUpstream(routeMode, req);

    if (parsedUrl.pathname === "/" && !upstream) {
      const wsCheck = (req.headers.get("upgrade") || "").toLowerCase();
      if (wsCheck !== "websocket") {
        const fallbackRes = await fetch(FALLBACK_PAGE);
        return new Response(await fallbackRes.text(), {
          headers: { "content-type": "text/html; charset=UTF-8" },
        });
      }
    }

    if (!upstream) {
      const helpText =
        "Invalid request: missing upstream. Set NEXT_PROJECT_URL (project-1) or TARGET_ORIGIN (project-2), or send x-host.";
      return new Response(helpText, { status: 400 });
    }

    const finalUrl = buildUrl(upstream, parsedUrl.pathname, parsedUrl.search);
    const proxyHeaders = copyRequestHeaders(req);
    setHopHeaders(routeMode, proxyHeaders);

    const serverRes = await fetch(finalUrl, {
      method: req.method,
      headers: proxyHeaders,
      redirect: "manual",
      body: METHOD_WITHOUT_BODY.has(req.method) ? undefined : req.body,
    });

    const responseHeaders = new Headers();
    serverRes.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding") responseHeaders.set(key, value);
    });

    responseHeaders.set("x-netlify-proxy-mode", routeMode);

    return new Response(serverRes.body, {
      status: serverRes.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Gateway Error: Connection Failed", { status: 502 });
  }
};
