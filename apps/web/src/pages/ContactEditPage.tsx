import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/contacts/ContactForm";
import { api } from "@/lib/api";
import type { Contact } from "@/types";

export default function ContactEditPage() {
  const { id }       = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const navigate     = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const data  = await api.contacts.get(id!, token!) as Contact;
      setContact(data);
    })();
  }, [id, getToken]);

  const handleSubmit = async (data: unknown) => {
    const token = await getToken();
    await api.contacts.update(id!, data, token!);
    navigate(`/contacts/${id}`);
  };

  if (!contact) return <Layout><div className="text-center py-12 text-gray-500">Đang tải...</div></Layout>;

  // Chuyển categories thành categoryIds để truyền vào form
  const initial = {
    ...contact,
    categoryIds: contact.categories?.map((c) => c.id) ?? [],
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Chỉnh sửa: {contact.fullName}</h1>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <ContactForm initial={initial} onSubmit={handleSubmit} submitLabel="Cập nhật" />
        </div>
      </div>
    </Layout>
  );
}
