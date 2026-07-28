"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, UserCheck, Briefcase, Users, CreditCard, Package } from "lucide-react";
import { useAdminSession } from "@/lib/useAdminSession";
import { AdminSessionContext } from "@/lib/AdminSessionContext";
import { supabase } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV_ITEMS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/candidatures", label: "Candidatures", icon: UserCheck },
  { href: "/admin/missions", label: "Missions", icon: Briefcase },
  { href: "/admin/testeurs", label: "Testeurs", icon: Users },
  { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
  { href: "/admin/catalogue", label: "Catalogue", icon: Package },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const { session, state } = useAdminSession();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (state === "checking" || state === "unauthenticated") {
    return <div className="bg-sh-bg min-h-screen" />;
  }

  if (state === "forbidden") {
    return (
      <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen flex items-center justify-center px-5">
        <div className="bg-sh-panel border border-sh-error-ink rounded-[3px] p-7 max-w-[420px]">
          <p className="font-plex-mono text-xs tracking-[0.08em] uppercase text-sh-error-ink mb-3">
            Accès réservé
          </p>
          <p className="text-sh-ink-dim text-sm">
            Ce compte n&apos;a pas les droits administrateur nécessaires pour accéder à cette
            zone.
          </p>
        </div>
      </div>
    );
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen flex">
      <aside className="w-[220px] shrink-0 bg-sh-panel border-r border-sh-panel-line flex flex-col min-h-screen">
        <div className="px-6 py-6 border-b border-sh-panel-line">
          <Link href="/admin" className="font-plex-mono text-[15px] font-semibold tracking-[0.02em]">
            SAFE<span className="text-sh-amber">HARBOR</span>
          </Link>
          <p className="font-plex-mono text-[10px] tracking-[0.12em] uppercase text-sh-ink-dim mt-1.5">
            Administration
          </p>
        </div>

        <nav className="flex-1 py-4">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-6 py-3 font-plex-mono text-[13px] tracking-[0.02em] border-l-2 transition-colors duration-200 ${
                  active
                    ? "text-sh-amber bg-sh-amber/10 border-sh-amber"
                    : "text-sh-ink-dim border-transparent hover:text-sh-ink"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-5 border-t border-sh-panel-line">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="font-plex-mono text-xs text-sh-ink-dim break-all">{session?.user.email}</p>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-transparent text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-3.5 py-2 text-[13px] cursor-pointer font-plex-mono tracking-[0.02em] transition-colors duration-200 hover:text-sh-ink"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-[880px] mx-auto px-8 py-14">
          <AdminSessionContext.Provider value={session}>{children}</AdminSessionContext.Provider>
        </div>
      </main>
    </div>
  );
}
