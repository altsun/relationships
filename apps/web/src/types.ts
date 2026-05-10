export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string;
  sortIndex: number;
  createdAt: string | null;
}

export interface Contact {
  id: string;
  userId: string;
  createdAt: string | null;
  updatedAt: string | null;
  fullName: string;
  phone: string | null;
  facebook: string | null;
  zalo: string | null;
  tiktok: string | null;
  birthYear: number | null;
  birthday: string | null;
  hometown: string | null;
  address: string | null;
  university: string | null;
  highSchool: string | null;
  jobTitle: string | null;
  hasWorkSchedule: boolean | null;
  workStartAm: string | null;
  lunchBreak: string | null;
  workStartPm: string | null;
  workEndPm: string | null;
  family: Record<string, unknown> | null;
  hobbies: string[] | null;
  notes: string | null;
  archivedAt: string | null;
  categories?: Category[];
}

export interface BirthdayContact {
  id: string;
  fullName: string;
  birthday: string;
  birthYear: number | null;
  phone: string | null;
  daysUntil: number;
  isToday: boolean;
}
