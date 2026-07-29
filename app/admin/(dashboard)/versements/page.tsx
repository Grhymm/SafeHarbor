"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { supabase } from "@/lib/supabase/client";
import { useAdminSessionContext } from "@/lib/AdminSessionContext";
import { RedactionBars } from "@/components/RedactionBars";

type Payout = {
  id: string;
  mission_id: string;
  testeur_id: string;
  amount_cents: number;
  created_at: string;
  missions: { package_name_snapshot: string; currency_snapshot: string } | null;
  profiles: { full_name: string | null } | null;
};

type Msg = { type: "error" | "ok"; text: string } | null;

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

function PayoutRow({
  payout,
  accessToken,
  onPaid,
}: {
  payout: Payout;
  accessToken: string;
  onPaid: (payoutId: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  async function handleMarkPaid() {
    setSubmitting(true);
    setMsg(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-mark-payout-paid`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ payout_id: payout.id }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setMsg({ type: "error", text: result.error || "Une erreur est survenue." });
        setSubmitting(false);
        return;
      }

      posthog.capture("payout_marked_paid", {
        amount_cents: payout.amount_cents,
        currency: payout.missions?.currency_snapshot || "EUR",
      });
      onPaid(payout.id);
    } catch (err) {
      setMsg({ type: "error", text: `Erreur réseau : ${err instanceof Error ? err.message : String(err)}` });
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-6 mb-4">
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <div className="text-base font-semibold mb-1">
            {payout.profiles?.full_name || "Testeur non renseigné"}
          </div>
          <div className="text-sh-ink-dim text-[13px]">
            {payout.missions?.package_name_snapshot || "Mission introuvable"}
          </div>
        </div>
        <div className="font-plex-mono text-xl font-semibold text-sh-amber">
          {formatPrice(payout.amount_cents, payout.missions?.currency_snapshot || "EUR")}
        </div>
      </div>
      <div className="font-plex-mono text-xs text-sh-ink-dim mb-4">
        Versement dû depuis le {formatDate(payout.created_at)}
      </div>

      <button
        disabled={submitting}
        onClick={handleMarkPaid}
        className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4 py-2.5 font-plex-mono text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "…" : "Marquer comme payé"}
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

export default function AdminVersementsPage() {
  const session = useAdminSessionContext();
  const [payouts, setPayouts] = useState<Payout[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPayouts() {
      const { data, error } = await supabase
        .from("payouts")
        .select(
          "id, mission_id, testeur_id, amount_cents, created_at, missions(package_name_snapshot, currency_snapshot), profiles(full_name)"
        )
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setPayouts(data as unknown as Payout[]);
    }

    loadPayouts();
  }, []);

  return (
    <>
      <RedactionBars />
      <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
        Accès administrateur — versements
      </p>
      <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">Versements en attente</h1>

      {errorMsg && (
        <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
          {errorMsg}
        </div>
      )}

      {payouts === null && !errorMsg && (
        <div className="text-sh-ink-dim text-sm">Chargement des versements…</div>
      )}

      {payouts !== null && payouts.length === 0 && (
        <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-center text-sh-ink-dim text-sm">
          Aucun versement en attente.
        </div>
      )}

      {payouts?.map((payout) => (
        <PayoutRow
          key={payout.id}
          payout={payout}
          accessToken={session?.access_token ?? ""}
          onPaid={(payoutId) => setPayouts((prev) => prev?.filter((p) => p.id !== payoutId) ?? prev)}
        />
      ))}
    </>
  );
}
