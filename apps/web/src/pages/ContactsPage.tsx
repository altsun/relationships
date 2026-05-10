import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Plus, Search, Tag } from "lucide-react";
import Layout from "@/components/Layout";
import ContactCard from "@/components/contacts/ContactCard";
import { CategoryBadge } from "@/components/CategoryBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import type { Contact, Category } from "@/types";

export default function ContactsPage() {
  const { getToken }   = useAuth();
  const [contacts, setContacts]       = useState<Contact[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [search, setSearch]           = useState("");
  const [activeCatId, setActiveCatId] = useState<string | undefined>(undefined);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const data  = await api.categories.list(token!) as Category[];
      setCategories(data);
    })();
  }, [getToken]);

  const load = useCallback(async (q = "", catId?: string) => {
    try {
      setLoading(true);
      const token = await getToken();
      const data  = await api.contacts.list(token!, q, "fullName", catId) as Contact[];
      setContacts(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search, activeCatId), 300);
    return () => clearTimeout(t);
  }, [search, activeCatId, load]);

  const archive = async (id: string) => {
    try {
      const token = await getToken();
      await api.contacts.archive(id, token!);
      setContacts((c) => c.filter((x) => x.id !== id));
    } catch (e) {
      setError(`Lưu trữ thất bại: ${(e as Error).message}`);
    }
  };

  const toggleCat = (id: string) =>
    setActiveCatId((prev) => (prev === id ? undefined : id));

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-foreground">Các mối quan hệ</h1>
        <Link
          to="/contacts/new"
          className={buttonVariants({ variant: "default" })}
        >
          <Plus size={16} /> Thêm mới
        </Link>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Tìm kiếm tên, số điện thoại..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            variant={activeCatId === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCatId(undefined)}
            className="rounded-full text-xs h-7"
          >
            <Tag size={11} /> Tất cả
          </Button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCat(cat.id)}
              className={`border-2 rounded-full transition-all ${
                activeCatId === cat.id ? "opacity-100 scale-105" : "opacity-70 hover:opacity-90"
              }`}
              style={{ borderColor: activeCatId === cat.id ? cat.color : "transparent" }}
            >
              <CategoryBadge color={cat.color} name={cat.name} />
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-destructive text-sm mb-4">{error}</p>}

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Đang tải...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          {search || activeCatId ? "Không tìm thấy kết quả" : "Chưa có contact nào"}
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <ContactCard key={c.id} contact={c} onArchive={archive} />
          ))}
        </div>
      )}
    </Layout>
  );
}
