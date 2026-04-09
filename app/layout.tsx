import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/top-nav";

export const metadata: Metadata = {
  title: "لوحة التداول",
  description: "لوحة لمتابعة آخر 500 شمعة ساعة للفوركس، المؤشرات، والتنبيهات"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <TopNav />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
