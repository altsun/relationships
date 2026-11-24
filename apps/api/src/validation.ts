import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

export const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
export const validUuid = (value: unknown): value is string =>
  typeof value === "string" && uuidPattern.test(value);

export function invalid(message: string): never {
  throw new HTTPException(400, { res: Response.json({ error: message }, { status: 400 }) });
}

export async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return invalid("Invalid JSON");
  }
}

export function objectValue(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalid("Expected a JSON object");
  }
  return value as Record<string, unknown>;
}

export const readObject = async (c: Context) => objectValue(await readJson(c));

function textValue(value: unknown, field: string, max: number, required = false): string | null {
  if (!required && value === null) return null;
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) {
    return invalid("Invalid " + field);
  }
  return required ? value.trim() : value;
}

const textFields: Record<string, number> = {
  fullName: 500, phone: 100, facebook: 2048, zalo: 2048, tiktok: 2048,
  hometown: 500, address: 2000, university: 500, highSchool: 500,
  jobTitle: 500, jobNotes: 10000, notes: 10000,
};
const timeFields = ["workStartAm", "lunchBreak", "workStartPm", "workEndPm"];

function validBirthday(value: string): boolean {
  if (!/^\d{2}-\d{2}$/.test(value)) return false;
  const [month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(2000, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

// Only client-writable fields can reach Drizzle. Omitted fields stay unchanged on PUT.
export function contactValues(body: Record<string, unknown>, creating: boolean): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [field, max] of Object.entries(textFields)) {
    if (Object.hasOwn(body, field)) out[field] = textValue(body[field], field, max, field === "fullName");
  }
  if (creating && !Object.hasOwn(out, "fullName")) invalid("Invalid fullName");
  if (Object.hasOwn(body, "birthday")) {
    const value = body.birthday;
    if (value === "" || value === null) out.birthday = null;
    else if (typeof value === "string" && validBirthday(value)) out.birthday = value;
    else invalid("Invalid birthday (expected MM-DD)");
  }
  if (Object.hasOwn(body, "birthYear")) {
    const value = body.birthYear;
    if (value === "" || value === null) out.birthYear = null;
    else if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 9999) out.birthYear = value;
    else invalid("Invalid birthYear");
  }
  if (Object.hasOwn(body, "hasWorkSchedule")) {
    if (typeof body.hasWorkSchedule !== "boolean" && body.hasWorkSchedule !== null) invalid("Invalid hasWorkSchedule");
    out.hasWorkSchedule = body.hasWorkSchedule;
  }
  for (const field of timeFields) {
    if (!Object.hasOwn(body, field)) continue;
    const value = body[field];
    if (value === "" || value === null) out[field] = null;
    else if (typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,6})?)?$/.test(value)) out[field] = value;
    else invalid("Invalid " + field);
  }
  if (Object.hasOwn(body, "family")) {
    const value = body.family;
    if (value !== null && (typeof value !== "object" || Array.isArray(value) || JSON.stringify(value).length > 10000)) invalid("Invalid family");
    out.family = value;
  }
  if (Object.hasOwn(body, "hobbies")) {
    const value = body.hobbies;
    if (value !== null && (!Array.isArray(value) || value.length > 100 || !value.every(v => typeof v === "string" && v.length <= 500))) invalid("Invalid hobbies");
    out.hobbies = value;
  }
  return out;
}

export function noteContent(body: Record<string, unknown>): string {
  return textValue(body.content, "content", 10000, true)!;
}

function sortIndex(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 2147483647) return invalid("Invalid sortIndex");
  return value;
}

export function categoryValues(body: Record<string, unknown>, creating: true): { name: string; color: string; sortIndex: number };
export function categoryValues(body: Record<string, unknown>, creating: false): { name?: string; color?: string; sortIndex?: number };
export function categoryValues(body: Record<string, unknown>, creating: boolean) {
  const out: { name?: string; color?: string; sortIndex?: number } = {};
  if (creating || Object.hasOwn(body, "name")) out.name = textValue(body.name, "name", 200, true)!;
  if (creating || Object.hasOwn(body, "color")) {
    if (typeof body.color !== "string" || !/^#[0-9a-f]{6}$/i.test(body.color)) invalid("Invalid color");
    out.color = body.color;
  }
  if (Object.hasOwn(body, "sortIndex")) out.sortIndex = sortIndex(body.sortIndex);
  else if (creating) out.sortIndex = 0;
  return out;
}

export function reorderValues(value: unknown): { id: string; sortIndex: number }[] {
  if (!Array.isArray(value) || value.length > 500) return invalid("Invalid reorder items");
  const seen = new Set<string>();
  return value.map(item => {
    const body = objectValue(item);
    if (!validUuid(body.id) || seen.has(body.id.toLowerCase())) return invalid("Invalid category id");
    const id = body.id.toLowerCase();
    seen.add(id);
    return { id, sortIndex: sortIndex(body.sortIndex) };
  });
}
