"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAdminSessionContext } from "@/lib/AdminSessionContext";
import { RedactionBars } from "@/components/RedactionBars";
import { StatusBadge, STATUS_MAP, type MissionStatus } from "@/components/StatusBadge";

type Mission = {
  id: string;
  package_name_snapshot: string;
  package_code_snapshot: string;
  price_cents_snapshot: number;
  currency_snapshot: string;
  target_urls: string[];
  status: MissionStatus;
  created_at: string;
};

type EligibleTesteur = {
  profile_id: string;
  specialties: string[] | null;
  certifications: string[] | null;
  profiles: { full_name: string | null } | null;
};

type ReportRow = {
  id: string;
  storage_path: string;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  summary: string | null;
};

type Msg = { type: "error" | "ok"; text: string } | null;

const STATUS_FILTERS: (MissionStatus | "all")[] = [
  "all",
  "draft",
  "paid",
  "tester_assigned",
  "contracts_signed",
  "in_progress",
  "report_submitted",
  "under_review",
  "delivered",
  "validated",
  "disputed",
  "refunded",
  "closed",
  "cancelled",
];

const SINGLE_TESTEUR_PACKAGES = ["scan_express", "audit_essentiel", "audit_complet"];

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    trailingZeroDisplay: "stripIfInteger",
  }).format(cents / 100);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function AssignPanel({
  mission,
  accessToken,
  onAssigned,
}: {
  mission: Mission;
  accessToken: string;
  onAssigned: () => void;
}) {
  const [testeurs, setTesteurs] = useState<EligibleTesteur[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    supabase
      .from("testeur_profiles")
      .select("profile_id, specialties, certifications, profiles(full_name)")
      .eq("verification_status", "verified")
      .eq("active", true)
      .then(({ data, error }) => {
        if (!error) setTesteurs(data as unknown as EligibleTesteur[]);
      });
  }, []);

  function toggle(profileId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });
  }

  async function handleAssign() {
    if (selected.size === 0) {
      setMsg({ type: "error", text: "Sélectionnez au moins un testeur." });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-assign-testeur`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ mission_id: mission.id, testeur_ids: [...selected] }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        const rejectedNote = Array.isArray(result.rejected)
          ? ` (${result.rejected.length} testeur(s) non éligible(s))`
          : "";
        setMsg({ type: "error", text: (result.error || "Une erreur est survenue.") + rejectedNote });
        setSubmitting(false);
        return;
      }

      onAssigned();
    } catch (err) {
      setMsg({ type: "error", text: `Erreur réseau : ${err instanceof Error ? err.message : String(err)}` });
      setSubmitting(false);
    }
  }

  const recommendation = SINGLE_TESTEUR_PACKAGES.includes(mission.package_code_snapshot)
    ? "Repère : 1 testeur habituellement pour ce type de package."
    : "Repère : 2 à 3 testeurs habituellement pour un package sur mesure.";

  return (
    <div className="bg-sh-bg border border-sh-panel-line rounded-[3px] p-5 mt-4">
      <p className="font-plex-mono text-[11px] tracking-[0.06em] uppercase text-sh-amber mb-3">
        {recommendation}
      </p>

      {testeurs === null && <div className="text-sh-ink-dim text-sm">Chargement des testeurs…</div>}

      {testeurs !== null && testeurs.length === 0 && (
        <div className="text-sh-ink-dim text-sm mb-3">Aucun testeur vérifié et actif disponible.</div>
      )}

      {testeurs?.map((testeur) => (
        <label
          key={testeur.profile_id}
          className="flex items-start gap-3 border border-sh-panel-line rounded-[3px] p-3.5 mb-2.5 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected.has(testeur.profile_id)}
            onChange={() => toggle(testeur.profile_id)}
            className="accent-sh-amber w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
          />
          <div>
            <div className="text-sh-ink text-sm font-medium mb-1">
              {testeur.profiles?.full_name || "Nom non renseigné"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(testeur.specialties ?? []).map((s) => (
                <span
                  key={s}
                  className="inline-block px-2 py-0.5 border border-sh-panel-line rounded-[3px] text-sh-ink-dim text-[11px]"
                >
                  {s}
                </span>
              ))}
              {(testeur.certifications ?? []).map((c) => (
                <span
                  key={c}
                  className="inline-block px-2 py-0.5 border border-sh-amber/40 rounded-[3px] text-sh-amber text-[11px] uppercase"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </label>
      ))}

      <button
        disabled={submitting}
        onClick={handleAssign}
        className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4 py-2.5 font-plex-mono text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
      >
        {submitting ? "Assignation…" : "Assigner"}
      </button>

      {msg && (
        <div
          className={`rounded-[3px] px-3.5 py-3 text-[13px] mt-3 ${
            msg.type === "error" ? "bg-sh-error-bg text-sh-error-ink" : "bg-sh-ok-bg text-sh-ok-ink"
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}

function ReportPanel({
  mission,
  accessToken,
  onDelivered,
}: {
  mission: Mission;
  accessToken: string;
  onDelivered: () => void;
}) {
  const [report, setReport] = useState<ReportRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("reports")
        .select("id, storage_path, critical_count, high_count, medium_count, low_count, summary")
        .eq("mission_id", mission.id)
        .maybeSingle();

      setReport(data as ReportRow | null);
      setLoaded(true);

      if (data) {
        const { data: signed } = await supabase.storage
          .from("mission-documents")
          .createSignedUrl(data.storage_path, 3600);
        setSignedUrl(signed?.signedUrl ?? null);
      }
    }

    load();
  }, [mission.id]);

  async function handleDeliver() {
    if (!report) return;
    setSubmitting(true);
    setMsg(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-review-report`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ report_id: report.id }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setMsg({ type: "error", text: result.error || "Une erreur est survenue." });
        setSubmitting(false);
        return;
      }

      onDelivered();
    } catch (err) {
      setMsg({ type: "error", text: `Erreur réseau : ${err instanceof Error ? err.message : String(err)}` });
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-sh-bg border border-sh-panel-line rounded-[3px] p-5 mt-4">
      {!loaded && <div className="text-sh-ink-dim text-sm">Chargement du rapport…</div>}

      {loaded && !report && (
        <div className="text-sh-error-ink text-sm">Aucun rapport trouvé pour cette mission.</div>
      )}

      {report && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div>
              <div className="font-plex-mono text-lg font-semibold text-sh-error-ink">
                {report.critical_count}
              </div>
              <div className="text-sh-ink-dim text-[11px] uppercase">Critiques</div>
            </div>
            <div>
              <div className="font-plex-mono text-lg font-semibold text-sh-amber">{report.high_count}</div>
              <div className="text-sh-ink-dim text-[11px] uppercase">Hautes</div>
            </div>
            <div>
              <div className="font-plex-mono text-lg font-semibold text-sh-info-ink">
                {report.medium_count}
              </div>
              <div className="text-sh-ink-dim text-[11px] uppercase">Moyennes</div>
            </div>
            <div>
              <div className="font-plex-mono text-lg font-semibold text-sh-ink-dim">{report.low_count}</div>
              <div className="text-sh-ink-dim text-[11px] uppercase">Basses</div>
            </div>
          </div>

          {report.summary && (
            <p className="text-sh-ink text-sm whitespace-pre-wrap mb-4">{report.summary}</p>
          )}

          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-3 py-2 mb-4"
            >
              Télécharger le fichier
            </a>
          )}

          <div>
            <button
              disabled={submitting}
              onClick={handleDeliver}
              className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4 py-2.5 font-plex-mono text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Livraison…" : "Confirmer et livrer au client"}
            </button>
          </div>
        </>
      )}

      {msg && (
        <div
          className={`rounded-[3px] px-3.5 py-3 text-[13px] mt-3 ${
            msg.type === "error" ? "bg-sh-error-bg text-sh-error-ink" : "bg-sh-ok-bg text-sh-ok-ink"
          }`}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}

function MissionRow({
  mission,
  accessToken,
  onUpdated,
}: {
  mission: Mission;
  accessToken: string;
  onUpdated: (missionId: string, newStatus: MissionStatus) => void;
}) {
  const [expanded, setExpanded] = useState<"assign" | "report" | null>(null);

  return (
    <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-6 mb-4">
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <div className="text-base font-semibold">{mission.package_name_snapshot}</div>
          <div className="text-sh-ink-dim text-[13px] break-all">{mission.target_urls.join(", ")}</div>
        </div>
        <StatusBadge status={mission.status} />
      </div>
      <div className="flex justify-between items-center text-sh-ink-dim text-[13px] mb-4">
        <span>{formatPrice(mission.price_cents_snapshot, mission.currency_snapshot)}</span>
        <span className="font-plex-mono text-xs">Commandée le {formatDate(mission.created_at)}</span>
      </div>

      <Link
        href={`/admin/missions/${mission.id}`}
        className="inline-block font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-3 py-2 mr-3 mb-3"
      >
        Voir le détail
      </Link>

      {mission.status === "paid" && (
        <button
          onClick={() => setExpanded(expanded === "assign" ? null : "assign")}
          className="font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-3 py-2 bg-transparent cursor-pointer"
        >
          {expanded === "assign" ? "Fermer" : "Assigner un testeur"}
        </button>
      )}

      {mission.status === "report_submitted" && (
        <button
          onClick={() => setExpanded(expanded === "report" ? null : "report")}
          className="font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-3 py-2 bg-transparent cursor-pointer"
        >
          {expanded === "report" ? "Fermer" : "Relire et livrer"}
        </button>
      )}

      {expanded === "assign" && mission.status === "paid" && (
        <AssignPanel
          mission={mission}
          accessToken={accessToken}
          onAssigned={() => {
            onUpdated(mission.id, "tester_assigned");
            setExpanded(null);
          }}
        />
      )}

      {expanded === "report" && mission.status === "report_submitted" && (
        <ReportPanel
          mission={mission}
          accessToken={accessToken}
          onDelivered={() => {
            onUpdated(mission.id, "delivered");
            setExpanded(null);
          }}
        />
      )}
    </div>
  );
}

export default function AdminMissionsPage() {
  const session = useAdminSessionContext();
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [filter, setFilter] = useState<MissionStatus | "all">("all");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadMissions() {
      const { data, error } = await supabase
        .from("missions")
        .select(
          "id, package_name_snapshot, package_code_snapshot, price_cents_snapshot, currency_snapshot, target_urls, status, created_at"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setMissions(data as Mission[]);
    }

    loadMissions();
  }, []);

  const filtered = missions?.filter((m) => filter === "all" || m.status === filter) ?? null;

  return (
    <>
      <RedactionBars />
      <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
        Accès administrateur — missions
      </p>
      <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">Missions</h1>

      <div className="mb-6">
        <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
          Filtrer par statut
        </label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as MissionStatus | "all")}
          className="w-full max-w-[320px] bg-sh-panel border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
        >
          {STATUS_FILTERS.map((status) => (
            <option key={status} value={status}>
              {status === "all" ? "Tous les statuts" : STATUS_MAP[status].label}
            </option>
          ))}
        </select>
      </div>

      {errorMsg && (
        <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
          {errorMsg}
        </div>
      )}

      {filtered === null && !errorMsg && (
        <div className="text-sh-ink-dim text-sm">Chargement des missions…</div>
      )}

      {filtered !== null && filtered.length === 0 && (
        <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-center text-sh-ink-dim text-sm">
          Aucune mission pour ce filtre.
        </div>
      )}

      {filtered?.map((mission) => (
        <MissionRow
          key={mission.id}
          mission={mission}
          accessToken={session?.access_token ?? ""}
          onUpdated={(missionId, newStatus) =>
            setMissions((prev) =>
              prev?.map((m) => (m.id === missionId ? { ...m, status: newStatus } : m)) ?? prev
            )
          }
        />
      ))}
    </>
  );
}
