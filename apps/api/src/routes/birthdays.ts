import { Hono } from "hono";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { contacts } from "../db/schema";

const app = new Hono();

// GET /api/birthdays/upcoming — sinh nhật trong 30 ngày tới (chỉ active)
app.get("/upcoming", async (c) => {
  const userId = getAuth(c)!.userId!;

  // Lấy tất cả contact active có birthday
  const rows = await db.query.contacts.findMany({
    where: and(
      eq(contacts.userId, userId),
      isNull(contacts.archivedAt),
      sql`${contacts.birthday} IS NOT NULL`,
    ),
    columns: {
      id: true,
      fullName: true,
      birthday: true,
      birthYear: true,
      phone: true,
    },
  });

  const today = new Date();
  const mm    = String(today.getMonth() + 1).padStart(2, "0");
  const dd    = String(today.getDate()).padStart(2, "0");
  const todayStr = `${mm}-${dd}`;

  // Tính số ngày từ hôm nay tới sinh nhật (trong năm hiện tại hoặc năm sau)
  const withDays = rows
    .map((r) => {
      const bday = r.birthday!; // "MM-DD"
      const [bm, bd] = bday.split("-").map(Number);

      const thisYear  = new Date(today.getFullYear(), bm - 1, bd);
      const nextYear  = new Date(today.getFullYear() + 1, bm - 1, bd);
      const target    = thisYear >= today ? thisYear : nextYear;
      const diffMs    = target.getTime() - today.setHours(0, 0, 0, 0);
      const daysUntil = Math.ceil(diffMs / 86_400_000);

      return { ...r, daysUntil, isToday: bday === todayStr };
    })
    .filter((r) => r.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return c.json(withDays);
});

export default app;
