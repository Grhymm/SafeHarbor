"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useProtectedSession } from "@/lib/useProtectedSession";
import { RedactionBars } from "@/components/RedactionBars";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusBadge, type MissionStatus } from "@/components/StatusBadge";

type Mission = {
  id: string;
  package_name_snapshot: string;
  price_cents_snapshot: number;
  currency_snapshot: string;
  target_urls: string[];
  created_at: string;
  status: MissionStatus;
  testeur_id: string | null;
};

const CERTIFICATION_LABELS: Record<string, string> = {
  oscp: "OSCP",
  ceh: "CEH",
  passi: "PASSI",
  gpen: "GPEN",
  autre: "Autre",
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    trailingZeroDisplay: "stripIfInteger",
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const REPORT_AVAILABLE_STATUSES: MissionStatus[] = ["delivered", "validated", "closed"];

function MissionCard({
  mission,
  accessToken,
  onValidated,
}: {
  mission: Mission;
  accessToken: string;
  onValidated: (missionId: string) => void;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [validateMessage, setValidateMessage] = useState<string | null>(null);
  const [testeurCertifications, setTesteurCertifications] = useState<string[]>([]);

  useEffect(() => {
    if (!REPORT_AVAILABLE_STATUSES.includes(mission.status) || !mission.testeur_id) return;

    let active = true;

    supabase
      .from("testeur_profiles")
      .select("certifications")
      .eq("profile_id", mission.testeur_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const certs = (data?.certifications as string[] | null) ?? [];
        setTesteurCertifications(certs.filter((c) => c !== "aucune"));
      });

    return () => {
      active = false;
    };
  }, [mission.status, mission.testeur_id]);

  async function handleValidateReport() {
    setValidating(true);
    setValidateError(null);
    setValidateMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validate-mission`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ mission_id: mission.id }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setValidateError(result.error || "Cette mission n'est pas encore livrée.");
        } else if (response.status === 403) {
          setValidateError(result.error || "Vous n'êtes pas le client associé à cette mission.");
        } else {
          setValidateError(result.error || "Une erreur est survenue.");
        }
        return;
      }

      setValidateMessage(result.message || "Rapport validé.");
      onValidated(mission.id);
    } catch (err) {
      setValidateError(`Erreur réseau : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setValidating(false);
    }
  }

  async function handleDownloadReport() {
    setDownloading(true);
    setDownloadError(null);

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("storage_path")
      .eq("mission_id", mission.id)
      .maybeSingle();

    if (reportError || !report) {
      setDownloadError("Rapport introuvable.");
      setDownloading(false);
      return;
    }

    const { data: signed, error: signError } = await supabase.storage
      .from("mission-documents")
      .createSignedUrl(report.storage_path, 3600);

    if (signError || !signed) {
      setDownloadError("Impossible de générer le lien de téléchargement.");
      setDownloading(false);
      return;
    }

    window.open(signed.signedUrl, "_blank");
    setDownloading(false);
  }

  return (
    <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 mb-5">
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="text-lg font-semibold">{mission.package_name_snapshot}</div>
        <StatusBadge status={mission.status} />
      </div>
      <div className="font-plex-mono text-2xl font-semibold text-sh-amber mb-4">
        {formatPrice(mission.price_cents_snapshot, mission.currency_snapshot)}
      </div>
      <div className="text-sh-ink-dim text-[13px] mb-1.5 break-all">
        {mission.target_urls.join(", ")}
      </div>
      <div className="font-plex-mono text-xs text-sh-ink-dim mb-3">
        Commandée le {formatDate(mission.created_at)}
      </div>
      {mission.status === "tester_assigned" && (
        <Link
          href={`/mission/${mission.id}/signature`}
          className="inline-block font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-3 py-2"
        >
          Signer l&apos;autorisation de test
        </Link>
      )}
      {REPORT_AVAILABLE_STATUSES.includes(mission.status) && (
        <>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadReport}
              disabled={downloading}
              className="font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-3 py-2 bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? "Préparation du lien…" : "Télécharger le rapport"}
            </button>
            {mission.status === "delivered" && (
              <button
                onClick={handleValidateReport}
                disabled={validating}
                className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-3 py-2 font-plex-mono text-xs font-semibold tracking-[0.06em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? "Validation…" : "Valider le rapport"}
              </button>
            )}
            {testeurCertifications.map((cert) => (
              <span
                key={cert}
                className="inline-flex items-center font-plex-mono text-[11px] tracking-[0.06em] uppercase text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-2.5 py-2"
              >
                {CERTIFICATION_LABELS[cert] ?? cert}
              </span>
            ))}
          </div>
          {downloadError && (
            <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mt-3">
              {downloadError}
            </div>
          )}
          {validateError && (
            <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mt-3">
              {validateError}
            </div>
          )}
          {validateMessage && (
            <div className="bg-sh-ok-bg text-sh-ok-ink rounded-[3px] px-3.5 py-3 text-[13px] mt-3">
              {validateMessage}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MesMissionsPage() {
  const { session, checkingSession } = useProtectedSession("/commander");
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    let channel: RealtimeChannel | null = null;

    async function loadMissions() {
      const { data, error } = await supabase
        .from("missions")
        .select("id, package_name_snapshot, price_cents_snapshot, currency_snapshot, target_urls, created_at, status, testeur_id")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setMissions(data as Mission[]);

      channel = supabase
        .channel("missions-client-changes")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "missions" },
          (payload) => {
            setMissions((prev) => {
              const current = prev ?? [];

              if (payload.eventType === "DELETE") {
                return current.filter((m) => m.id !== (payload.old as Mission).id);
              }

              const updated = payload.new as Mission;
              const exists = current.some((m) => m.id === updated.id);
              const next = exists
                ? current.map((m) => (m.id === updated.id ? updated : m))
                : [updated, ...current];

              return next.sort(
                (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              );
            });
          }
        )
        .subscribe();
    }

    loadMissions();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [session]);

  if (checkingSession) {
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
          Accès client — mes missions
        </p>
        <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">Mes missions</h1>
        <p className="text-sh-ink-dim text-[15px] max-w-[52ch] mb-8">
          Suivi de vos audits de sécurité commandés.
        </p>

        {errorMsg && (
          <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
            {errorMsg}
          </div>
        )}

        {missions === null && !errorMsg && (
          <div className="text-sh-ink-dim text-sm">Chargement des missions…</div>
        )}

        {missions !== null && missions.length === 0 && (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-center text-sh-ink-dim text-sm">
            Aucune mission pour le moment.
          </div>
        )}

        {missions?.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            accessToken={session?.access_token ?? ""}
            onValidated={(missionId) => {
              setMissions((prev) =>
                prev?.map((m) => (m.id === missionId ? { ...m, status: "validated" } : m)) ?? prev
              );
            }}
          />
        ))}
      </div>
    </div>
  );
}
