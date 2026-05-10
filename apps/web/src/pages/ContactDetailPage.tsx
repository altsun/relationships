import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Pencil, Trash2, Archive, Phone, Facebook } from "lucide-react";
import Layout from "@/components/Layout";
import { CategoryBadge } from "@/components/CategoryBadge";
import { api } from "@/lib/api";
import type { Contact } from "@/types";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-36 shrink-0">{label}</span>
      <span className="text-sm text-gray-900">{value}</span>
    </div>
  );
}

export default function ContactDetailPage() {
  const { id }       = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const navigate     = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const data  = await api.contacts.get(id!, token!) as Contact;
      setContact(data);
      setLoading(false);
    })();
  }, [id, getToken]);

  const handleDelete = async () => {
    if (!confirm("Xoá vĩnh viễn contact này?")) return;
    const token = await getToken();
    await api.contacts.remove(id!, token!);
    navigate("/");
  };

  const handleArchive = async () => {
    const token = await getToken();
    await api.contacts.archive(id!, token!);
    navigate("/");
  };

  if (loading) return <Layout><div className="text-center py-12 text-gray-500">Đang tải...</div></Layout>;
  if (!contact) return <Layout><div className="text-center py-12 text-gray-500">Không tìm thấy</div></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{contact.fullName}</h1>
            {contact.jobTitle && <p className="text-gray-500 mt-0.5">{contact.jobTitle}</p>}
            {contact.categories && contact.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {contact.categories.map((cat) => (
                  <CategoryBadge key={cat.id} color={cat.color} name={cat.name} />
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              to={`/contacts/${id}/edit`}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 transition-colors"
            >
              <Pencil size={14} /> Sửa
            </Link>
            <button
              onClick={handleArchive}
              className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50 transition-colors"
            >
              <Archive size={14} /> Lưu trữ
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 border border-red-300 text-red-600 px-3 py-1.5 rounded-md text-sm hover:bg-red-50 transition-colors"
            >
              <Trash2 size={14} /> Xoá
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-1">
          <div className="flex gap-4 mb-4">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-blue-600 text-sm hover:underline">
                <Phone size={14} /> {contact.phone}
              </a>
            )}
            {contact.facebook && (
              <a href={contact.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 text-sm hover:underline">
                <Facebook size={14} /> Facebook
              </a>
            )}
          </div>

          <Row label="Zalo"        value={contact.zalo} />
          <Row label="TikTok"      value={contact.tiktok} />
          <Row label="Sinh nhật"   value={contact.birthday ? `${contact.birthday.split("-").reverse().join("/")}${contact.birthYear ? ` (${contact.birthYear})` : ""}` : null} />
          <Row label="Quê quán"    value={contact.hometown} />
          <Row label="Địa chỉ"    value={contact.address} />
          <Row label="Đại học"     value={contact.university} />
          <Row label="THPT"        value={contact.highSchool} />
          {contact.hasWorkSchedule && (
            <>
              <Row label="Vào làm sáng"  value={contact.workStartAm} />
              <Row label="Nghỉ trưa"     value={contact.lunchBreak} />
              <Row label="Vào làm chiều" value={contact.workStartPm} />
              <Row label="Tan làm"       value={contact.workEndPm} />
            </>
          )}
          <Row label="Ghi chú" value={contact.notes} />
        </div>
      </div>
    </Layout>
  );
}
