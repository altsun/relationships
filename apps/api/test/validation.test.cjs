const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Hono } = require("hono");
const { contactValues, categoryValues, reorderValues, noteContent, readObject } = require("../src/validation.ts");

const id = "11111111-1111-4111-8111-111111111111";
const invalid = fn => assert.throws(fn, error => error.status === 400);

test("contact fields are allowlisted, null can clear fields, omissions preserve existing values", () => {
  assert.deepEqual(contactValues({ fullName: " Example ", birthday: "02-29", birthYear: null, phone: "", workStartAm: "", userId: "other", id, archivedAt: "x", unknown: true }, true), {
    fullName: "Example", birthday: "02-29", birthYear: null, phone: "", workStartAm: null,
  });
  assert.deepEqual(contactValues({ notes: "Synthetic fixture" }, false), { notes: "Synthetic fixture" });
  assert.deepEqual(contactValues({ birthday: "", family: { text: "Example" }, hobbies: ["Reading"], workEndPm: "17:30:00" }, false), {
    birthday: null, workEndPm: "17:30:00", family: { text: "Example" }, hobbies: ["Reading"],
  });
});

test("invalid contact payloads are rejected", () => {
  for (const body of [
    {}, { fullName: " " }, { fullName: 2 }, { fullName: "Example", birthYear: "2000" },
    { fullName: "Example", birthday: "02-30" }, { fullName: "Example", birthday: "13-01" },
    { fullName: "Example", workStartAm: "99:00" }, { fullName: "Example", family: "x" },
    { fullName: "Example", hobbies: [1] }, { fullName: "Example", hasWorkSchedule: "false" },
    { fullName: "Example", notes: "x".repeat(10001) },
  ]) invalid(() => contactValues(body, true));
});

test("categories, reordering, and notes validate types and bounds", () => {
  assert.deepEqual(categoryValues({ name: " Example ", color: "#abcdef" }, true), { name: "Example", color: "#abcdef", sortIndex: 0 });
  assert.deepEqual(categoryValues({ sortIndex: 2, userId: "other" }, false), { sortIndex: 2 });
  assert.deepEqual(reorderValues([{ id, sortIndex: 0 }]), [{ id, sortIndex: 0 }]);
  assert.equal(noteContent({ content: " Example " }), "Example");
  for (const body of [{ name: "", color: "#abcdef" }, { name: "X", color: "red" }, { name: 1, color: "#abcdef" }, { name: "X", color: "#abcdef", sortIndex: 1.5 }]) invalid(() => categoryValues(body, true));
  for (const body of [null, {}, [{ id: "bad", sortIndex: 0 }], [{ id, sortIndex: -1 }], [{ id, sortIndex: 0 }, { id, sortIndex: 1 }]]) invalid(() => reorderValues(body));
  for (const content of [null, 12, " ", "x".repeat(10001)]) invalid(() => noteContent({ content }));
});

test("malformed and non-object JSON produce JSON 400 responses", async () => {
  const app = new Hono();
  app.post("/", async c => c.json(await readObject(c)));
  for (const body of ["{", "null", "[]", "123"]) {
    const response = await app.request("/", { method: "POST", headers: { "content-type": "application/json" }, body });
    assert.equal(response.status, 400);
    assert.equal(typeof (await response.json()).error, "string");
  }
});
