import { createMiddleware } from "hono/factory";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";

export const requireAuth = createMiddleware(async (c, next) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  await next();
});

export { clerkMiddleware };
