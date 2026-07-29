"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { useAdminSessionContext } from "@/lib/AdminSessionContext";
import { RedactionBars } from "@/components/RedactionBars";

type Application = {
  profile_id: string;
  full_name: string | null;
  email: string | null;
  specialties: string[] | null;
  certifications: string[] | null;
  legal_status: string | null;
  bio: string | null;
  created_at: string;
};

type Msg = { type: "error" | "ok"; text: string } | null;

function ApplicationCard({
  application,
  accessToken,
  onResolved,
}: {
  application: Application;
  accessToken: string;
  onResolved: (profileId: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [reason, setReason] = useState("");

  async function callReview(decision: "approve" | "reject", reasonText?: string) {
    setSubmitting(true);
    setMsg(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-review-application`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ profile_id: application.profile_id, decision, reason: reasonText }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setMsg({ type: "error", text: result.error || "Une erreur est survenue." });
        setSubmitting(false);
        return;
      }

      posthog.capture("tester_application_reviewed", {
        decision,
        specialties: application.specialties ?? [],
        certifications: application.certifications ?? [],
      });
      onResolved(application.profile_id);
    } catch (err) {
      setMsg({ type: "error", text: `Erreur réseau : ${err instanceof Error ? err.message : String(err)}` });
      setSubmitting(false);
    }
  }

  function handleConfirmReject() {
    if (reason.trim().length < 3) {
      setMsg({ type: "error", text: "Un motif d'au moins 3 caractères est requis." });
      return;
    }
    callReview("reject", reason.trim());
  }

  return (
    <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 mb-5">
      <div className="text-lg font-semibold mb-1.5">
        {application.full_name || "Nom non renseigné"}
      </div>
      <p className="font-plex-mono text-sh-ink-dim text-xs mb-4">
        {application.email || "E-mail non renseigné"}
      </p>

      {application.legal_status && (
        <div className="mb-3">
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            Statut juridique
          </p>
          <p className="text-sh-ink text-sm">{application.legal_status}</p>
        </div>
      )}

      {(application.specialties?.length ?? 0) > 0 && (
        <div className="mb-3">
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            Spécialités
          </p>
          <div className="flex flex-wrap gap-2">
            {application.specialties!.map((s) => (
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

      {(application.certifications?.length ?? 0) > 0 && (
        <div className="mb-3">
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            Certifications
          </p>
          <div className="flex flex-wrap gap-2">
            {application.certifications!.map((c) => (
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

      {application.bio && (
        <div className="mb-5">
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            Expérience et motivation
          </p>
          <p className="text-sh-ink text-sm whitespace-pre-wrap">{application.bio}</p>
        </div>
      )}

      {!showRejectReason ? (
        <div className="flex gap-3">
          <button
            disabled={submitting}
            onClick={() => callReview("approve")}
            className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4 py-2.5 font-plex-mono text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "…" : "Approuver"}
          </button>
          <button
            disabled={submitting}
            onClick={() => setShowRejectReason(true)}
            className="bg-transparent text-sh-error-ink border border-sh-error-ink rounded-[3px] px-4 py-2.5 font-plex-mono text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Refuser
          </button>
        </div>
      ) : (
        <div>
          <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
            Motif du refus
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison communiquée au candidat par e-mail…"
            className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink min-h-[70px] resize-y focus:outline-none focus:border-sh-amber mb-3"
          />
          <div className="flex gap-3">
            <button
              disabled={submitting}
              onClick={handleConfirmReject}
              className="bg-sh-error-ink text-sh-bg border-none rounded-[3px] px-4 py-2.5 font-plex-mono text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "…" : "Confirmer le refus"}
            </button>
            <button
              disabled={submitting}
              onClick={() => {
                setShowRejectReason(false);
                setReason("");
                setMsg(null);
              }}
              className="bg-transparent text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-4 py-2.5 font-plex-mono text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

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

export default function AdminCandidaturesPage() {
  const session = useAdminSessionContext();
  const [applications, setApplications] = useState<Application[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    async function loadApplications() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-list-applications`,
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

        setApplications(result.applications as Application[]);
      } catch (err) {
        setErrorMsg(`Erreur réseau : ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    loadApplications();
  }, [session]);

  return (
    <>
      <RedactionBars />
      <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
        Accès administrateur — candidatures
      </p>
      <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">Candidatures testeurs</h1>

      {errorMsg && (
        <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
          {errorMsg}
        </div>
      )}

      {applications === null && !errorMsg && (
        <div className="text-sh-ink-dim text-sm">Chargement des candidatures…</div>
      )}

      {applications !== null && applications.length === 0 && (
        <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-center text-sh-ink-dim text-sm">
          Aucune candidature en attente.
        </div>
      )}

      {applications?.map((application) => (
        <ApplicationCard
          key={application.profile_id}
          application={application}
          accessToken={session?.access_token ?? ""}
          onResolved={(profileId) =>
            setApplications((prev) => prev?.filter((a) => a.profile_id !== profileId) ?? prev)
          }
        />
      ))}
    </>
  );
}
