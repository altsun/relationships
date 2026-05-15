const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

export const api = {
  contacts: {
    list: (token: string, search = "", sort = "fullName", categoryId?: string) => {
      const params = new URLSearchParams({ search, sort });
      if (categoryId) params.set("categoryId", categoryId);
      return request(`/api/contacts?${params}`, {}, token);
    },
    archived:  (token: string) => request("/api/contacts/archived", {}, token),
    get:       (id: string, token: string) => request(`/api/contacts/${id}`, {}, token),
    create:    (body: unknown, token: string) =>
      request("/api/contacts", { method: "POST", body: JSON.stringify(body) }, token),
    update:    (id: string, body: unknown, token: string) =>
      request(`/api/contacts/${id}`, { method: "PUT", body: JSON.stringify(body) }, token),
    remove:    (id: string, token: string) =>
      request(`/api/contacts/${id}`, { method: "DELETE" }, token),
    archive:   (id: string, token: string) =>
      request(`/api/contacts/${id}/archive`, { method: "PATCH" }, token),
    unarchive: (id: string, token: string) =>
      request(`/api/contacts/${id}/unarchive`, { method: "PATCH" }, token),
  },
  notes: {
    list:   (contactId: string, token: string) =>
      request(`/api/contacts/${contactId}/notes`, {}, token),
    create: (contactId: string, content: string, token: string) =>
      request(`/api/contacts/${contactId}/notes`, { method: "POST", body: JSON.stringify({ content }) }, token),
    update: (contactId: string, noteId: string, content: string, token: string) =>
      request(`/api/contacts/${contactId}/notes/${noteId}`, { method: "PUT", body: JSON.stringify({ content }) }, token),
    remove: (contactId: string, noteId: string, token: string) =>
      request(`/api/contacts/${contactId}/notes/${noteId}`, { method: "DELETE" }, token),
  },
  birthdays: {
    upcoming: (token: string) => request("/api/birthdays/upcoming", {}, token),
  },
  categories: {
    list:    (token: string) => request("/api/categories", {}, token),
    create:  (body: { name: string; color: string; sortIndex?: number }, token: string) =>
      request("/api/categories", { method: "POST", body: JSON.stringify(body) }, token),
    update:  (id: string, body: { name?: string; color?: string; sortIndex?: number }, token: string) =>
      request(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(body) }, token),
    reorder: (items: { id: string; sortIndex: number }[], token: string) =>
      request("/api/categories/reorder", { method: "PATCH", body: JSON.stringify(items) }, token),
    remove:  (id: string, token: string, force = false) =>
      request(`/api/categories/${id}${force ? "?force=true" : ""}`, { method: "DELETE" }, token),
  },
};
