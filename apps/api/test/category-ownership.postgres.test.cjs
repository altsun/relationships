const { test } = require("node:test");
const assert = require("node:assert/strict");
const { PGlite } = require("@electric-sql/pglite");
const { neonConfig } = require("@neondatabase/serverless");
const { generateDrizzleJson, generateMigration } = require("drizzle-kit/api");
const { drizzle } = require("drizzle-orm/pglite");
const { Hono } = require("hono");

process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1/test";

const schema = require("../src/db/schema.ts");
const { requireAuth } = require("../src/middleware/auth.ts");
const contactsRoute = require("../src/routes/contacts.ts").default;

const alice = "fixture_alice";
const bob = "fixture_bob";
const owned = { id: "11111111-1111-4111-8111-111111111111", name: "Owned", color: "#123456", sortIndex: 0 };
const foreign = { id: "22222222-2222-4222-8222-222222222222", name: "Foreign", color: "#abcdef", sortIndex: 1 };
const active = "33333333-3333-4333-8333-333333333333";
const archived = "44444444-4444-4444-8444-444444444444";
const otherContact = "55555555-5555-4555-8555-555555555555";

test("contact reads enforce category ownership in PostgreSQL", async (t) => {
  const postgres = new PGlite();
  t.after(() => postgres.close());

  // Generate the schema the routes use, including columns added after the initial migration.
  const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
  for (const statement of statements) await postgres.exec(statement);

  const database = drizzle(postgres);
  await database.insert(schema.contacts).values([
    { id: active, userId: alice, fullName: "Active fixture" },
    { id: archived, userId: alice, fullName: "Archived fixture", archivedAt: new Date("2026-01-01T00:00:00Z") },
    { id: otherContact, userId: bob, fullName: "Other account fixture" },
  ]);
  await database.insert(schema.categories).values([
    { ...owned, userId: alice },
    { ...foreign, userId: bob },
  ]);
  await database.insert(schema.contactCategories).values([
    { contactId: active, categoryId: owned.id },
    { contactId: active, categoryId: foreign.id },
    { contactId: archived, categoryId: foreign.id },
    { contactId: otherContact, categoryId: foreign.id },
    { contactId: otherContact, categoryId: owned.id },
  ]);

  const originalFetch = neonConfig.fetchFunction;
  t.after(() => { neonConfig.fetchFunction = originalFetch; });
  neonConfig.fetchFunction = async (_url, options) => {
    const { query, params } = JSON.parse(options.body);
    const { fields, rows } = await postgres.query(query, params, { rowMode: "array" });

    // Neon HTTP sends PostgreSQL values in their text representation.
    return Response.json({
      fields,
      rows: rows.map((row) => row.map((value) => {
        if (value === null) return null;
        if (value instanceof Date) return value.toISOString().slice(0, -1).replace("T", " ");
        return String(value);
      })),
    });
  };

  const app = new Hono();
  app.use("/api/*", async (c, next) => {
    c.set("clerkAuth", { userId: alice });
    await next();
  });
  app.use("/api/*", requireAuth);
  app.route("/api/contacts", contactsRoute);

  function contactSummary({ id, userId, categories }) {
    return { id, userId, categories };
  }

  const activeSummary = { id: active, userId: alice, categories: [owned] };
  const archivedSummary = { id: archived, userId: alice, categories: [] };
  for (const [path, expected] of [
    ["/api/contacts", [activeSummary]],
    ["/api/contacts/archived", [archivedSummary]],
    ["/api/contacts/" + active, activeSummary],
    ["/api/contacts?categoryId=" + foreign.id, []],
    ["/api/contacts?categoryId=" + owned.id, [activeSummary]],
  ]) {
    await t.test(path, async () => {
      const response = await app.request(path);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.deepEqual(Array.isArray(expected) ? body.map(contactSummary) : contactSummary(body), expected);
    });
  }

  await t.test("contact detail from another account returns 404", async () => {
    const response = await app.request("/api/contacts/" + otherContact);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: "Not found" });
  });
});
