"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "الشارت" },
  { href: "/dashboard", label: "لوحة الأزواج" },
  { href: "/alerts", label: "التنبيهات" },
  { href: "/import", label: "استيراد CSV" },
  { href: "/settings", label: "الإعدادات" }
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/" className="brand-mark">
          <span className="brand-dot" />
          <span>
            <strong>لوحة التداول</strong>
            <small>Forex Market Watch</small>
          </span>
        </Link>

        <nav className="topnav">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className={pathname === item.href ? "active" : ""}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}