import { Hono } from "hono";
import { cors } from "hono/cors";
import { clerkMiddleware, requireAuth } from "./middleware/auth";
import contactsRoute   from "./routes/contacts";
import birthdaysRoute  from "./routes/birthdays";
import categoriesRoute from "./routes/categories";

const app = new Hono();

const allowedOrigins = process.env.WEB_ORIGIN?.split(",") || ["*"];

app.use("*", cors({
  origin: (origin) => {
    if (!origin || allowedOrigins.includes("*")) return "*";
    return allowedOrigins.find((o) => origin === o.trim()) || null;
  },
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));

app.use("*", clerkMiddleware());

app.get("/", (c) => c.json({ ok: true }));

app.use("/api/*", requireAuth);
app.route("/api/contacts",   contactsRoute);
app.route("/api/birthdays",  birthdaysRoute);
app.route("/api/categories", categoriesRoute);

export default app;
