import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Plus, Pencil, Trash2, Check, X, GripVertical } from "lucide-react";
import Layout from "@/components/Layout";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Category } from "@/types";

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#6b7280",
];

interface EditRowProps {
  initial: { name: string; color: string };
  onSave: (name: string, color: string) => Promise<void>;
  onCancel: () => void;
}

function EditRow({ initial, onSave, onCancel }: EditRowProps) {
  const [name, setName]     = useState(initial.name);
  const [color, setColor]   = useState(initial.color);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await onSave(name.trim(), color);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onCancel(); }}
          className="flex-1"
          placeholder="Tên category"
        />
        <div className="flex gap-1">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{ backgroundColor: c, borderColor: color === c ? "#1e40af" : "transparent" }}
            />
          ))}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={save} disabled={saving} className="text-green-600 hover:text-green-700">
          <Check size={18} />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onCancel} className="text-muted-foreground">
          <X size={18} />
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Xem trước:</span>
        <CategoryBadge color={color} name={name || "Tên category"} />
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const { getToken }   = useAuth();
  const [cats, setCats]           = useState<Category[]>([]);
  const [loading, setLoading]     = useState(true);
  const [creating, setCreating]   = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; count: number } | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const data  = await api.categories.list(token!) as Category[];
      setCats(data);
      setLoading(false);
    })();
  }, [getToken]);

  const create = async (name: string, color: string) => {
    const token = await getToken();
    const row   = await api.categories.create({ name, color, sortIndex: cats.length }, token!) as Category;
    setCats((prev) => [...prev, row]);
    setCreating(false);
  };

  const update = async (id: string, name: string, color: string) => {
    const token = await getToken();
    const row   = await api.categories.update(id, { name, color }, token!) as Category;
    setCats((prev) => prev.map((c) => (c.id === id ? row : c)));
    setEditingId(null);
  };

  const remove = async (id: string, force = false) => {
    setDeleteError(null);
    const token = await getToken();
    try {
      await api.categories.remove(id, token!, force);
      setCats((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      const msg   = (e as Error).message;
      const match = msg.match(/(\d+) contact/);
      const count = match ? Number(match[1]) : 0;
      if (count > 0) setDeleteError({ id, count });
    }
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-foreground">Quản lý categories</h1>
          {!creating && (
            <Button onClick={() => setCreating(true)}>
              <Plus size={16} /> Tạo mới
            </Button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
        ) : (
          <div className="space-y-2">
            {creating && (
              <Card className="border-primary/40">
                <CardContent className="py-4">
                  <EditRow
                    initial={{ name: "", color: PRESET_COLORS[0] }}
                    onSave={create}
                    onCancel={() => setCreating(false)}
                  />
                </CardContent>
              </Card>
            )}

            {cats.length === 0 && !creating && (
              <div className="text-center py-12 text-muted-foreground">Chưa có category nào</div>
            )}

            {cats.map((cat, idx) => (
              <Card key={cat.id}>
                <CardContent className="py-3">
                  {editingId === cat.id ? (
                    <EditRow
                      initial={{ name: cat.name, color: cat.color }}
                      onSave={(name, color) => update(cat.id, name, color)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <div className="flex items-center gap-3">
                      <GripVertical size={16} className="text-muted-foreground/30 cursor-grab shrink-0" />
                      <CategoryBadge color={cat.color} name={cat.name} />
                      <span className="text-xs text-muted-foreground ml-auto">#{idx + 1}</span>
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditingId(cat.id)} className="text-muted-foreground">
                        <Pencil size={15} />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(cat.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={15} />
                      </Button>
                    </div>
                  )}

                  {deleteError?.id === cat.id && (
                    <div className="mt-3 bg-destructive/10 rounded-md p-3 text-sm">
                      <p className="text-destructive font-medium">
                        Category đang được gán cho {deleteError.count} contact.
                      </p>
                      <p className="text-destructive/80 mt-0.5">Xoá sẽ gỡ khỏi tất cả các contact đó.</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="destructive" onClick={() => remove(cat.id, true)}>
                          Xoá anyway
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteError(null)}>
                          Huỷ
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
