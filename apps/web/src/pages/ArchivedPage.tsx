import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { ArchiveRestore, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { Contact } from "@/types";

export default function ArchivedPage() {
  const { getToken }   = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const data  = await api.contacts.archived(token!) as Contact[];
      setContacts(data);
      setLoading(false);
    })();
  }, [getToken]);

  const unarchive = async (id: string) => {
    const token = await getToken();
    await api.contacts.unarchive(id, token!);
    setContacts((c) => c.filter((x) => x.id !== id));
  };

  const remove = async (id: string) => {
    if (!confirm("Xoá vĩnh viễn?")) return;
    const token = await getToken();
    await api.contacts.remove(id, token!);
    setContacts((c) => c.filter((x) => x.id !== id));
  };

  return (
    <Layout>
      <h1 className="text-xl font-semibold text-foreground mb-6">Đã lưu trữ</h1>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Không có contact nào đã lưu trữ</div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <Card key={c.id} className="flex-row items-center justify-between py-0">
              <CardContent className="py-3 px-4 flex-1">
                <p className="font-medium text-foreground">{c.fullName}</p>
                {c.phone && <p className="text-sm text-muted-foreground">{c.phone}</p>}
              </CardContent>
              <CardContent className="py-3 px-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => unarchive(c.id)}>
                  <ArchiveRestore size={14} /> Khôi phục
                </Button>
                <Button variant="destructive" size="sm" onClick={() => remove(c.id)}>
                  <Trash2 size={14} /> Xoá
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
