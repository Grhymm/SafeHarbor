"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { RedactionBars } from "@/components/RedactionBars";
import { StatusBadge, STATUS_MAP, type MissionStatus } from "@/components/StatusBadge";

type MissionDetail = {
  id: string;
  status: MissionStatus;
  package_name_snapshot: string;
  price_cents_snapshot: number;
  currency_snapshot: string;
  target_urls: string[];
  environment: string | null;
  created_at: string;
  client: { full_name: string | null } | null;
};

type Assignment = {
  testeur_id: string;
  assigned_at: string;
  profiles: { full_name: string | null } | null;
};

type HistoryEntry = {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
};

type DocumentRow = {
  id: string;
  type: string;
  status: string;
  storage_path: string;
  created_at: string;
};

type SignatureRow = {
  id: string;
  document_id: string;
  signer_role: "client" | "testeur" | "plateforme";
  signed_at: string | null;
  profiles: { full_name: string | null } | null;
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    trailingZeroDisplay: "stripIfInteger",
  }).format(cents / 100);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMissionDetailPage() {
  const params = useParams<{ id: string }>();
  const missionId = params.id;

  const [mission, setMission] = useState<MissionDetail | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [signatures, setSignatures] = useState<SignatureRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadAll() {
      const [{ data: missionData, error: missionError }, { data: assignmentData }, { data: historyData }, { data: documentData }] =
        await Promise.all([
          supabase
            .from("missions")
            .select(
              "id, status, package_name_snapshot, price_cents_snapshot, currency_snapshot, target_urls, environment, created_at, client:profiles!missions_client_id_fkey(full_name)"
            )
            .eq("id", missionId)
            .maybeSingle(),
          supabase
            .from("mission_assignments")
            .select("testeur_id, assigned_at, profiles!mission_assignments_testeur_id_fkey(full_name)")
            .eq("mission_id", missionId),
          supabase
            .from("mission_status_history")
            .select("id, status, note, created_at")
            .eq("mission_id", missionId)
            .order("created_at", { ascending: true }),
          supabase
            .from("documents")
            .select("id, type, status, storage_path, created_at")
            .eq("mission_id", missionId)
            .order("created_at", { ascending: true }),
        ]);

      if (missionError) {
        setErrorMsg(missionError.message);
        setLoaded(true);
        return;
      }

      setMission(missionData as unknown as MissionDetail);
      setAssignments((assignmentData as unknown as Assignment[]) ?? []);
      setHistory((historyData as HistoryEntry[]) ?? []);
      setDocuments((documentData as DocumentRow[]) ?? []);

      const documentIds = (documentData ?? []).map((d) => d.id);
      if (documentIds.length > 0) {
        const { data: signatureData } = await supabase
          .from("signatures")
          .select("id, document_id, signer_role, signed_at, profiles(full_name)")
          .in("document_id", documentIds)
          .order("signed_at", { ascending: true });
        setSignatures((signatureData as unknown as SignatureRow[]) ?? []);
      }

      setLoaded(true);
    }

    loadAll();
  }, [missionId]);

  return (
    <>
      <RedactionBars />
      <Link href="/admin/missions" className="inline-block text-sh-ink-dim text-sm mb-6 hover:text-sh-ink">
        ← Retour aux missions
      </Link>
      <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
        Accès administrateur — détail de mission
      </p>
      <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">Détail de la mission</h1>

      {errorMsg && (
        <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
          {errorMsg}
        </div>
      )}

      {!loaded && !errorMsg && <div className="text-sh-ink-dim text-sm">Chargement…</div>}

      {loaded && !mission && !errorMsg && (
        <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-center text-sh-ink-dim text-sm">
          Mission introuvable.
        </div>
      )}

      {mission && (
        <>
                <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 mb-5">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div className="text-lg font-semibold">{mission.package_name_snapshot}</div>
                    <StatusBadge status={mission.status} />
                  </div>
                  <div className="font-plex-mono text-2xl font-semibold text-sh-amber mb-4">
                    {formatPrice(mission.price_cents_snapshot, mission.currency_snapshot)}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
                        Client
                      </p>
                      <p>{mission.client?.full_name || "Non renseigné"}</p>
                    </div>
                    <div>
                      <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
                        Environnement
                      </p>
                      <p>
                        {mission.environment === "production"
                          ? "Production"
                          : mission.environment === "staging"
                            ? "Staging / préproduction"
                            : "Non précisé"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
                        URLs cibles
                      </p>
                      <p className="break-all">{mission.target_urls.join(", ")}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
                        Testeur(s) assigné(s)
                      </p>
                      <p>
                        {assignments.length > 0
                          ? assignments.map((a) => a.profiles?.full_name || a.testeur_id).join(", ")
                          : "Aucun"}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-3">
                  Chronologie des statuts
                </p>
                <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-5 mb-5">
                  {history.length === 0 && (
                    <p className="text-sh-ink-dim text-sm">Aucun historique enregistré.</p>
                  )}
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex justify-between items-start gap-4 py-2.5 border-b border-sh-panel-line last:border-0"
                    >
                      <div>
                        <span className="text-sh-ink text-sm">
                          {STATUS_MAP[entry.status as MissionStatus]?.label ?? entry.status}
                        </span>
                        {entry.note && <p className="text-sh-ink-dim text-xs mt-0.5">{entry.note}</p>}
                      </div>
                      <span className="font-plex-mono text-xs text-sh-ink-dim whitespace-nowrap">
                        {formatDateTime(entry.created_at)}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-3">
                  Documents
                </p>
                <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-5 mb-5">
                  {documents.length === 0 && (
                    <p className="text-sh-ink-dim text-sm">Aucun document pour cette mission.</p>
                  )}
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex justify-between items-center py-2.5 border-b border-sh-panel-line last:border-0"
                    >
                      <span className="text-sh-ink text-sm">{doc.type}</span>
                      <span
                        className={`inline-block font-plex-mono text-[11px] tracking-[0.06em] uppercase border rounded-[3px] px-2.5 py-1 ${
                          doc.status === "signed"
                            ? "border-sh-ok-ink text-sh-ok-ink bg-sh-ok-bg"
                            : doc.status === "pending_signature"
                              ? "border-sh-amber text-sh-amber bg-sh-amber/10"
                              : "border-sh-ink-dim text-sh-ink-dim bg-sh-ink-dim/5"
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>
                  ))}
                </div>

                <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-3">
                  Signatures
                </p>
                <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-5">
                  {signatures.length === 0 && (
                    <p className="text-sh-ink-dim text-sm">Aucune signature enregistrée.</p>
                  )}
                  {signatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex justify-between items-center py-2.5 border-b border-sh-panel-line last:border-0"
                    >
                      <span className="text-sh-ink text-sm">
                        {sig.signer_role === "plateforme"
                          ? "Plateforme"
                          : sig.profiles?.full_name || (sig.signer_role === "client" ? "Client" : "Testeur")}
                        <span className="text-sh-ink-dim text-xs ml-2">({sig.signer_role})</span>
                      </span>
                      <span className="font-plex-mono text-xs text-sh-ink-dim whitespace-nowrap">
                        {formatDateTime(sig.signed_at)}
                      </span>
                    </div>
                  ))}
                </div>
        </>
      )}
    </>
  );
}
