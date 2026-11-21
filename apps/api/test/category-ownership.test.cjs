const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Hono } = require("hono");
const { getTableColumns } = require("drizzle-orm");
const { neonConfig } = require("@neondatabase/serverless");

process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1/test";

const contacts = require("../src/routes/contacts.ts").default;
const categories = require("../src/routes/categories.ts").default;
const { contacts: contactsTable } = require("../src/db/schema.ts");
const { requireAuth } = require("../src/middleware/auth.ts");

const user = "user_one";
const ownedId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

function setup(t, results) {
  const queries = [];
  const originalFetch = neonConfig.fetchFunction;
  t.after(() => { neonConfig.fetchFunction = originalFetch; });
  neonConfig.fetchFunction = async (_url, options) => {
    const query = JSON.parse(options.body);
    queries.push(query);
    const result = results[queries.length - 1];
    assert.ok(result, "Unexpected query");
    if (typeof result === "function") return result(query);
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

const activeId = "33333333-3333-4333-8333-333333333333";
const archivedId = "44444444-4444-4444-8444-444444444444";
const activeContact = { id: activeId, user_id: user, full_name: "Active fixture" };
const archivedContact = {
  id: archivedId,
  user_id: user,
  full_name: "Archived fixture",
  archived_at: "2026-01-01 00:00:00",
};

const ownedCategory = { id: ownedId, name: "Owned fixture", color: "#123456", sortIndex: 0 };
const foreignCategory = { id: otherId, name: "Foreign fixture", color: "#abcdef", sortIndex: 1 };
const legacyLinks = [
  { contactId: activeId, owner: user, category: ownedCategory },
  { contactId: activeId, owner: "user_two", category: foreignCategory },
  { contactId: archivedId, owner: "user_two", category: foreignCategory },
];

function neonRows(columns, rows) {
  return Response.json({
    fields: columns.map((name) => ({ name, dataTypeID: 25 })),
    rows,
  });
}

function contactResult(contact, predicate, expectedParams) {
  return ({ query, params }) => {
    assert.match(query, /where .*"contacts"\."user_id" = \$\d+/);
    assert.match(query, predicate);
    assert.deepEqual(params.slice(0, expectedParams.length), expectedParams);
    const columns = Object.values(getTableColumns(contactsTable)).map(({ name }) => name);
    return neonRows(columns, [columns.map((name) => contact[name] ?? null)]);
  };
}

function categoryResult({ contactId, categoryId }) {
  return ({ query, params }) => {
    assert.match(query, /inner join "categories" on "contact_categories"\."category_id" = "categories"\."id"/);
    const ownerParam = /\bwhere\b.*"categories"\."user_id" = \$(\d+)/.exec(query);
    assert.ok(ownerParam, "Category lookup must constrain the joined category owner");
    const owner = params[Number(ownerParam[1]) - 1];
    assert.equal(owner, user);

    if (categoryId) {
      assert.match(query, /\bwhere\b.*"contact_categories"\."category_id" = \$1/);
      assert.deepEqual(params, [categoryId, user]);
      const matches = legacyLinks.filter((link) => link.category.id === categoryId && link.owner === owner);
      return neonRows(["contact_id"], matches.map((link) => [link.contactId]));
    }

    assert.match(query, /\bwhere\b.*"contact_categories"\."contact_id" in \(\$1\)/);
    assert.deepEqual(params, [contactId, user]);
    const matches = legacyLinks.filter((link) => link.contactId === contactId && link.owner === owner);
    return neonRows(
      ["contact_id", "id", "name", "color", "sort_index"],
      matches.map(({ contactId, category }) => [
        contactId, category.id, category.name, category.color, String(category.sortIndex),
      ]),
    );
  };
}

for (const { name, path, contact, predicate, params, expected, detail } of [
  {
    name: "active contacts retain owned categories and omit foreign links",
    path: "/api/contacts",
    contact: activeContact,
    predicate: /"contacts"\."archived_at" is null/,
    params: [user],
    expected: [ownedCategory],
  },
  {
    name: "archived contacts with only a foreign link have no categories",
    path: "/api/contacts/archived",
    contact: archivedContact,
    predicate: /"contacts"\."archived_at" is not null/,
    params: [user],
    expected: [],
  },
  {
    name: "contact detail retains owned categories and omits foreign links",
    path: "/api/contacts/" + activeId,
    contact: activeContact,
    predicate: /"contacts"\."id" = \$1/,
    params: [activeId, user],
    expected: [ownedCategory],
    detail: true,
  },
]) {
  test(name, async (t) => {
    const { app, queries } = setup(t, [
      contactResult(contact, predicate, params),
      categoryResult({ contactId: contact.id }),
    ]);
    const response = await app.request(path);
    assert.equal(response.status, 200);
    const body = await response.json();
    const expectedContact = { id: contact.id, categories: expected };
    assert.deepEqual(
      detail ? { id: body.id, categories: body.categories } : body.map(({ id, categories }) => ({ id, categories })),
      detail ? expectedContact : [expectedContact],
    );
    assert.equal(queries.length, 2);
  });
}

for (const { categoryId, expected, name } of [
  { categoryId: otherId, expected: [], name: "filtering by a foreign category ignores a legacy link" },
  { categoryId: ownedId, expected: [ownedCategory], name: "filtering by an owned category retains the matching contact" },
]) {
  test(name, async (t) => {
    const results = [
      contactResult(activeContact, /"contacts"\."archived_at" is null/, [user]),
      categoryResult({ categoryId }),
    ];
    if (expected.length) results.push(categoryResult({ contactId: activeId }));
    const { app, queries } = setup(t, results);
    const response = await app.request("/api/contacts?categoryId=" + categoryId);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(
      body.map(({ id, categories }) => ({ id, categories })),
      expected.length ? [{ id: activeId, categories: expected }] : [],
    );
    assert.equal(queries.length, results.length);
  });
}
