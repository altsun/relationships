const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Hono } = require("hono");
const { neonConfig } = require("@neondatabase/serverless");

process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1/test";

const contacts = require("../src/routes/contacts.ts").default;
const categories = require("../src/routes/categories.ts").default;
const { requireAuth } = require("../src/middleware/auth.ts");

const user = "user_one";
const ownedId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

function setup(t, results) {
  const queries = [];
  const originalFetch = neonConfig.fetchFunction;
  t.after(() => { neonConfig.fetchFunction = originalFetch; });
  neonConfig.fetchFunction = async (_url, options) => {
    queries.push(JSON.parse(options.body));
    const result = results[queries.length - 1];
    assert.ok(result, "Unexpected query");
    const [column, values] = result;
    return Response.json({
      fields: [{ name: column, dataTypeID: 25 }],
      rows: values.map((value) => [value]),
    });
  };

  const app = new Hono();
  app.use("/api/*", async (c, next) => {
    c.set("clerkAuth", { userId: user });
    await next();
  });
  app.use("/api/*", requireAuth);
  app.route("/api/contacts", contacts);
  app.route("/api/categories", categories);
  return { app, queries };
}

test("a category from another account is rejected before contact creation or update", async (t) => {
  const { app, queries } = setup(t, [["id", [ownedId]], ["id", [ownedId]]]);
  for (const [method, path] of [
    ["POST", "/api/contacts"],
    ["PUT", "/api/contacts/" + ownedId],
  ]) {
    const result = await app.request(path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName: "Contact", categoryIds: [ownedId, otherId] }),
    });
    assert.equal(result.status, 400);
  }
  assert.equal(queries.length, 2);
  for (const { query, params } of queries) {
    assert.match(query, /^select .*"categories".*"user_id"/);
    assert.deepEqual(params, [user, ownedId, otherId]);
  }
});

test("deleting another account's category returns 404 before checking or deleting links", async (t) => {
  const { app, queries } = setup(t, [["id", []]]);
  const result = await app.request("/api/categories/" + otherId, { method: "DELETE" });
  assert.equal(result.status, 404);
  assert.equal(queries.length, 1);
  assert.match(queries[0].query, /^select .*"categories".*"user_id"/);
  assert.deepEqual(queries[0].params.slice(0, 2), [otherId, user]);
});

test("deleting an owned category preserves the conflict response and scopes forced deletion", async (t) => {
  const { app, queries } = setup(t, [
    ["id", [ownedId]], ["total", ["2"]],
    ["id", [ownedId]], ["total", ["2"]], ["id", []], ["id", [ownedId]],
  ]);
  const path = "/api/categories/" + ownedId;
  const conflict = await app.request(path, { method: "DELETE" });
  assert.equal(conflict.status, 409);
  assert.equal((await conflict.json()).contactCount, 2);
  const result = await app.request(path + "?force=true", { method: "DELETE" });
  assert.equal(result.status, 200);
  assert.equal(queries.length, 6);
  for (const { query, params } of [queries[1], queries[3], queries[4], queries[5]]) {
    assert.match(query, /"user_id"/);
    assert.deepEqual(params, [ownedId, user]);
  }
  assert.match(queries[4].query, /^delete from "contact_categories"/);
});
