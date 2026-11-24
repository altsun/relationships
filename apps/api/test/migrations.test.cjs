const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const { drizzle } = require("drizzle-orm/pglite");
const { migrate } = require("drizzle-orm/pglite/migrator");
const { readMigrationFiles } = require("drizzle-orm/migrator");
const { generateDrizzleJson, generateMigration } = require("drizzle-kit/api");
const schema = require("../src/db/schema.ts");
const folder = path.resolve(__dirname, "../src/db/migrations");

test("migration history matches schema and supports fresh and previously applied databases", async (t) => {
  const journal = JSON.parse(fs.readFileSync(path.join(folder, "meta/_journal.json"), "utf8"));
  assert.deepEqual(journal.entries.map(e => e.tag + ".sql").sort(), fs.readdirSync(folder).filter(f => f.endsWith(".sql")).sort());
  for (let i = 1; i < journal.entries.length; i++) assert.ok(journal.entries[i].when > journal.entries[i - 1].when);
  const snapshot = JSON.parse(fs.readFileSync(path.join(folder, "meta/0001_snapshot.json"), "utf8"));
  assert.deepEqual(await generateMigration(snapshot, generateDrizzleJson(schema)), []);
  for (const preapplied of [false, true]) {
    await t.test(preapplied ? "previously applied SQL" : "fresh database", async () => {
      const pg = new PGlite();
      try {
        if (preapplied) {
          for (const migration of readMigrationFiles({ migrationsFolder: folder })) {
            for (const statement of migration.sql) await pg.exec(statement);
          }
          await pg.exec('CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)');
          const first = readMigrationFiles({ migrationsFolder: folder })[0];
          await pg.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)', [first.hash, first.folderMillis]);
        }
        const db = drizzle(pg);
        await migrate(db, { migrationsFolder: folder });
        await migrate(db, { migrationsFolder: folder });
        const [contact] = await db.insert(schema.contacts).values({ userId: "fixture", fullName: "Fixture", jobNotes: "job" }).returning();
        await db.insert(schema.contactNotes).values({ contactId: contact.id, content: "note" });
        assert.equal(contact.jobNotes, "job");
        assert.equal((await db.select().from(schema.contactNotes))[0].content, "note");
        await db.delete(schema.contacts);
        assert.deepEqual(await db.select().from(schema.contactNotes), []);
      } finally { await pg.close(); }
    });
  }
});
