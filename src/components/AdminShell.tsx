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
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="flex min-h-screen print:block">
        <aside className="hidden md:flex w-64 flex-col border-r bg-white print:hidden">
          <div className="p-6 border-b">
            <h1 className="text-xl font-semibold">LuxeBoat OS</h1>
            <p className="text-sm text-gray-500 mt-1">Admin Control Panel</p>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-black text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t text-xs text-gray-500">
            Built for boat operations
          </div>
        </aside>

        <main className="flex-1">
          <div className="border-b bg-white px-6 py-5 print:border-b-0 print:px-0 print:py-0 print:mb-4">
            <h2 className="text-2xl font-semibold">{title ?? "Admin"}</h2>
            {subtitle && (
              <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
            )}
          </div>

          <div className="p-6 print:p-0">{children}</div>
        </main>
      </div>
    </div>
  );
}