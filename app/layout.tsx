import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "لوحة التداول",
  description: "لوحة لمتابعة آخر 500 شمعة ساعة، المؤشرات، والتنبيهات"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="layout">
          <Sidebar />
          <main className="main">
            <div className="container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
