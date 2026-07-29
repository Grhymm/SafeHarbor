"use client";

import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { supabase } from "@/lib/supabase/client";
import { useAdminSessionContext } from "@/lib/AdminSessionContext";
import { RedactionBars } from "@/components/RedactionBars";

type DeliveryUnit = "hours" | "business_days";

type Package = {
  id: string;
  code: string;
  name: string;
  scope_template: string | null;
  price_cents: number | null;
  testeur_payout_cents: number | null;
  currency: string;
  delivery_value: number | null;
  delivery_unit: DeliveryUnit | null;
  is_active: boolean;
  paddle_price_id: string | null;
};

type Msg = { type: "error" | "ok"; text: string } | null;

type FormState = {
  name: string;
  scope_template: string;
  price_cents: string; // major units, e.g. "149.00"
  paddle_price_id: string;
  testeur_payout_cents: string; // major units
  delivery_value: string;
  delivery_unit: DeliveryUnit;
  is_active: boolean;
};

function centsToMajor(cents: number | null): string {
  return cents === null ? "" : (cents / 100).toFixed(2);
}

function majorToCents(major: string): number | null {
  const trimmed = major.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

function formatPrice(cents: number | null, currency: string) {
  if (cents === null) return "Sur devis";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

function formatDelivery(value: number | null, unit: DeliveryUnit | null) {
  if (value === null || !unit) return "Non précisé";
  return unit === "hours" ? `${value}h` : `${value} jour${value > 1 ? "s" : ""} ouvré${value > 1 ? "s" : ""}`;
}

function toFormState(pkg: Package): FormState {
  return {
    name: pkg.name,
    scope_template: pkg.scope_template ?? "",
    price_cents: centsToMajor(pkg.price_cents),
    paddle_price_id: pkg.paddle_price_id ?? "",
    testeur_payout_cents: centsToMajor(pkg.testeur_payout_cents),
    delivery_value: pkg.delivery_value === null ? "" : String(pkg.delivery_value),
    delivery_unit: pkg.delivery_unit ?? "hours",
    is_active: pkg.is_active,
  };
}

function EditForm({
  pkg,
  accessToken,
  onSaved,
  onCancel,
}: {
  pkg: Package;
  accessToken: string;
  onSaved: (updated: Package) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(toFormState(pkg));
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const original = toFormState(pkg);
    const updates: Record<string, unknown> = {};

    if (form.name !== original.name) updates.name = form.name;
    if (form.scope_template !== original.scope_template) updates.scope_template = form.scope_template || null;
    if (form.testeur_payout_cents !== original.testeur_payout_cents) {
      updates.testeur_payout_cents = majorToCents(form.testeur_payout_cents);
    }
    if (form.delivery_value !== original.delivery_value) {
      updates.delivery_value = form.delivery_value.trim() === "" ? null : Number(form.delivery_value);
    }
    if (form.delivery_unit !== original.delivery_unit) updates.delivery_unit = form.delivery_unit;
    if (form.is_active !== original.is_active) updates.is_active = form.is_active;

    // price_cents et paddle_price_id sont toujours envoyés ensemble, jamais
    // l'un sans l'autre — la fonction backend refuse sinon.
    const priceChanged = form.price_cents !== original.price_cents;
    const paddleIdChanged = form.paddle_price_id !== original.paddle_price_id;
    if (priceChanged || paddleIdChanged) {
      updates.price_cents = majorToCents(form.price_cents);
      updates.paddle_price_id = form.paddle_price_id.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      setMsg({ type: "error", text: "Aucune modification à enregistrer." });
      return;
    }

    setSubmitting(true);
    setMsg(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-update-package`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ code: pkg.code, updates }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMsg({ type: "error", text: result.error || "Une erreur est survenue." });
        setSubmitting(false);
        return;
      }

      posthog.capture("package_updated", {
        package_code: pkg.code,
        updated_field_count: Object.keys(updates).length,
      });
      onSaved(result.package as Package);
    } catch (err) {
      setMsg({ type: "error", text: `Erreur réseau : ${err instanceof Error ? err.message : String(err)}` });
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-sh-bg border border-sh-panel-line rounded-[3px] p-5 mt-4">
      <div className="mb-4">
        <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
          Nom
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full bg-sh-panel border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
        />
      </div>

      <div className="mb-4">
        <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
          Description du périmètre
        </label>
        <textarea
          value={form.scope_template}
          onChange={(e) => set("scope_template", e.target.value)}
          className="w-full bg-sh-panel border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink min-h-[70px] resize-y focus:outline-none focus:border-sh-amber"
        />
      </div>

      <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-3">
        Ces deux valeurs doivent correspondre à un vrai prix créé dans Paddle. Créez d&apos;abord le
        prix dans Paddle avant de le renseigner ici.
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
            Prix ({pkg.currency})
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={form.price_cents}
            onChange={(e) => set("price_cents", e.target.value)}
            placeholder="149.00"
            className="w-full bg-sh-panel border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
          />
        </div>
        <div>
          <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
            ID de prix Paddle
          </label>
          <input
            type="text"
            value={form.paddle_price_id}
            onChange={(e) => set("paddle_price_id", e.target.value)}
            placeholder="pri_..."
            className="w-full bg-sh-panel border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink font-plex-mono focus:outline-none focus:border-sh-amber"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
          Versement testeur ({pkg.currency})
        </label>
        <input
          type="text"
          inputMode="decimal"
          value={form.testeur_payout_cents}
          onChange={(e) => set("testeur_payout_cents", e.target.value)}
          placeholder="90.00"
          className="w-full max-w-[220px] bg-sh-panel border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
            Délai
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={form.delivery_value}
            onChange={(e) => set("delivery_value", e.target.value)}
            className="w-full bg-sh-panel border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
          />
        </div>
        <div>
          <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
            Unité
          </label>
          <select
            value={form.delivery_unit}
            onChange={(e) => set("delivery_unit", e.target.value as DeliveryUnit)}
            className="w-full bg-sh-panel border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
          >
            <option value="hours">Heures</option>
            <option value="business_days">Jours ouvrés</option>
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2.5 mb-5 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => set("is_active", e.target.checked)}
          className="accent-sh-amber w-4 h-4 cursor-pointer"
        />
        <span className="text-sh-ink text-sm">Package actif (visible côté client)</span>
      </label>

      <div className="flex gap-3">
        <button
          disabled={submitting}
          onClick={handleSave}
          className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4 py-2.5 font-plex-mono text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button
          disabled={submitting}
          onClick={onCancel}
          className="bg-transparent text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-4 py-2.5 font-plex-mono text-xs font-semibold tracking-[0.05em] uppercase cursor-pointer"
        >
          Annuler
        </button>
      </div>

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

function PackageRow({
  pkg,
  accessToken,
  onUpdated,
}: {
  pkg: Package;
  accessToken: string;
  onUpdated: (updated: Package) => void;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-6 mb-4">
      <div className="flex justify-between items-start gap-4 mb-3">
        <div>
          <div className="text-base font-semibold">{pkg.name}</div>
          <div className="font-plex-mono text-xs text-sh-ink-dim mt-0.5">{pkg.code}</div>
        </div>
        <span
          className={`inline-block font-plex-mono text-[11px] tracking-[0.08em] uppercase border rounded-[3px] px-2.5 py-1 whitespace-nowrap ${
            pkg.is_active
              ? "border-sh-ok-ink text-sh-ok-ink bg-sh-ok-bg"
              : "border-sh-ink-dim text-sh-ink-dim bg-sh-ink-dim/5"
          }`}
        >
          {pkg.is_active ? "Actif" : "Inactif"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            Prix
          </p>
          <p className="font-plex-mono text-sh-amber font-semibold">
            {formatPrice(pkg.price_cents, pkg.currency)}
          </p>
        </div>
        <div>
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            Versement testeur
          </p>
          <p className="font-plex-mono text-sh-ink">
            {pkg.testeur_payout_cents === null ? "—" : formatPrice(pkg.testeur_payout_cents, pkg.currency)}
          </p>
        </div>
        <div>
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            Délai
          </p>
          <p>{formatDelivery(pkg.delivery_value, pkg.delivery_unit)}</p>
        </div>
        <div>
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-1.5">
            ID de prix Paddle
          </p>
          <p className="font-plex-mono text-sh-ink-dim text-xs break-all">{pkg.paddle_price_id || "—"}</p>
        </div>
      </div>

      <button
        onClick={() => setEditing((v) => !v)}
        className="font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-3 py-2 bg-transparent cursor-pointer"
      >
        {editing ? "Fermer" : "Modifier"}
      </button>

      {editing && (
        <EditForm
          pkg={pkg}
          accessToken={accessToken}
          onSaved={(updated) => {
            onUpdated(updated);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

export default function AdminCataloguePage() {
  const session = useAdminSessionContext();
  const [packages, setPackages] = useState<Package[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPackages() {
      const { data, error } = await supabase
        .from("packages")
        .select("*")
        .order("price_cents", { ascending: true, nullsFirst: false });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setPackages(data as Package[]);
    }

    loadPackages();
  }, []);

  return (
    <>
      <RedactionBars />
      <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
        Accès administrateur — catalogue
      </p>
      <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">Catalogue des packages</h1>

      {errorMsg && (
        <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
          {errorMsg}
        </div>
      )}

      {packages === null && !errorMsg && (
        <div className="text-sh-ink-dim text-sm">Chargement du catalogue…</div>
      )}

      {packages?.map((pkg) => (
        <PackageRow
          key={pkg.id}
          pkg={pkg}
          accessToken={session?.access_token ?? ""}
          onUpdated={(updated) =>
            setPackages((prev) => prev?.map((p) => (p.id === updated.id ? updated : p)) ?? prev)
          }
        />
      ))}
    </>
  );
}
