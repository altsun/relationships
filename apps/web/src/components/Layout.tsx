import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import { Users, Archive, Cake, Tag } from "lucide-react";

const nav = [
  { to: "/",            label: "Các mối quan hệ",    icon: Users },
  { to: "/birthdays",   label: "Sinh nhật",  icon: Cake },
  { to: "/archived",    label: "Đã lưu trữ", icon: Archive },
  { to: "/categories",  label: "Categories", icon: Tag },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-gray-900">Relationship Manager</span>
          <nav className="flex gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
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
