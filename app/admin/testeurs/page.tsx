"use client";

import { useEffect, useState } from "react";
import { useAdminSession } from "@/lib/useAdminSession";
import { RedactionBars } from "@/components/RedactionBars";
import { SiteHeader } from "@/components/SiteHeader";

type Testeur = {
  profile_id: string;
  full_name: string | null;
  email: string | null;
  specialties: string[] | null;
  certifications: string[] | null;
  legal_status: string | null;
  active: boolean;
  id_verified_at: string | null;
  missions_count: number;
};

type Msg = { type: "error" | "ok"; text: string } | null;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function TesteurCard({
  testeur,
  accessToken,
  onToggled,
}: {
  testeur: Testeur;
  accessToken: string;
  onToggled: (profileId: string, active: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function handleToggle() {
    setSubmitting(true);
    setMsg(null);

    const nextActive = !testeur.active;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-set-testeur-active`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ profile_id: testeur.profile_id, active: nextActive }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setMsg({ type: "error", text: result.error || "Une erreur est survenue." });
        setSubmitting(false);
        return;
      }

      onToggled(testeur.profile_id, nextActive);
    } catch (err) {
      setMsg({ type: "error", text: `Erreur réseau : ${err instanceof Error ? err.message : String(err)}` });
      setSubmitting(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 mb-5">
      <div className="flex justify-between items-start gap-4 mb-1.5">
        <div className="text-lg font-semibold">{testeur.full_name || "Nom non renseigné"}</div>
        <span
          className={`inline-block font-plex-mono text-[11px] tracking-[0.08em] uppercase border rounded-[3px] px-2.5 py-1 ${
            testeur.active
              ? "border-sh-ok-ink text-sh-ok-ink bg-sh-ok-bg"
              : "border-sh-ink-dim text-sh-ink-dim bg-sh-ink-dim/5"
          }`}
        >
          {testeur.active ? "Actif" : "Désactivé"}
        </span>
      </div>
      <p className="font-plex-mono text-sh-ink-dim text-xs mb-4">{testeur.email || "E-mail non renseigné"}</p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            Missions réalisées
          </p>
          <p className="text-sh-ink text-sm font-plex-mono">{testeur.missions_count}</p>
        </div>
        {testeur.legal_status && (
          <div>
            <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
              Statut juridique
            </p>
            <p className="text-sh-ink text-sm">{testeur.legal_status}</p>
          </div>
        )}
      </div>

      {(testeur.specialties?.length ?? 0) > 0 && (
        <div className="mb-3">
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            Spécialités
          </p>
          <div className="flex flex-wrap gap-2">
            {testeur.specialties!.map((s) => (
              <span
                key={s}
                className="inline-block px-2.5 py-1 border border-sh-panel-line rounded-[3px] text-sh-ink-dim text-[12px]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {(testeur.certifications?.length ?? 0) > 0 && (
        <div className="mb-5">
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            Certifications
          </p>
          <div className="flex flex-wrap gap-2">
            {testeur.certifications!.map((c) => (
              <span
                key={c}
                className="inline-block px-2.5 py-1 border border-sh-panel-line rounded-[3px] text-sh-ink-dim text-[12px] uppercase"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      <button
        disabled={submitting}
        onClick={handleToggle}
        className={`border-none rounded-[3px] px-4 py-2.5 font-plex-mono text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          testeur.active ? "bg-sh-error-ink text-sh-bg" : "bg-sh-amber text-sh-amber-ink"
        }`}
      >
        {submitting ? "…" : testeur.active ? "Désactiver" : "Réactiver"}
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
    </div>
  );
}

export default function AdminTesteursPage() {
  const { session, state } = useAdminSession();
  const [testeurs, setTesteurs] = useState<Testeur[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (state !== "ready" || !session) return;

    async function loadTesteurs() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-list-testeurs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session!.access_token}`,
            },
          }
        );
        const result = await response.json();

        if (!response.ok) {
          setErrorMsg(result.error || "Une erreur est survenue.");
          return;
        }

        setTesteurs(result.testeurs as Testeur[]);
      } catch (err) {
        setErrorMsg(`Erreur réseau : ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    loadTesteurs();
  }, [state, session]);

  if (state === "checking" || state === "unauthenticated") {
    return (
      <div className="bg-sh-bg min-h-screen">
        <SiteHeader />
      </div>
    );
  }

  return (
    <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen">
      <SiteHeader />
      <div className="max-w-[720px] mx-auto px-5 pt-14 pb-24">
        <RedactionBars />
        <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
          Accès administrateur — vivier de testeurs
        </p>
        <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">Vivier de testeurs</h1>

        {state === "forbidden" && (
          <div className="bg-sh-panel border border-sh-error-ink rounded-[3px] p-7">
            <p className="font-plex-mono text-xs tracking-[0.08em] uppercase text-sh-error-ink mb-3">
              Accès réservé
            </p>
            <p className="text-sh-ink-dim text-sm">
              Ce compte n&apos;a pas les droits administrateur nécessaires pour accéder à cette
              zone.
            </p>
          </div>
        )}

        {state === "ready" && (
          <>
            {errorMsg && (
              <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
                {errorMsg}
              </div>
            )}

            {testeurs === null && !errorMsg && (
              <div className="text-sh-ink-dim text-sm">Chargement du vivier…</div>
            )}

            {testeurs !== null && testeurs.length === 0 && (
              <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-center text-sh-ink-dim text-sm">
                Aucun testeur vérifié pour le moment.
              </div>
            )}

            {testeurs?.map((testeur) => (
              <TesteurCard
                key={testeur.profile_id}
                testeur={testeur}
                accessToken={session?.access_token ?? ""}
                onToggled={(profileId, active) =>
                  setTesteurs((prev) =>
                    prev?.map((t) => (t.profile_id === profileId ? { ...t, active } : t)) ?? prev
                  )
                }
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
