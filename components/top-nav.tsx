"use client";

import { useState } from "react";
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
  const [isOpen, setIsOpen] = useState(false);

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

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={isOpen}
          aria-controls="primary-nav"
          onClick={() => setIsOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav id="primary-nav" className={`topnav ${isOpen ? "open" : ""}`}>
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : ""}
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}