import {
  pgTable, uuid, text, integer, time, timestamp, jsonb, boolean,
  index, uniqueIndex, primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const contacts = pgTable("contacts", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      text("user_id").notNull(),
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),

  fullName:    text("full_name").notNull(),
  phone:       text("phone"),
  facebook:    text("facebook"),
  zalo:        text("zalo"),
  tiktok:      text("tiktok"),
  birthYear:   integer("birth_year"),
  birthday:    text("birthday"),

  hometown:    text("hometown"),
  address:     text("address"),

  university:  text("university"),
  highSchool:  text("high_school"),

  jobTitle:        text("job_title"),
  hasWorkSchedule: boolean("has_work_schedule").default(false),
  workStartAm:     time("work_start_am"),
  lunchBreak:      time("lunch_break"),
  workStartPm:     time("work_start_pm"),
  workEndPm:       time("work_end_pm"),

  family:      jsonb("family"),
  hobbies:     text("hobbies").array(),
  notes:       text("notes"),

  archivedAt:  timestamp("archived_at"),
}, (t) => [
  index("contacts_user_id_idx").on(t.userId),
  index("contacts_birthday_idx").on(t.birthday),
]);

export const categories = pgTable("categories", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    text("user_id").notNull(),
  name:      text("name").notNull(),
  color:     text("color").notNull(),
  sortIndex: integer("sort_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("categories_user_id_idx").on(t.userId),
  uniqueIndex("categories_user_name_uidx").on(t.userId, t.name),
]);

export const contactCategories = pgTable("contact_categories", {
  contactId:  uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
}, (t) => [
  primaryKey({ columns: [t.contactId, t.categoryId] }),
]);

// Relations — dùng để Drizzle tự join khi query
export const contactsRelations = relations(contacts, ({ many }) => ({
  contactCategories: many(contactCategories),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  contactCategories: many(contactCategories),
}));

export const contactCategoriesRelations = relations(contactCategories, ({ one }) => ({
  contact:  one(contacts,  { fields: [contactCategories.contactId],  references: [contacts.id] }),
  category: one(categories, { fields: [contactCategories.categoryId], references: [categories.id] }),
}));

export type Contact             = typeof contacts.$inferSelect;
export type NewContact          = typeof contacts.$inferInsert;
export type Category            = typeof categories.$inferSelect;
export type NewCategory         = typeof categories.$inferInsert;
export type ContactCategory     = typeof contactCategories.$inferSelect;
