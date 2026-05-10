import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { CategoryBadge } from "@/components/CategoryBadge";
import { api } from "@/lib/api";
import type { Contact, Category } from "@/types";

type FormData = Omit<Contact, "id" | "userId" | "createdAt" | "updatedAt" | "archivedAt"> & {
  categoryIds: string[];
};

interface Props {
  initial?: Partial<FormData>;
  onSubmit: (data: FormData) => Promise<void>;
  submitLabel?: string;
}

function TextInput({
  label, name, type = "text", value, onChange, required = false,
}: {
  label: string; name: string; type?: string;
  value: string; onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {name === "notes" ? (
        <textarea
          name={name} value={value} onChange={onChange} rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <input
          type={type} name={name} value={value} onChange={onChange} required={required}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

function CategorySelect({
  selected, categories, onChange,
}: {
  selected: string[]; categories: Category[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  if (categories.length === 0) return null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const active = selected.includes(cat.id);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggle(cat.id)}
              className={`border-2 rounded-full transition-all ${
                active ? "opacity-100 scale-105" : "opacity-50 hover:opacity-80"
              }`}
              style={{ borderColor: active ? cat.color : "transparent" }}
            >
              <CategoryBadge color={cat.color} name={cat.name} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ContactForm({ initial = {}, onSubmit, submitLabel = "Lưu" }: Props) {
  const { getToken }   = useAuth();
  const [allCats, setAllCats] = useState<Category[]>([]);
  const [form, setForm] = useState<Partial<FormData>>({
    fullName: "", phone: "", facebook: "", zalo: "", tiktok: "",
    birthday: "", birthYear: undefined,
    hometown: "", address: "", university: "", highSchool: "",
    jobTitle: "", hasWorkSchedule: false,
    workStartAm: "", lunchBreak: "", workStartPm: "", workEndPm: "",
    notes: "",
    categoryIds: [],
    ...initial,
  });
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
      await onSubmit({ ...form, categoryIds: form.categoryIds ?? [] } as FormData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-md">{error}</div>
      )}

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Thông tin cơ bản</h3>
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
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Categories</h3>
        <CategorySelect
          selected={form.categoryIds ?? []}
          categories={allCats}
          onChange={(ids) => setForm((f) => ({ ...f, categoryIds: ids }))}
        />
        {allCats.length === 0 && (
          <p className="text-sm text-gray-400">Chưa có category — tạo tại trang Quản lý categories.</p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Địa lý</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Quê quán" name="hometown" value={form.hometown ?? ""} onChange={set} />
          <TextInput label="Địa chỉ"  name="address"  value={form.address  ?? ""} onChange={set} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Học vấn</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Đại học" name="university" value={form.university ?? ""} onChange={set} />
          <TextInput label="THPT"    name="highSchool" value={form.highSchool ?? ""} onChange={set} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Công việc</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TextInput label="Chức danh" name="jobTitle" value={form.jobTitle ?? ""} onChange={set} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <input
            type="checkbox" id="hasWorkSchedule" name="hasWorkSchedule"
            checked={form.hasWorkSchedule ?? false} onChange={set}
            className="rounded border-gray-300"
          />
          <label htmlFor="hasWorkSchedule" className="text-sm text-gray-700">Có lịch làm việc cố định</label>
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
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Ghi chú</h3>
        <TextInput label="Ghi chú" name="notes" value={form.notes ?? ""} onChange={set} />
      </section>

      <div className="flex justify-end">
        <button
          type="submit" disabled={loading}
          className="bg-blue-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Đang lưu..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
