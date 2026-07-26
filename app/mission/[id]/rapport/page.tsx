"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { RedactionBars } from "@/components/RedactionBars";
import { SiteHeader } from "@/components/SiteHeader";

type MissionInfo = {
  id: string;
  client_id: string;
  package_name_snapshot: string;
  status: string;
};

type ExistingReport = {
  storage_path: string;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  summary: string;
};

type Msg = { type: "error" | "ok"; text: string } | null;

type PageState = "loading" | "unauthenticated" | "not-found" | "ready";

export default function MissionRapportPage() {
  const params = useParams<{ id: string }>();
  const missionId = params.id;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [mission, setMission] = useState<MissionInfo | null>(null);
  const [hadExistingReport, setHadExistingReport] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [criticalCount, setCriticalCount] = useState(0);
  const [highCount, setHighCount] = useState(0);
  const [mediumCount, setMediumCount] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [summary, setSummary] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    let active = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setPageState("unauthenticated");
        return;
      }
      setSession(session);

      const { data: missionData, error: missionError } = await supabase
        .from("missions")
        .select("id, client_id, package_name_snapshot, status")
        .eq("id", missionId)
        .maybeSingle();

      if (!active) return;

      if (missionError || !missionData) {
        setPageState("not-found");
        return;
      }
      setMission(missionData as MissionInfo);

      const { data: report } = await supabase
        .from("reports")
        .select("storage_path, critical_count, high_count, medium_count, low_count, summary")
        .eq("mission_id", missionId)
        .maybeSingle();

      if (!active) return;

      if (report) {
        const existing = report as ExistingReport;
        setHadExistingReport(true);
        setCriticalCount(existing.critical_count);
        setHighCount(existing.high_count);
        setMediumCount(existing.medium_count);
        setLowCount(existing.low_count);
        setSummary(existing.summary);
      }

      setPageState("ready");
    }

    init();

    return () => {
      active = false;
    };
  }, [missionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session) return;

    if (!file && !hadExistingReport) {
      setMsg({ type: "error", text: "Un fichier PDF est requis." });
      return;
    }
    if (summary.trim().length < 10) {
      setMsg({ type: "error", text: "Le résumé doit faire au moins 10 caractères." });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const storagePath = `${missionId}/rapport.pdf`;

      if (file) {
        const { error: uploadError } = await supabase.storage
          .from("mission-documents")
          .upload(storagePath, file, { upsert: true, contentType: "application/pdf" });

        if (uploadError) {
          setMsg({ type: "error", text: `Échec de l'upload : ${uploadError.message}` });
          setSubmitting(false);
          return;
        }
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            mission_id: missionId,
            storage_path: storagePath,
            critical_count: criticalCount,
            high_count: highCount,
            medium_count: mediumCount,
            low_count: lowCount,
            summary: summary.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMsg({ type: "error", text: result.error || "Une erreur est survenue." });
        return;
      }

      setHadExistingReport(true);
      setMsg({ type: "ok", text: result.message });
    } catch (err) {
      setMsg({
        type: "error",
        text: `Erreur réseau : ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isClient = !!(session && mission && mission.client_id === session.user.id);
  const dashboardHref = isClient ? "/mes-missions" : "/testeur/missions";

  if (pageState === "loading") {
    return (
      <div className="bg-sh-bg min-h-screen">
        <SiteHeader />
      </div>
    );
  }

  return (
    <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen">
      <SiteHeader />
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        <RedactionBars />
        <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
          Accès testeur — soumission de rapport
        </p>
        <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">
          Soumettre le rapport
        </h1>

        {pageState === "ready" && (
          <Link
            href={dashboardHref}
            className="inline-block text-sh-ink-dim text-sm mb-6 hover:text-sh-ink"
          >
            ← Retour à mes missions
          </Link>
        )}

        {pageState === "unauthenticated" && (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-sh-ink-dim text-sm">
            Vous devez être connecté pour accéder à cette page.{" "}
            <Link href="/testeur/connexion" className="text-sh-amber">
              Connexion testeur
            </Link>
          </div>
        )}

        {pageState === "not-found" && (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-sh-ink-dim text-sm">
            Mission introuvable, ou vous n&apos;y êtes pas assigné.
          </div>
        )}

        {pageState === "ready" && mission && (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7">
            <p className="font-plex-mono text-[11px] tracking-[0.1em] uppercase text-sh-ink-dim mb-1.5">
              Mission
            </p>
            <div className="text-lg font-semibold mb-6">{mission.package_name_snapshot}</div>

            {hadExistingReport && (
              <div className="bg-sh-info-bg text-sh-info-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
                Un rapport a déjà été soumis pour cette mission. Le formulaire est pré-rempli avec
                les valeurs existantes — resoumettre le mettra à jour.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-5.5">
                <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                  Rapport (PDF){!hadExistingReport && " — requis"}
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sh-ink text-[14px]"
                />
                {hadExistingReport && (
                  <p className="text-xs text-sh-ink-dim mt-1.5">
                    Laissez ce champ vide pour conserver le fichier déjà envoyé.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5.5">
                <div>
                  <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                    Critiques
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={criticalCount}
                    onChange={(e) => setCriticalCount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
                  />
                </div>
                <div>
                  <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                    Hautes
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={highCount}
                    onChange={(e) => setHighCount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
                  />
                </div>
                <div>
                  <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                    Moyennes
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={mediumCount}
                    onChange={(e) => setMediumCount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
                  />
                </div>
                <div>
                  <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                    Basses
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={lowCount}
                    onChange={(e) => setLowCount(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
                  />
                </div>
              </div>
              <p className="text-xs text-sh-ink-dim mb-5.5 -mt-3">
                Un rapport à 0 sur toutes les catégories est un résultat valide.
              </p>

              <div className="mb-6">
                <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                  Résumé du rapport
                </label>
                <textarea
                  required
                  minLength={10}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Synthèse des résultats du test..."
                  className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink min-h-[110px] resize-y focus:outline-none focus:border-sh-amber"
                />
                <p className="text-xs text-sh-ink-dim mt-1.5">10 caractères minimum.</p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4.5 py-3 font-plex-mono text-[13px] font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Envoi en cours…" : "Soumettre le rapport"}
              </button>

              {msg && (
                <div
                  className={`rounded-[3px] px-3.5 py-3 text-[13px] mt-5 ${
                    msg.type === "error" ? "bg-sh-error-bg text-sh-error-ink" : "bg-sh-ok-bg text-sh-ok-ink"
                  }`}
                >
                  {msg.text}
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
