const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Hono } = require("hono");

process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1/test";

const birthdays = require("../src/routes/birthdays.ts").default;
const { db } = require("../src/db/index.ts");
const { requireAuth } = require("../src/middleware/auth.ts");

const user = "fixture_user";
const november = [2026, 11, 24, 10, 30];
const today = ["11-24", 0, true];
const tomorrow = ["11-25", 1, false];

const cases = [
  { name: "today as the only birthday", now: november,
    rows: ["11-24"], expected: [today] },
  { name: "today first", now: november,
    rows: ["11-24", "11-25"], expected: [today, tomorrow] },
  { name: "today in the middle", now: november,
    rows: ["11-25", "11-24", "11-26"], expected: [today, tomorrow, ["11-26", 2, false]] },
  { name: "today last", now: november,
    rows: ["11-25", "11-24"], expected: [today, tomorrow] },
  { name: "tomorrow only", now: november,
    rows: ["11-25"], expected: [tomorrow] },
  { name: "year rollover", now: [2026, 12, 31, 10, 30],
    rows: ["01-01", "12-30", "12-31", "01-30", "01-31"],
    expected: [["12-31", 0, true], ["01-01", 1, false], ["01-30", 30, false]] },
  { name: "leap day is tomorrow in a leap year", now: [2028, 2, 28, 10, 30],
    rows: ["03-01", "02-29"], expected: [["02-29", 1, false], ["03-01", 2, false]] },
  { name: "leap day is today", now: [2028, 2, 29, 10, 30],
    rows: ["02-29", "03-01"], expected: [["02-29", 0, true], ["03-01", 1, false]] },
  { name: "non-leap year retains March 1 rollover", now: [2027, 2, 28, 10, 30],
    rows: ["02-29"], expected: [["02-29", 1, false]] },
  { name: "30-day boundary is inclusive", now: november,
    rows: ["12-25", "12-24", "11-23", "12-23", "11-24"],
    expected: [today, ["12-23", 29, false], ["12-24", 30, false]] },
  { name: "local date is used even when UTC is still yesterday", tz: "Asia/Ho_Chi_Minh",
    now: [2026, 11, 24, 0, 15], rows: ["11-23", "11-24", "11-25"],
    expected: [today, tomorrow] },
  { name: "DST fall-back does not add an extra calendar day", tz: "America/New_York",
    now: [2026, 11, 1, 10, 30], rows: ["11-02", "12-01", "12-02"],
    expected: [["11-02", 1, false], ["12-01", 30, false]] },
];

// Match the existing API tests: Hono requests with synthetic Clerk auth.
// Stub only the DB read to control row order and prevent any Neon access.
for (const { name, tz = "UTC", now, rows, expected } of cases) {
  test(name, async (t) => {
    const originalTZ = process.env.TZ;
    t.after(() => {
      if (originalTZ === undefined) delete process.env.TZ;
      else process.env.TZ = originalTZ;
    });
    process.env.TZ = tz;
    const [year, month, day, hour, minute] = now;
    t.mock.timers.enable({ apis: ["Date"], now: new Date(year, month - 1, day, hour, minute) });

    const findMany = t.mock.method(db.query.contacts, "findMany", async () =>
      rows.map((birthday, index) => ({
        id: `fixture-${index}`, fullName: `Contact ${index}`, birthday,
        birthYear: null, phone: null,
      })),
    );
    const app = new Hono();
    app.use("/api/*", async (c, next) => {
      c.set("clerkAuth", { userId: user });
      await next();
    });
    app.use("/api/*", requireAuth);
    app.route("/api/birthdays", birthdays);

    const response = await app.request("/api/birthdays/upcoming");
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.deepEqual(body.map(({ birthday, daysUntil, isToday }) => [birthday, daysUntil, isToday]), expected);
    assert.equal(findMany.mock.callCount(), 1);
  });
}
