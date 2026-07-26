"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

type Role = "client" | "testeur" | "admin" | null;

export function SiteHeader() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    let active = true;

    async function loadRole(userId: string) {
      const { data } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (active) setRole((data?.role as Role) ?? null);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      setSession(session);
      if (session) loadRole(session.user.id);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setSession(session);
      if (session) {
        loadRole(session.user.id);
      } else {
        setRole(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="border-b border-sh-panel-line">
      <div className="max-w-[1080px] mx-auto px-6 flex justify-between items-center py-5">
        <Link href="/" className="font-plex-mono text-[15px] font-semibold tracking-[0.02em]">
          SAFE<span className="text-sh-amber">HARBOR</span>
        </Link>

        <div className="flex items-center gap-7 text-sm text-sh-ink-dim">
          {!session && (
            <>
              <Link href="/connexion" className="transition-colors duration-200 hover:text-sh-ink">
                Se connecter
              </Link>
              <Link href="/commander" className="transition-colors duration-200 hover:text-sh-ink">
                Commander un audit
              </Link>
              <Link href="/candidature" className="transition-colors duration-200 hover:text-sh-ink">
                Devenir testeur
              </Link>
            </>
          )}

          {session && role === "client" && (
            <>
              <Link href="/mes-missions" className="transition-colors duration-200 hover:text-sh-ink">
                Mes missions
              </Link>
              <Link href="/commander" className="transition-colors duration-200 hover:text-sh-ink">
                Commander
              </Link>
              <span className="font-plex-mono text-xs">{session.user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-transparent text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-3.5 py-2 text-[13px] cursor-pointer"
              >
                Se déconnecter
              </button>
            </>
          )}

          {session && role === "testeur" && (
            <>
              <Link href="/testeur/missions" className="transition-colors duration-200 hover:text-sh-ink">
                Mes missions
              </Link>
              <span className="font-plex-mono text-xs">{session.user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-transparent text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-3.5 py-2 text-[13px] cursor-pointer"
              >
                Se déconnecter
              </button>
            </>
          )}

          {session && role === "admin" && (
            <>
              <Link href="/admin" className="transition-colors duration-200 hover:text-sh-ink">
                Admin
              </Link>
              <span className="font-plex-mono text-xs">{session.user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-transparent text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-3.5 py-2 text-[13px] cursor-pointer"
              >
                Se déconnecter
              </button>
            </>
          )}

          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
