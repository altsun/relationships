import { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { ArchiveRestore, Trash2 } from "lucide-react";
import Layout from "@/components/Layout";
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
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Đã lưu trữ</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Đang tải...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Không có contact nào đã lưu trữ</div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-gray-900">{c.fullName}</p>
                {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => unarchive(c.id)}
                  title="Khôi phục"
                  className="flex items-center gap-1.5 border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-sm hover:bg-gray-50"
                >
                  <ArchiveRestore size={14} /> Khôi phục
                </button>
                <button
                  onClick={() => remove(c.id)}
                  title="Xoá vĩnh viễn"
                  className="flex items-center gap-1.5 border border-red-300 text-red-600 px-3 py-1.5 rounded-md text-sm hover:bg-red-50"
                >
                  <Trash2 size={14} /> Xoá
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
