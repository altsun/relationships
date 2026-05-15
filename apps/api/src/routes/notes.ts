import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { contacts, contactNotes } from "../db/schema";

const app = new Hono();

// GET /api/contacts/:id/notes
app.get("/", async (c) => {
  const userId    = getAuth(c)!.userId!;
  const contactId = c.req.param("id");

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
  });
  if (!contact) return c.json({ error: "Not found" }, 404);

  const notes = await db.query.contactNotes.findMany({
    where: eq(contactNotes.contactId, contactId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
  return c.json(notes);
});

// POST /api/contacts/:id/notes
app.post("/", async (c) => {
  const userId    = getAuth(c)!.userId!;
  const contactId = c.req.param("id");

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
  });
  if (!contact) return c.json({ error: "Not found" }, 404);

  const { content } = await c.req.json<{ content: string }>();
  if (!content?.trim()) return c.json({ error: "content is required" }, 400);

  const [note] = await db.insert(contactNotes).values({ contactId, content: content.trim() }).returning();
  return c.json(note, 201);
});

// PUT /api/contacts/:id/notes/:noteId
app.put("/:noteId", async (c) => {
  const userId    = getAuth(c)!.userId!;
  const contactId = c.req.param("id");
  const noteId    = c.req.param("noteId");

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
  });
  if (!contact) return c.json({ error: "Not found" }, 404);

  const { content } = await c.req.json<{ content: string }>();
  if (!content?.trim()) return c.json({ error: "content is required" }, 400);

  const [note] = await db
    .update(contactNotes)
    .set({ content: content.trim(), updatedAt: new Date() })
    .where(and(eq(contactNotes.id, noteId), eq(contactNotes.contactId, contactId)))
    .returning();

  if (!note) return c.json({ error: "Not found" }, 404);
  return c.json(note);
});

// DELETE /api/contacts/:id/notes/:noteId
app.delete("/:noteId", async (c) => {
  const userId    = getAuth(c)!.userId!;
  const contactId = c.req.param("id");
  const noteId    = c.req.param("noteId");

  const contact = await db.query.contacts.findFirst({
    where: and(eq(contacts.id, contactId), eq(contacts.userId, userId)),
  });
  if (!contact) return c.json({ error: "Not found" }, 404);

  const [note] = await db
    .delete(contactNotes)
    .where(and(eq(contactNotes.id, noteId), eq(contactNotes.contactId, contactId)))
    .returning();

  if (!note) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default app;
