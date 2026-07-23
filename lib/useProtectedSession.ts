"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

export function useProtectedSession(redirectTo: string) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (!session) {
        router.replace(redirectTo);
        return;
      }
      setSession(session);
      setCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        router.replace(redirectTo);
      } else {
        setSession(session);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router, redirectTo]);

  return { session, checkingSession };
}
