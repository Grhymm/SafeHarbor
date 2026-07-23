"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { RedactionBars } from "@/components/RedactionBars";

type Msg = { type: "error" | "ok"; text: string } | null;

export default function TesteurConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/testeur/missions");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/testeur/missions");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  async function handleSendLink() {
    if (!email.trim()) {
      setMsg({ type: "error", text: "Entre une adresse e-mail." });
      return;
    }

    setIsSendingLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/testeur/missions` },
    });
    setIsSendingLink(false);

    if (error) {
      setMsg({ type: "error", text: `Erreur : ${error.message}` });
    } else {
      setMsg({ type: "ok", text: "Lien envoyé — vérifie ta boîte mail (et les spams)." });
    }
  }

  return (
    <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen">
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        <RedactionBars />
        <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
          Accès testeur — connexion
        </p>
        <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">
          Connexion testeur
        </h1>
        <p className="text-sh-ink-dim text-[15px] max-w-[52ch] mb-10">
          Reconnecte-toi avec l&apos;adresse e-mail de ta candidature. Cette page ne crée pas de
          nouveau compte — si tu n&apos;as pas encore candidaté,{" "}
          <a href="/candidature" className="text-sh-amber">
            postule ici
          </a>
          .
        </p>

        <section className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7">
          <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
            Adresse e-mail
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@exemple.com"
            autoComplete="email"
            className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] mb-4.5 text-sh-ink focus:outline-none focus:border-sh-amber"
          />
          <button
            disabled={isSendingLink}
            onClick={handleSendLink}
            className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4.5 py-3 font-plex-mono text-[13px] font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSendingLink ? "Envoi en cours…" : "Recevoir un lien de connexion"}
          </button>
          {msg && (
            <div
              className={`rounded-[3px] px-3.5 py-3 text-[13px] mt-4 ${
                msg.type === "error" ? "bg-sh-error-bg text-sh-error-ink" : "bg-sh-ok-bg text-sh-ok-ink"
              }`}
            >
              {msg.text}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
