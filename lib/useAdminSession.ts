"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import posthog from "posthog-js";
import { supabase } from "@/lib/supabase/client";

export type AdminSessionState = "checking" | "unauthenticated" | "forbidden" | "ready";

function identifyUser(user: User) {
  posthog.identify(user.id, {
    email: user.email,
  });
}

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

      identifyUser(current.user);
      setSession(current);
      setState("ready");
    }

    supabase.auth.getSession().then(({ data: { session } }) => check(session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        posthog.reset();
      }
      check(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return { session, state };
}
