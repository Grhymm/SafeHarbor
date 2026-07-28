"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { RedactionBars } from "@/components/RedactionBars";

type PaymentStatus = "pending" | "paid" | "partially_refunded" | "refunded" | "failed";

type Payment = {
  id: string;
  amount_cents: number;
  currency: string;
  status: PaymentStatus;
  paid_at: string | null;
  refunded_cents: number;
  created_at: string;
  missions: { package_name_snapshot: string } | null;
};

const STATUS_LABELS: Record<PaymentStatus, { label: string; tone: "gray" | "green" | "amber" | "red" }> = {
  pending: { label: "En attente", tone: "amber" },
  paid: { label: "Payé", tone: "green" },
  partially_refunded: { label: "Partiellement remboursé", tone: "amber" },
  refunded: { label: "Remboursé", tone: "gray" },
  failed: { label: "Échoué", tone: "red" },
};

const TONE_CLASSES: Record<string, string> = {
  gray: "border-sh-ink-dim text-sh-ink-dim bg-sh-ink-dim/5",
  amber: "border-sh-amber text-sh-amber bg-sh-amber/10",
  green: "border-sh-ok-ink text-sh-ok-ink bg-sh-ok-bg",
  red: "border-sh-error-ink text-sh-error-ink bg-sh-error-bg",
};

function formatPrice(cents: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    trailingZeroDisplay: "stripIfInteger",
  }).format(cents / 100);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminPaiementsPage() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPayments() {
      const { data, error } = await supabase
        .from("payments")
        .select("id, amount_cents, currency, status, paid_at, refunded_cents, created_at, missions(package_name_snapshot)")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setPayments(data as unknown as Payment[]);
    }

    loadPayments();
  }, []);

  return (
    <>
      <RedactionBars />
      <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
        Accès administrateur — paiements
      </p>
      <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">Paiements reçus</h1>

      {errorMsg && (
        <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
          {errorMsg}
        </div>
      )}

      {payments === null && !errorMsg && (
        <div className="text-sh-ink-dim text-sm">Chargement des paiements…</div>
      )}

      {payments !== null && payments.length === 0 && (
        <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-center text-sh-ink-dim text-sm">
          Aucun paiement pour le moment.
        </div>
      )}

      {payments?.map((payment) => {
        const statusInfo = STATUS_LABELS[payment.status];
        return (
          <div key={payment.id} className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-6 mb-4">
            <div className="flex justify-between items-start gap-4 mb-3">
              <div>
                <div className="text-base font-semibold">
                  {payment.missions?.package_name_snapshot || "Mission introuvable"}
                </div>
                <div className="font-plex-mono text-xs text-sh-ink-dim mt-1">
                  Reçu le {formatDate(payment.created_at)}
                  {payment.paid_at ? ` — payé le ${formatDate(payment.paid_at)}` : ""}
                </div>
              </div>
              <span
                className={`inline-block font-plex-mono text-[11px] tracking-[0.08em] uppercase border rounded-[3px] px-2.5 py-1 whitespace-nowrap ${TONE_CLASSES[statusInfo.tone]}`}
              >
                {statusInfo.label}
              </span>
            </div>
            <div className="font-plex-mono text-xl font-semibold text-sh-amber">
              {formatPrice(payment.amount_cents, payment.currency)}
            </div>
            {payment.refunded_cents > 0 && (
              <div className="text-sh-ink-dim text-[13px] mt-1.5">
                Dont {formatPrice(payment.refunded_cents, payment.currency)} remboursé(s)
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
