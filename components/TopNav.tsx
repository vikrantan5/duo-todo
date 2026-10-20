"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "./Logo";
import { Search, Settings, Bell, Sun, Moon, LogOut, Calendar as Cal } from "lucide-react";
import { format } from "date-fns";

export default function TopNav() {
  const path = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"dark"|"light">("dark");

  useEffect(() => {
    const t = (localStorage.getItem("theme") as "dark"|"light") || "dark";
    setTheme(t);
    document.documentElement.classList.toggle("light", t === "light");
    document.documentElement.classList.toggle("dark", t === "dark");
  }, []);

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

  const tab = (href: string, label: string) => {
    const active = path === href;
    return (
      <Link href={href}
        className={`px-4 py-1.5 rounded-full text-sm transition ${active ? "bg-brand-violet/90 text-[#0B0D12] font-medium" : "hover:bg-bg-elev muted"}`}>
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-bg/70 border-b border-ink-border/60">
      <div className="max-w-[1480px] mx-auto px-5 h-14 flex items-center gap-6">
        <Logo />
        <div className="hidden md:flex items-center gap-2 muted text-sm">
          <Cal size={14} />
          <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
          <span className="opacity-60 italic ml-2">“Small wins. Big momentum.”</span>
        </div>
        <nav className="ml-auto flex items-center gap-1">
          {tab("/today", "Today")}
          {tab("/history", "History")}
          {tab("/insights", "Insights")}
        </nav>
        <div className="hidden md:flex items-center gap-2 ml-2 elev px-3 py-1.5 w-56">
          <Search size={14} className="muted" />
          <input placeholder="Search tasks…" className="bg-transparent outline-none text-sm w-full" />
          <kbd className="muted text-[10px] border border-ink-border rounded px-1">/</kbd>
        </div>
        <button onClick={toggleTheme} className="btn btn-ghost !p-2">{theme === "dark" ? <Moon size={16}/> : <Sun size={16}/>}</button>
        <Link href="/settings" className="btn btn-ghost !p-2"><Settings size={16}/></Link>
        <button className="btn btn-ghost !p-2"><Bell size={16}/></button>
        <button onClick={signOut} className="btn btn-ghost !p-2" title="Sign out"><LogOut size={16}/></button>
      </div>
    </header>
  );
}
