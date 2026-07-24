"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { RedactionBars } from "@/components/RedactionBars";

type Msg = { type: "error" | "ok"; text: string } | null;

type ViewState =
  | { kind: "checking" }
  | { kind: "login" }
  | { kind: "redirecting" }
  | { kind: "pending" }
  | { kind: "no-application" }
  | { kind: "rejected"; reason: string | null };

export default function TesteurConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [viewState, setViewState] = useState<ViewState>({ kind: "checking" });

  useEffect(() => {
    let active = true;

    async function checkStatus(userId: string) {
      const { data } = await supabase
        .from("testeur_profiles")
        .select("verification_status, excluded_reason")
        .eq("profile_id", userId)
        .maybeSingle();

      if (!active) return;

      if (!data) {
        setViewState({ kind: "no-application" });
      } else if (data.verification_status === "verified") {
        setViewState({ kind: "redirecting" });
        router.replace("/testeur/missions");
      } else if (data.verification_status === "rejected") {
        setViewState({ kind: "rejected", reason: data.excluded_reason ?? null });
      } else {
        // "pending" et "expired" partagent le même état d'attente pour l'instant —
        // le spec ne distingue pas "expired" d'un simple examen en cours.
        setViewState({ kind: "pending" });
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) {
        checkStatus(session.user.id);
      } else {
        setViewState({ kind: "login" });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) {
        checkStatus(session.user.id);
      } else {
        setViewState({ kind: "login" });
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
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

        {viewState.kind === "login" && (
          <>
            <p className="text-sh-ink-dim text-[15px] max-w-[52ch] mb-10">
              Reconnecte-toi avec l&apos;adresse e-mail de ta candidature. Cette page ne crée pas
              de nouveau compte — si tu n&apos;as pas encore candidaté,{" "}
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
          </>
        )}

        {viewState.kind === "pending" && (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7">
            <p className="font-plex-mono text-xs tracking-[0.08em] uppercase text-sh-amber mb-3">
              Candidature en cours d&apos;examen
            </p>
            <p className="text-sh-ink-dim text-sm">
              Ta candidature est toujours en cours d&apos;examen. Reviens un peu plus tard — tu
              recevras un e-mail dès qu&apos;un membre de l&apos;équipe aura validé ton profil.
            </p>
          </div>
        )}

        {viewState.kind === "no-application" && (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7">
            <p className="text-sh-ink-dim text-sm">
              Ce compte n&apos;a pas de candidature testeur associée.{" "}
              <Link href="/candidature" className="text-sh-amber">
                Postuler ici
              </Link>
              .
            </p>
          </div>
        )}

        {viewState.kind === "rejected" && (
          <div className="bg-sh-panel border border-sh-error-ink rounded-[3px] p-7">
            <p className="font-plex-mono text-xs tracking-[0.08em] uppercase text-sh-error-ink mb-3">
              Candidature non retenue
            </p>
            <p className="text-sh-ink-dim text-sm mb-6">
              {viewState.reason ||
                "Ta candidature n'a pas été retenue par l'équipe."}
            </p>
            <Link
              href="/"
              className="inline-block bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4.5 py-3 font-plex-mono text-[13px] font-semibold tracking-[0.05em] uppercase"
            >
              Retour à l&apos;accueil
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
