import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Cake, Phone } from "lucide-react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";
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
      <h1 className="text-xl font-semibold text-foreground mb-6">Sinh nhật trong 30 ngày tới</h1>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Đang tải...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">Không có sinh nhật nào trong 30 ngày tới</div>
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <Link
              key={b.id}
              to={`/contacts/${b.id}`}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl border transition-shadow hover:shadow-sm",
                b.isToday
                  ? "bg-yellow-50 border-yellow-300"
                  : "bg-card border-border"
              )}
            >
              <div className="flex items-center gap-3">
                <Cake size={18} className={b.isToday ? "text-yellow-500" : "text-muted-foreground"} />
                <div>
                  <p className="font-medium text-foreground">
                    {b.fullName}
                    {b.isToday && (
                      <span className="ml-2 text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full font-medium">
                        Hôm nay
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {b.birthday}{b.birthYear ? ` · ${b.birthYear}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                {b.phone && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone size={13} /> {b.phone}
                  </span>
                )}
                <span className={cn("text-sm font-medium", b.isToday ? "text-yellow-700" : "text-muted-foreground")}>
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
