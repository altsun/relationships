import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, isNull, isNotNull, or, ilike, inArray } from "drizzle-orm";
import { db } from "../db";
import { contacts, contactCategories, categories, contactNotes } from "../db/schema";
import { contactValues, noteContent, readObject, validUuid } from "../validation";

const app = new Hono();

// Lấy danh sách categoryId của một contact
async function getContactCategoryIds(contactId: string): Promise<string[]> {
  const rows = await db
    .select({ categoryId: contactCategories.categoryId })
    .from(contactCategories)
    .where(eq(contactCategories.contactId, contactId));
  return rows.map((r) => r.categoryId);
}

async function ownedCategoryIds(value: unknown, userId: string): Promise<string[] | null> {
  if (!Array.isArray(value) || value.length > 200 || !value.every(validUuid)) {
    return null;
  }

  const ids = [...new Set(value.map((id: string) => id.toLowerCase()))];
  if (ids.length === 0) return ids;

  const rows = await db.query.categories.findMany({
    columns: { id: true },
    where: and(eq(categories.userId, userId), inArray(categories.id, ids)),
  });
  return rows.length === ids.length ? ids : null;
}

// Gán categories cho contact (replace toàn bộ) — atomic
async function syncCategories(contactId: string, categoryIds: string[]) {
  await db.delete(contactCategories).where(eq(contactCategories.contactId, contactId));
  if (categoryIds.length > 0) {
    await db.insert(contactCategories).values(
      categoryIds.map((categoryId) => ({ contactId, categoryId })),
    );
  }
}

// Lấy contacts kèm categories (join thủ công để tránh N+1)
async function withCategories(rows: (typeof contacts.$inferSelect)[], userId: string) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const junctions = await db
    .select({
      contactId: contactCategories.contactId,
      id:        categories.id,
      name:      categories.name,
      color:     categories.color,
      sortIndex: categories.sortIndex,
    })
    .from(contactCategories)
    .innerJoin(categories, eq(contactCategories.categoryId, categories.id))
    .where(and(inArray(contactCategories.contactId, ids), eq(categories.userId, userId)))
    .orderBy(categories.sortIndex);

  const map = new Map<string, typeof junctions>();
  for (const j of junctions) {
    if (!map.has(j.contactId)) map.set(j.contactId, []);
    map.get(j.contactId)!.push(j);
  }

  return rows.map((r) => ({
    ...r,
    categories: (map.get(r.id) ?? []).map(({ contactId: _c, ...cat }) => cat),
  }));
}

// GET /api/contacts — hỗ trợ ?search=&sort=&categoryId=
app.get("/", async (c) => {
  const userId     = getAuth(c)!.userId!;
  const search     = c.req.query("search") ?? "";
  const sort       = c.req.query("sort")   ?? "fullName";
  const categoryId = c.req.query("categoryId");
  if (categoryId && !validUuid(categoryId)) return c.json({ error: "Invalid categoryId" }, 400);
  if (search.length > 500) return c.json({ error: "Invalid search" }, 400);

  let rows = await db.query.contacts.findMany({
    where: and(
      eq(contacts.userId, userId),
      isNull(contacts.archivedAt),
      search
        ? or(
            ilike(contacts.fullName, `%${search}%`),
            ilike(contacts.phone ?? "", `%${search}%`),
          )
        : undefined,
    ),
    orderBy: (t, { asc }) =>
      sort === "createdAt" ? [asc(t.createdAt)] : [asc(t.fullName)],
  });

  // Filter theo category sau khi query (đơn giản, đủ cho scale nhỏ)
  if (categoryId) {
    const inCategory = await db
      .select({ contactId: contactCategories.contactId })
      .from(contactCategories)
      .innerJoin(categories, eq(contactCategories.categoryId, categories.id))
      .where(and(eq(contactCategories.categoryId, categoryId), eq(categories.userId, userId)));
    const idSet = new Set(inCategory.map((r) => r.contactId));
    rows = rows.filter((r) => idSet.has(r.id));
  }

  return c.json(await withCategories(rows, userId));
});

// GET /api/contacts/archived
app.get("/archived", async (c) => {
  const userId = getAuth(c)!.userId!;
  const rows = await db.query.contacts.findMany({
    where: and(eq(contacts.userId, userId), isNotNull(contacts.archivedAt)),
    orderBy: (t, { desc }) => [desc(t.archivedAt)],
  });
  return c.json(await withCategories(rows, userId));
});

// GET /api/contacts/:id
app.get("/:id", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId = getAuth(c)!.userId!;
  const row = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, c.req.param("id")), eq(contacts.userId, userId)),
  });
  if (!row) return c.json({ error: "Not found" }, 404);
  const [withCat] = await withCategories([row], userId);
  return c.json(withCat);
});

// POST /api/contacts
app.post("/", async (c) => {
  const userId = getAuth(c)!.userId!;
  const { categoryIds: input = [], ...body } = await readObject(c);
  const values = contactValues(body, true);
  const categoryIds = await ownedCategoryIds(input, userId);
  if (!categoryIds) return c.json({ error: "Invalid categoryIds" }, 400);

  const [row] = await db.insert(contacts).values({ ...values, userId } as typeof contacts.$inferInsert).returning();

  await syncCategories(row.id, categoryIds);

  const [withCat] = await withCategories([row], userId);
  return c.json(withCat, 201);
});

// PUT /api/contacts/:id
app.put("/:id", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId = getAuth(c)!.userId!;
  const id     = c.req.param("id");
  const { categoryIds: input, ...body } = await readObject(c);
  const values = contactValues(body, false);
  const categoryIds = input === undefined ? undefined : await ownedCategoryIds(input, userId);
  if (categoryIds === null) return c.json({ error: "Invalid categoryIds" }, 400);

  const [row] = await db
    .update(contacts)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(contacts.id, id), eq(contacts.userId, userId)))
    .returning();

  if (!row) return c.json({ error: "Not found" }, 404);

  if (categoryIds !== undefined) {
    await syncCategories(id, categoryIds);
  }

  const [withCat] = await withCategories([row], userId);
  return c.json(withCat);
});

// DELETE /api/contacts/:id
app.delete("/:id", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId = getAuth(c)!.userId!;
  const [row] = await db
    .delete(contacts)
    .where(and(eq(contacts.id, c.req.param("id")), eq(contacts.userId, userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

// PATCH /api/contacts/:id/archive
app.patch("/:id/archive", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId = getAuth(c)!.userId!;
  const [row] = await db
    .update(contacts)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(contacts.id, c.req.param("id")), eq(contacts.userId, userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// PATCH /api/contacts/:id/unarchive
app.patch("/:id/unarchive", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId = getAuth(c)!.userId!;
  const [row] = await db
    .update(contacts)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(contacts.id, c.req.param("id")), eq(contacts.userId, userId)))
    .returning();
  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json(row);
});

// ── Notes ─────────────────────────────────────────────────────────────────────

async function requireContact(contactId: string, userId: string) {
  return db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
  });
}

// GET /api/contacts/:id/notes
app.get("/:id/notes", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId    = getAuth(c)!.userId!;
  const contactId = c.req.param("id");
  if (!await requireContact(contactId, userId)) return c.json({ error: "Not found" }, 404);

  const notes = await db.query.contactNotes.findMany({
    where: eq(contactNotes.contactId, contactId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return c.json(notes);
});

// POST /api/contacts/:id/notes
app.post("/:id/notes", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId    = getAuth(c)!.userId!;
  const contactId = c.req.param("id");
  if (!await requireContact(contactId, userId)) return c.json({ error: "Not found" }, 404);

  const content = noteContent(await readObject(c));

  const [note] = await db.insert(contactNotes).values({ contactId, content }).returning();
  return c.json(note, 201);
});

// PUT /api/contacts/:id/notes/:noteId
app.put("/:id/notes/:noteId", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId    = getAuth(c)!.userId!;
  const contactId = c.req.param("id");
  const noteId    = c.req.param("noteId");
  if (!validUuid(noteId)) return c.json({ error: "Not found" }, 404);
  if (!await requireContact(contactId, userId)) return c.json({ error: "Not found" }, 404);

  const content = noteContent(await readObject(c));

  const [note] = await db
    .update(contactNotes)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(contactNotes.id, noteId), eq(contactNotes.contactId, contactId)))
    .returning();
  if (!note) return c.json({ error: "Not found" }, 404);
  return c.json(note);
});

// DELETE /api/contacts/:id/notes/:noteId
app.delete("/:id/notes/:noteId", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId    = getAuth(c)!.userId!;
  const contactId = c.req.param("id");
  const noteId    = c.req.param("noteId");
  if (!validUuid(noteId)) return c.json({ error: "Not found" }, 404);
  if (!await requireContact(contactId, userId)) return c.json({ error: "Not found" }, 404);

  const [note] = await db
    .delete(contactNotes)
    .where(and(eq(contactNotes.id, noteId), eq(contactNotes.contactId, contactId)))
    .returning();
  if (!note) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default app;
