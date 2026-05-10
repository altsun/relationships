import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Cake, Phone } from "lucide-react";
import Layout from "@/components/Layout";
import { api } from "@/lib/api";
import type { BirthdayContact } from "@/types";

export default function BirthdaysPage() {
  const { getToken }   = useAuth();
  const [list, setList]     = useState<BirthdayContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const data  = await api.birthdays.upcoming(token!) as BirthdayContact[];
      setList(data);
      setLoading(false);
    })();
  }, [getToken]);

  return (
    <Layout>
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Sinh nhật trong 30 ngày tới</h1>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Đang tải...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Không có sinh nhật nào trong 30 ngày tới</div>
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <Link
              key={b.id}
              to={`/contacts/${b.id}`}
              className={`flex items-center justify-between p-4 rounded-lg border transition-shadow hover:shadow-sm ${
                b.isToday
                  ? "bg-yellow-50 border-yellow-300"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Cake size={18} className={b.isToday ? "text-yellow-500" : "text-gray-400"} />
                <div>
                  <p className="font-medium text-gray-900">
                    {b.fullName}
                    {b.isToday && (
                      <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-medium">
                        Hôm nay
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">
                    {b.birthday}{b.birthYear ? ` · ${b.birthYear}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                {b.phone && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Phone size={13} /> {b.phone}
                  </span>
                )}
                <span className={`text-sm font-medium ${b.isToday ? "text-yellow-700" : "text-gray-600"}`}>
                  {b.isToday ? "Hôm nay" : `${b.daysUntil} ngày nữa`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
