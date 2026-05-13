import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Pencil, Trash2, Archive, Phone, Facebook } from "lucide-react";
import Layout from "@/components/Layout";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { Contact } from "@/types";

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 py-2">
      <span className="text-sm text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-sm text-foreground whitespace-pre-wrap">{value}</span>
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

  if (loading) return <Layout><div className="text-center py-12 text-muted-foreground">Đang tải...</div></Layout>;
  if (!contact) return <Layout><div className="text-center py-12 text-muted-foreground">Không tìm thấy</div></Layout>;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{contact.fullName}</h1>
            {contact.jobTitle && <p className="text-muted-foreground mt-0.5">{contact.jobTitle}</p>}
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
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              <Pencil size={14} /> Sửa
            </Link>
            <Button variant="ghost" size="sm" onClick={handleArchive}>
              <Archive size={14} /> Lưu trữ
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 size={14} /> Xoá
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="py-4 space-y-0">
            {(contact.phone || contact.facebook) && (
              <>
                <div className="flex gap-4 pb-3">
                  {contact.phone && (
                    <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-primary text-sm hover:underline">
                      <Phone size={14} /> {contact.phone}
                    </a>
                  )}
                  {contact.facebook && (
                    /^https?:\/\//i.test(contact.facebook) ? (
                      <a href={contact.facebook} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-primary text-sm hover:underline">
                        <Facebook size={14} /> Facebook
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm">
                        <Facebook size={14} /> {contact.facebook}
                      </span>
                    )
                  )}
                </div>
                <Separator className="mb-1" />
              </>
            )}

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
            {contact.family && (contact.family as { text?: string }).text && (
              <Row label="Gia đình" value={(contact.family as { text?: string }).text} />
            )}
            {contact.hobbies && contact.hobbies.length > 0 && (
              <div className="flex gap-3 py-2">
                <span className="text-sm text-muted-foreground w-36 shrink-0">Sở thích</span>
                <div className="flex flex-col gap-1">
                  {contact.hobbies.map((h, i) => (
                    <span key={i} className="px-2 py-0.5 bg-muted rounded text-sm">{h}</span>
                  ))}
                </div>
              </div>
            )}
            <Row label="Ghi chú" value={contact.notes} />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
