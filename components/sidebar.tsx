"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "الرئيسية" },
  { href: "/dashboard", label: "لوحة الأزواج" },
  { href: "/alerts", label: "التنبيهات" },
  { href: "/settings", label: "الإعدادات" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">لوحة التداول</div>
      <nav className="nav">
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
