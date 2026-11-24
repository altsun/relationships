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

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  // Preserve the runtime's local calendar date; use UTC only for day arithmetic.
  const today = Date.UTC(year, month, day);
  const mm    = String(month + 1).padStart(2, "0");
  const dd    = String(day).padStart(2, "0");
  const todayStr = `${mm}-${dd}`;

  // Tính số ngày từ hôm nay tới sinh nhật (trong năm hiện tại hoặc năm sau)
  const withDays = rows
    .map((r) => {
      const bday = r.birthday!; // "MM-DD"
      const [bm, bd] = bday.split("-").map(Number);

      const thisYear  = Date.UTC(year, bm - 1, bd);
      const nextYear  = Date.UTC(year + 1, bm - 1, bd);
      const target    = thisYear >= today ? thisYear : nextYear;
      const daysUntil = (target - today) / 86_400_000;

      return { ...r, daysUntil, isToday: bday === todayStr };
    })
    .filter((r) => r.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return c.json(withDays);
});

export default app;
