import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/clerk-react";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type { Contact, Category } from "@/types";

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
  "#f97316", "#6b7280",
];

type FormData = Omit<Contact, "id" | "userId" | "createdAt" | "updatedAt" | "archivedAt"> & {
  categoryIds: string[];
};

interface Props {
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed]);
    setInput("");
  };

  const removeTag = (index: number) => onChange(tags.filter((_, i) => i !== index));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); }
    else if (e.key === "Backspace" && !input && tags.length > 0) removeTag(tags.length - 1);
  };

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 min-h-10 border border-input rounded-md bg-background cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded text-sm">
          {tag}
          <button type="button" onClick={() => removeTag(i)} className="text-muted-foreground hover:text-foreground leading-none">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-28 outline-none bg-transparent text-sm placeholder:text-muted-foreground"
      />
    </div>
  );
}

function TextInput({
  label, name, type = "text", value, onChange, required = false,
}: {
  label: string; name: string; type?: string;
  value: string; onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {name === "notes" ? (
        <Textarea id={name} name={name} value={value} onChange={onChange} rows={3} />
      ) : (
        <Input id={name} type={type} name={name} value={value} onChange={onChange} required={required} />
      )}
    </div>
  );
}

function CategorySelect({
  selected, categories, onChange, onCreated,
}: {
  selected: string[]; categories: Category[];
  onChange: (ids: string[]) => void;
  onCreated: (cat: Category) => void;
}) {
  const { getToken } = useAuth();
  const [adding, setAdding]   = useState(false);
  const [name, setName]       = useState("");
  const [color, setColor]     = useState(PRESET_COLORS[0]);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState("");
  const inputRef              = useRef<HTMLInputElement>(null);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const openAdd = () => { setAdding(true); setName(""); setColor(PRESET_COLORS[0]); setErr(""); setTimeout(() => inputRef.current?.focus(), 50); };
  const cancelAdd = () => { setAdding(false); setErr(""); };

  const saveNew = async () => {
    if (!name.trim()) return;
    setSaving(true); setErr("");
    try {
      const token = await getToken();
      const cat = await api.categories.create({ name: name.trim(), color, sortIndex: categories.length }, token!) as Category;
      onCreated(cat);
      onChange([...selected, cat.id]);
      setAdding(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const active = selected.includes(cat.id);
            return (
              <button
                key={cat.id} type="button" onClick={() => toggle(cat.id)}
                className={`rounded-full leading-[0] outline-2 outline-offset-2 transition-all ${active ? "opacity-100 scale-105" : "opacity-50 hover:opacity-80"}`}
                style={{ outlineColor: active ? cat.color : "transparent" }}
              >
                <CategoryBadge color={cat.color} name={cat.name} />
              </button>
            );
          })}
        </div>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border border-border">
          <Input
            ref={inputRef}
            value={name} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveNew(); } if (e.key === "Escape") cancelAdd(); }}
            placeholder="Tên category..."
          />
          <div className="flex gap-1.5 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c} type="button" onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-1 ring-foreground/50 scale-110" : "hover:scale-110"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex gap-2">
            <Button
              type="button" size="sm" onClick={saveNew} disabled={saving || !name.trim()}
            >
              {saving ? "Đang tạo..." : "Tạo"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={cancelAdd}>Huỷ</Button>
          </div>
        </div>
      ) : (
        <button
          type="button" onClick={openAdd}
          className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
        >
          <span className="text-lg leading-none">+</span> Tạo category mới
        </button>
      )}
    </div>
  );
}

export default function ContactForm({ initial = {}, onSubmit, onCancel, submitLabel = "Lưu" }: Props) {
  const { getToken }   = useAuth();
  const [allCats, setAllCats] = useState<Category[]>([]);
  const [form, setForm] = useState<Partial<FormData>>({
    fullName: "", phone: "", facebook: "", zalo: "", tiktok: "",
    birthday: "", birthYear: undefined,
    hometown: "", address: "", university: "", highSchool: "",
    jobTitle: "", jobNotes: "", hasWorkSchedule: false,
    workStartAm: "", lunchBreak: "", workStartPm: "", workEndPm: "",
    notes: "",
    categoryIds: [],
    ...initial,
  });
  const [familyNote, setFamilyNote] = useState<string>(
    initial?.family ? ((initial.family as Record<string, unknown>).text as string) ?? "" : ""
  );
  const [hobbies, setHobbies] = useState<string[]>(initial?.hobbies ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const data  = await api.categories.list(token!) as Category[];
      setAllCats(data);
    })();
  }, [getToken]);

  const set = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm((f) => ({
      ...f,
      [name]: type === "checkbox"
        ? (e.target as HTMLInputElement).checked
        : type === "number"
          ? value === "" ? undefined : Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await onSubmit({
        ...form,
        family: familyNote.trim() ? { text: familyNote.trim() } : null,
        hobbies: hobbies.length > 0 ? hobbies : null,
        categoryIds: form.categoryIds ?? [],
      } as FormData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-md">{error}</div>
      )}

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Thông tin cơ bản</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Họ tên"              name="fullName"  value={form.fullName  ?? ""} onChange={set} required />
          <TextInput label="Số điện thoại"       name="phone"     value={form.phone     ?? ""} onChange={set} />
          <TextInput label="Facebook"            name="facebook"  value={form.facebook  ?? ""} onChange={set} />
          <TextInput label="Zalo"                name="zalo"      value={form.zalo      ?? ""} onChange={set} />
          <TextInput label="TikTok"              name="tiktok"    value={form.tiktok    ?? ""} onChange={set} />
          <TextInput label="Sinh nhật (MM-DD)"   name="birthday"  value={form.birthday  ?? ""} onChange={set} />
          <TextInput label="Năm sinh" type="number" name="birthYear" value={form.birthYear?.toString() ?? ""} onChange={set} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Categories</h3>
        <CategorySelect
          selected={form.categoryIds ?? []}
          categories={allCats}
          onChange={(ids) => setForm((f) => ({ ...f, categoryIds: ids }))}
          onCreated={(cat) => setAllCats((prev) => [...prev, cat])}
        />
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Địa lý</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Quê quán" name="hometown" value={form.hometown ?? ""} onChange={set} />
          <TextInput label="Địa chỉ"  name="address"  value={form.address  ?? ""} onChange={set} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Học vấn</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Đại học" name="university" value={form.university ?? ""} onChange={set} />
          <TextInput label="THPT"    name="highSchool" value={form.highSchool ?? ""} onChange={set} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Công việc</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Chức danh" name="jobTitle" value={form.jobTitle ?? ""} onChange={set} />
        </div>
        <div className="mt-4 space-y-1">
          <Label htmlFor="jobNotes">Ghi chú công việc</Label>
          <Textarea id="jobNotes" name="jobNotes" value={form.jobNotes ?? ""} onChange={set} rows={3} placeholder="Mô tả công việc, nơi làm việc..." />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox" id="hasWorkSchedule" name="hasWorkSchedule"
            checked={form.hasWorkSchedule ?? false} onChange={set}
            className="rounded border-input"
          />
          <Label htmlFor="hasWorkSchedule">Có lịch làm việc cố định</Label>
        </div>
        {form.hasWorkSchedule && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <TextInput label="Vào làm sáng"  type="time" name="workStartAm" value={form.workStartAm ?? ""} onChange={set} />
            <TextInput label="Nghỉ trưa"     type="time" name="lunchBreak"  value={form.lunchBreak  ?? ""} onChange={set} />
            <TextInput label="Vào làm chiều" type="time" name="workStartPm" value={form.workStartPm ?? ""} onChange={set} />
            <TextInput label="Tan làm"       type="time" name="workEndPm"   value={form.workEndPm   ?? ""} onChange={set} />
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Gia đình</h3>
        <Textarea
          value={familyNote} onChange={(e) => setFamilyNote(e.target.value)} rows={3}
          placeholder="Vợ/chồng, con cái, bố mẹ..."
        />
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sở thích</h3>
        <TagInput tags={hobbies} onChange={setHobbies} placeholder="Nhập sở thích rồi Enter..." />
        <p className="text-xs text-muted-foreground mt-1">Nhấn Enter hoặc dấu phẩy để thêm</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Ghi chú</h3>
        <TextInput label="Ghi chú" name="notes" value={form.notes ?? ""} onChange={set} />
      </section>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Huỷ
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Đang lưu..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
