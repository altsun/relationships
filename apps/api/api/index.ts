import type { IncomingMessage, ServerResponse } from "http";
import app from "../src/index";

// Vercel pre-buffers the request body before our handler runs, so streaming
// listeners on IncomingMessage never fire. We must read the body synchronously
// from req.read() or buffer it up-front, then hand a proper Web API Request
// to Hono's fetch handler.

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)),
    );
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
    // If data was already fully buffered by Vercel, emit it now
    if (req.readableEnded) resolve(Buffer.concat(chunks));
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const proto = (req.headers["x-forwarded-proto"] as string) ?? "https";
  const host  = (req.headers["x-forwarded-host"] as string) ?? req.headers.host ?? "localhost";
  const url   = `${proto}://${host}${req.url}`;

  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val != null) headers.set(key, Array.isArray(val) ? val.join(", ") : val);
  }

  const method = req.method ?? "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  let bodyInit: string | null = null;
  if (hasBody) {
    const buf = await readBody(req);
    if (buf.length > 0) bodyInit = buf.toString(); // UTF-8; all our endpoints speak JSON
  }

  const request = new Request(url, {
    method,
    headers,
    body: bodyInit,
  });

  const response = await app.fetch(request);

  res.statusCode = response.status;
  response.headers.forEach((val, key) => res.setHeader(key, val));
  const buf = Buffer.from(await response.arrayBuffer());
  res.end(buf);
}
