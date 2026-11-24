import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, count, inArray } from "drizzle-orm";
import { db } from "../db";
import { categories, contactCategories } from "../db/schema";
import { categoryValues, readObject, readJson, reorderValues, validUuid } from "../validation";

const app = new Hono();

// GET /api/categories
app.get("/", async (c) => {
  const userId = getAuth(c)!.userId!;
  const rows = await db.query.categories.findMany({
    where: eq(categories.userId, userId),
    orderBy: (t, { asc }) => [asc(t.sortIndex), asc(t.createdAt)],
  });
  return c.json(rows);
});

// POST /api/categories
app.post("/", async (c) => {
  const userId = getAuth(c)!.userId!;
  const { name, color, sortIndex } = categoryValues(await readObject(c), true);

  try {
    const [row] = await db
      .insert(categories)
      .values({ userId, name: name.trim(), color, sortIndex })
      .returning();
    return c.json(row, 201);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("categories_user_name_uidx")) {
      return c.json({ error: `Category "${name}" đã tồn tại` }, 409);
    }
    throw e;
  }
});

// PUT /api/categories/:id
app.put("/:id", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId = getAuth(c)!.userId!;
  const id     = c.req.param("id");
  const update = categoryValues(await readObject(c), false);
  if (Object.keys(update).length === 0) return c.json({ error: "No category fields provided" }, 400);

  try {
    const [row] = await db
      .update(categories)
      .set(update)
      .where(and(eq(categories.id, id), eq(categories.userId, userId)))
      .returning();
    if (!row) return c.json({ error: "Not found" }, 404);
    return c.json(row);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("categories_user_name_uidx")) {
      return c.json({ error: `Category "${update.name}" đã tồn tại` }, 409);
    }
    throw e;
  }
});

// PATCH /api/categories/reorder — bulk update sortIndex
app.patch("/reorder", async (c) => {
  const userId = getAuth(c)!.userId!;
  const items  = reorderValues(await readJson(c));

  await Promise.all(
    items.map(({ id, sortIndex }) =>
      db
        .update(categories)
        .set({ sortIndex })
        .where(and(eq(categories.id, id), eq(categories.userId, userId))),
    ),
  );

  return c.json({ success: true });
});

// DELETE /api/categories/:id
app.delete("/:id", async (c) => {
  if (!validUuid(c.req.param("id"))) return c.json({ error: "Not found" }, 404);
  const userId     = getAuth(c)!.userId!;
  const id         = c.req.param("id");
  const forceParam = c.req.query("force");

  const ownedCategory = and(eq(categories.id, id), eq(categories.userId, userId));
  const category = await db.query.categories.findFirst({
    columns: { id: true },
    where: ownedCategory,
  });
  if (!category) return c.json({ error: "Not found" }, 404);

  const ownedCategoryIds = db.select({ id: categories.id }).from(categories).where(ownedCategory);
  const ownedLinks = inArray(contactCategories.categoryId, ownedCategoryIds);

  // Kiểm tra có contact nào đang dùng không
  const [usage] = await db
    .select({ total: count() })
    .from(contactCategories)
    .where(ownedLinks);

  const total = Number(usage?.total ?? 0);

  if (total > 0 && forceParam !== "true") {
    return c.json(
      { error: `Category đang được gán cho ${total} contact`, contactCount: total },
      409,
    );
  }

  // Nếu force=true, gỡ liên kết trước rồi xoá
  if (total > 0) {
    await db.delete(contactCategories).where(ownedLinks);
  }

  const [row] = await db
    .delete(categories)
    .where(ownedCategory)
    .returning();

  if (!row) return c.json({ error: "Not found" }, 404);
  return c.json({ success: true });
});

export default app;
