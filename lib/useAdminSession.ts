"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export type AdminSessionState = "checking" | "unauthenticated" | "forbidden" | "ready";

export function useAdminSession() {
  const router = useRouter();
  const [state, setState] = useState<AdminSessionState>("checking");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let active = true;

    async function check(current: Session | null) {
      if (!current) {
        if (!active) return;
        setState("unauthenticated");
        router.replace("/admin/connexion");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", current.user.id)
        .maybeSingle();

      if (!active) return;

      if (data?.role !== "admin") {
        setState("forbidden");
        return;
      }

      setSession(current);
      setState("ready");
    }

    supabase.auth.getSession().then(({ data: { session } }) => check(session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => check(session));

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return { session, state };
}
