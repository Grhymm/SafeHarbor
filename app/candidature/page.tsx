"use client";

import { useState } from "react";
import { RedactionBars } from "@/components/RedactionBars";

type Msg = { type: "error" | "ok"; text: string } | null;

const SPECIALTIES = [
  { value: "wordpress", label: "WordPress" },
  { value: "prestashop", label: "PrestaShop" },
  { value: "shopify", label: "Shopify" },
  { value: "api", label: "API / backend" },
  { value: "autre", label: "Autre" },
];

export default function CandidaturePage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [legalStatus, setLegalStatus] = useState("");
  const [motivation, setMotivation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [submitted, setSubmitted] = useState(false);

  function toggleSpecialty(value: string) {
    setSpecialties((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setIsSubmitting(true);
    setMsg(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/submit-testeur-application`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim(),
            specialties,
            legal_status: legalStatus || null,
            motivation: motivation.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setMsg({ type: "error", text: result.error || "Une erreur est survenue." });
        setIsSubmitting(false);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      setMsg({
        type: "error",
        text: `Erreur réseau : ${err instanceof Error ? err.message : String(err)}`,
      });
      setIsSubmitting(false);
    }
  }

  return (
    <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen">
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        <h2 className="sr-only">
          Formulaire de candidature pour rejoindre le vivier de testeurs de sécurité
        </h2>

        <RedactionBars />
        <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
          Accès restreint — candidature testeur
        </p>
        <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">
          Rejoindre le vivier de testeurs
        </h1>
        <p className="text-sh-ink-dim text-[15px] max-w-[52ch] mb-10">
          Toute candidature est examinée manuellement avant activation. Tu peux postuler ici,
          mais tu n&apos;auras accès à <strong className="text-sh-ink font-medium">aucune mission</strong> tant
          qu&apos;un membre de l&apos;équipe n&apos;a pas validé ton profil — c&apos;est cette vérification qui
          protège nos clients.
        </p>

        {!submitted ? (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7">
            <form onSubmit={handleSubmit}>
              <div className="mb-5.5">
                <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                  Nom complet
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
                />
              </div>

              <div className="mb-5.5">
                <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
                />
              </div>

              <div className="mb-5.5">
                <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                  Spécialités
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {SPECIALTIES.map((s) => {
                    const checked = specialties.includes(s.value);
                    return (
                      <label key={s.value} className="relative cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSpecialty(s.value)}
                          className="absolute opacity-0 w-full h-full cursor-pointer m-0"
                        />
                        <span
                          className={`inline-block px-3.5 py-2 border rounded-[3px] text-[13px] ${
                            checked
                              ? "border-sh-amber text-sh-amber bg-sh-amber/[0.08]"
                              : "border-sh-panel-line text-sh-ink-dim"
                          }`}
                        >
                          {s.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="mb-5.5">
                <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                  Statut juridique (optionnel)
                </label>
                <select
                  value={legalStatus}
                  onChange={(e) => setLegalStatus(e.target.value)}
                  className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink focus:outline-none focus:border-sh-amber"
                >
                  <option value="">Non précisé</option>
                  <option value="auto-entrepreneur">Auto-entrepreneur</option>
                  <option value="societe">Société</option>
                  <option value="salarie">Salarié en parallèle</option>
                </select>
              </div>

              <div>
                <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                  Expérience et motivation
                </label>
                <textarea
                  required
                  minLength={20}
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Missions réalisées, certifications, CTF, bug bounty, projets personnels..."
                  className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] text-sh-ink min-h-[90px] resize-y focus:outline-none focus:border-sh-amber"
                />
                <p className="text-xs text-sh-ink-dim mt-1.5">
                  20 caractères minimum — quelques phrases suffisent, ce n&apos;est pas une lettre de
                  motivation.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4.5 py-3.5 font-plex-mono text-[13px] font-semibold tracking-[0.06em] uppercase cursor-pointer mt-6.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Envoi en cours…" : "Envoyer ma candidature"}
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
        ) : (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-11 text-center">
            <div className="inline-block font-plex-mono text-xs tracking-[0.12em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-3.5 py-1.5 mb-4.5">
              En attente de validation
            </div>
            <p className="text-sh-ink-dim text-sm max-w-[42ch] mx-auto">
              Ta candidature est enregistrée. Un membre de l&apos;équipe examine ton profil et passe ton
              compte en statut vérifié avant toute assignation de mission.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
