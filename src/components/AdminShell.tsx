"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/trip-sheet", label: "Trip Sheet" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/book", label: "Booking Page" },
];

export default function AdminShell({ children, title, subtitle }: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      <div className="flex min-h-screen print:block">
        <aside className="hidden md:flex w-72 flex-col border-r border-slate-200 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white print:hidden">
          <div className="p-6 border-b border-white/10">
            <h1 className="text-2xl font-semibold tracking-tight">LuxeBoat OS</h1>
            <p className="mt-1 text-sm text-slate-300">
              Premium booking operations
            </p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-white text-slate-900 shadow"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/10 text-xs text-slate-400">
            LuxeBoat operations control
          </div>
        </aside>

        <main className="flex-1">
          <div className="border-b border-slate-200 bg-white px-6 py-5 print:border-b-0 print:px-0 print:py-0 print:mb-4">
            <h2 className="text-2xl font-semibold text-slate-900">
              {title ?? "Admin"}
            </h2>
            {subtitle && (
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            )}
          </div>

          <div className="p-6 print:p-0">{children}</div>
        </main>
      </div>
    </div>
  );
}