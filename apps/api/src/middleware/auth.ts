import { createClerkClient } from "@clerk/backend";
import { createMiddleware } from "hono/factory";
import { getAuth } from "@hono/clerk-auth";

// Singleton client — JWKS is cached across requests instead of re-fetched each time
const clerk = createClerkClient({
  secretKey:       process.env.CLERK_SECRET_KEY!,
  publishableKey:  process.env.CLERK_PUBLISHABLE_KEY!,
});

export function clerkMiddleware() {
  return createMiddleware(async (c, next) => {
    const requestState = await clerk.authenticateRequest(c.req.raw, {
      secretKey:      process.env.CLERK_SECRET_KEY!,
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY!,
    });
    if (requestState.headers) {
      requestState.headers.forEach((value, key) => c.res.headers.append(key, value));
      const locationHeader = requestState.headers.get("location");
      if (locationHeader) {
        return c.redirect(locationHeader, 307);
      } else if (requestState.status === "handshake") {
        throw new Error("Clerk: unexpected handshake without redirect");
      }
    }
    c.set("clerkAuth", requestState.toAuth());
    c.set("clerk", clerk);
    await next();
  });
}

export const requireAuth = createMiddleware(async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});
