"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { name: "Overview", href: "/overview" },
  { name: "Weekly Kickoff", href: "/kickoff" },
  { name: "School Calendar", href: "/calendar" },
  { name: "Sprints", href: "/sprints" },
  { name: "NCTs", href: "/ncts" },
  { name: "Settings", href: "/settings" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link href="/overview" className="text-lg font-semibold text-zinc-900">
            CoGrader Growth System
          </Link>
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const isActive =
                pathname === tab.href ||
                (tab.href === "/overview" && pathname === "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                  }`}
                >
                  {tab.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
