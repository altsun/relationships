import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { clerkMiddleware, requireAuth } from "./middleware/auth";
import contactsRoute   from "./routes/contacts";
import birthdaysRoute  from "./routes/birthdays";
import categoriesRoute from "./routes/categories";

const app = new Hono();

const allowedOrigins = (process.env.WEB_ORIGIN ?? "").split(",").map(origin => origin.trim()).filter(origin => origin !== "" && origin !== "*");

// Sensitive account data must not be cached by browsers or intermediaries.
app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});

app.use("*", cors({
  origin: (origin) => {
    return allowedOrigins.includes(origin) ? origin : null;
  },
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use("*", clerkMiddleware());

app.get("/", (c) => c.json({ ok: true }));

app.use("/api/*", requireAuth);
app.use("/api/*", bodyLimit({ maxSize: 256 * 1024, onError: (c) => c.json({ error: "Request too large" }, 413) }));
app.route("/api/contacts",   contactsRoute);
app.route("/api/birthdays",  birthdaysRoute);
app.route("/api/categories", categoriesRoute);

export default app;
