import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import Layout from "@/components/Layout";
import ContactForm from "@/components/contacts/ContactForm";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function ContactNewPage() {
  const { getToken } = useAuth();
  const navigate     = useNavigate();

  const handleSubmit = async (data: Parameters<typeof api.contacts.create>[0]) => {
    const token = await getToken();
    const contact = await api.contacts.create(data, token!) as { id: string };
    navigate(`/contacts/${contact.id}`);
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold text-foreground mb-6">Thêm contact mới</h1>
        <Card>
          <CardContent className="py-6">
            <ContactForm onSubmit={handleSubmit} submitLabel="Tạo contact" />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
