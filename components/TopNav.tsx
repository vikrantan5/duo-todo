"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./Logo";
import { StudyIcon } from "./nav/StudyIcons";
import {
  Search,
  Settings,
  Bell,
  Sun,
  Moon,
  LogOut,
  Calendar as Cal,
  CheckCircle2,
  Users,
  History,
  LineChart,
  Menu,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: (active: boolean) => ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/today",
    label: "Today",
    icon: () => <CheckCircle2 size={16} className="text-emerald-400" />,
  },
  {
    href: "/subjects",
    label: "Subjects",
    icon: (active) => <StudyIcon kind="subjects" size={16} mono={active} />,
  },
  {
    href: "/revisions",
    label: "Revisions",
    icon: (active) => <StudyIcon kind="revisions" size={16} mono={active} />,
  },
  {
    href: "/together",
    label: "Together",
    icon: () => <Users size={16} className="text-sky-400" />,
  },
  {
    href: "/history",
    label: "History",
    icon: () => <History size={16} className="text-fuchsia-400" />,
  },
  {
    href: "/insights",
    label: "Insights",
    icon: () => <LineChart size={16} className="text-amber-400" />,
  },
];

export default function TopNav() {
  const path = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(t);
    document.documentElement.classList.toggle("light", t === "light");
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  function toggleTheme() {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    localStorage.setItem("theme", t);
    document.documentElement.classList.toggle("light", t === "light");
    document.documentElement.classList.toggle("dark", t === "dark");
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => path === href;

  const desktopTab = (item: NavItem) => {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`px-4 py-1.5 rounded-full text-sm transition inline-flex items-center gap-1.5 ${
          active
            ? "bg-brand-violet/90 text-[#0B0D12] font-medium"
            : "hover:bg-bg-elev muted"
        }`}
      >
        {item.icon(active)}
        <span className="hidden lg:inline">{item.label}</span>
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-bg/70 border-b border-ink-border/60">
      <div className="max-w-[1480px] mx-auto px-3 sm:px-5 h-14 flex items-center gap-3 sm:gap-6">
        <Logo />

        {/* Date + quote — desktop only */}
        <div className="hidden xl:flex items-center gap-2 muted text-sm">
          <Cal size={14} />
          <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
          <span className="opacity-60 italic ml-2">“Small wins. Big momentum.”</span>
        </div>

        {/* Desktop nav: icons always, labels from lg up */}
        <nav className="hidden md:flex items-center gap-1 ml-auto">
          {NAV_ITEMS.map(desktopTab)}
        </nav>

        {/* Search — desktop only */}
        <div className="hidden lg:flex items-center gap-2 ml-2 elev px-3 py-1.5 w-56">
          <Search size={14} className="muted" />
          <input placeholder="Search tasks…" className="bg-transparent outline-none text-sm w-full" />
          <kbd className="muted text-[10px] border border-ink-border rounded px-1">/</kbd>
        </div>

        {/* Right-side utility buttons — always visible */}
        <div className="flex items-center gap-1 ml-auto md:ml-2">
          <button onClick={toggleTheme} className="btn btn-ghost !p-2" title="Toggle theme">
            {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <Link href="/settings" className="btn btn-ghost !p-2" title="Settings">
            <Settings size={16} />
          </Link>
          <button className="btn btn-ghost !p-2 hidden sm:inline-flex" title="Notifications">
            <Bell size={16} />
          </button>
          <button onClick={signOut} className="btn btn-ghost !p-2 hidden sm:inline-flex" title="Sign out">
            <LogOut size={16} />
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="btn btn-ghost !p-2 md:hidden"
            title="Menu"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-ink-border/60 bg-bg/95 backdrop-blur-xl">
          <nav className="max-w-[1480px] mx-auto px-3 py-2 flex flex-col">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                    active
                      ? "bg-brand-violet/90 text-[#0B0D12] font-medium"
                      : "hover:bg-bg-elev muted"
                  }`}
                >
                  {item.icon(active)}
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="h-px bg-ink-border/60 my-2" />
            <button
              onClick={signOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-bg-elev muted text-left"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}