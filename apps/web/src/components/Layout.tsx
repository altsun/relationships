import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Users, Archive, Cake, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/",            label: "Các mối quan hệ", icon: Users },
  { to: "/birthdays",   label: "Sinh nhật",        icon: Cake },
  { to: "/archived",    label: "Đã lưu trữ",       icon: Archive },
  { to: "/categories",  label: "Categories",        icon: Tag },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-muted/40 flex flex-col">
      <header className="bg-background border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-foreground">Relationship Manager</span>
          <nav className="flex gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon size={15} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <UserButton />
      </header>
      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl">{children}</main>
    </div>
  );
}
