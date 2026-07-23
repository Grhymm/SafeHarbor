import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { SiteHeader } from "@/components/SiteHeader";
import { CHECKOUT_PACKAGES, CUSTOM_PACKAGE, formatUsd } from "@/lib/packages";

const MIN_PRICE = formatUsd(Math.min(...CHECKOUT_PACKAGES.map((p) => p.priceCents)));
const MAX_PRICE = formatUsd(Math.max(...CHECKOUT_PACKAGES.map((p) => p.priceCents)));

const REDACTION_ROWS = [
  [
    { width: 28, delay: 0.05 },
    { width: 84, delay: 0.15 },
    { width: 16, delay: 0.25 },
  ],
  [
    { width: 52, delay: 0.2 },
    { width: 20, delay: 0.3 },
    { width: 60, delay: 0.4 },
  ],
];

const DOC_LINES = [
  [38, 22],
  [60],
  [30, 44],
  [50, 18],
  [70],
];

const GLOW_GRADIENT = "radial-gradient(circle, var(--color-sh-amber-glow), transparent 70%)";
const SCAN_GRADIENT =
  "linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-sh-amber) 8%, transparent), transparent)";

export default function Home() {
  return (
    <div className="relative bg-sh-bg text-sh-ink font-plex-sans min-h-screen overflow-x-hidden">
      {/* Ambient glow — décor derrière lequel le glassmorphism a du sens */}
      <div
        aria-hidden="true"
        className="fixed z-0 pointer-events-none rounded-full blur-[90px] opacity-[0.16]"
        style={{ top: "-220px", right: "-160px", width: "520px", height: "520px", background: GLOW_GRADIENT }}
      />
      <div
        aria-hidden="true"
        className="fixed z-0 pointer-events-none rounded-full blur-[90px] opacity-10"
        style={{ top: "900px", left: "-200px", width: "460px", height: "460px", background: GLOW_GRADIENT }}
      />
      <div
        aria-hidden="true"
        className="fixed z-0 pointer-events-none rounded-full blur-[90px] opacity-10"
        style={{ top: "1900px", right: "-180px", width: "480px", height: "480px", background: GLOW_GRADIENT }}
      />

      <div className="relative z-[1]">
        <SiteHeader />
      </div>

      <div className="relative z-[1] max-w-[1080px] mx-auto px-6">
        <section className="py-22 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          <div>
            <div className="flex flex-col gap-2 mb-6.5 animate-[fadeUpHero_0.7s_ease_both]" aria-hidden="true">
              {REDACTION_ROWS.map((row, i) => (
                <div key={i} className="flex gap-1.5">
                  {row.map((bar, j) => (
                    <div
                      key={j}
                      className="h-[11px] rounded-[1px] bg-sh-bar origin-left scale-x-0 animate-[revealBar_0.5s_ease_forwards]"
                      style={{ width: `${bar.width}px`, animationDelay: `${bar.delay}s` }}
                    />
                  ))}
                </div>
              ))}
            </div>

            <p
              className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-4 animate-[fadeUpHero_0.7s_ease_both]"
              style={{ animationDelay: "0.05s" }}
            >
              Plateforme d&apos;audit de sécurité
            </p>
            <h1
              className="text-[34px] lg:text-[44px] font-bold leading-[1.12] tracking-[-0.02em] mb-5.5 animate-[fadeUpHero_0.7s_ease_both]"
              style={{ animationDelay: "0.1s" }}
            >
              La sécurité de votre site,
              <br />
              testée par de <span className="text-sh-amber">vrais experts vérifiés</span>.
            </h1>
            <p
              className="text-sh-ink-dim text-base max-w-[46ch] mb-8.5 animate-[fadeUpHero_0.7s_ease_both]"
              style={{ animationDelay: "0.15s" }}
            >
              Un audit mené par un testeur vérifié manuellement, livré en 72h à 5 jours, à prix
              fixe — sans jargon commercial, sans devis à rallonge.
            </p>

            <div className="flex gap-3.5 flex-wrap animate-[fadeUpHero_0.7s_ease_both]">
              <Link
                href="/commander"
                className="inline-flex items-center gap-2 rounded-[3px] px-5 py-3.5 font-plex-mono text-[13px] font-semibold tracking-[0.04em] uppercase bg-sh-amber text-sh-amber-ink transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-8px_var(--color-sh-amber-glow)]"
              >
                Commander un audit
              </Link>
              <Link
                href="/candidature"
                className="inline-flex items-center gap-2 rounded-[3px] px-5 py-3.5 font-plex-mono text-[13px] font-semibold tracking-[0.04em] uppercase border border-sh-panel-line text-sh-ink bg-white/[0.02] transition-all duration-200 hover:border-sh-amber hover:-translate-y-0.5"
              >
                Rejoindre le vivier de testeurs
              </Link>
            </div>
          </div>

          <div
            className="sh-glass rounded-[3px] p-6.5 relative overflow-hidden animate-[fadeUpHero_0.8s_ease_both]"
            style={{ animationDelay: "0.2s" }}
            aria-hidden="true"
          >
            <div
              className="absolute left-0 right-0 h-[60px] pointer-events-none animate-[scanSweep_4s_ease-in-out_infinite]"
              style={{ top: "-60px", background: SCAN_GRADIENT }}
            />
            <div className="flex justify-between font-plex-mono text-[11px] tracking-[0.1em] uppercase text-sh-ink-faint mb-4.5">
              <span>Rapport d&apos;audit</span>
              <span>#47627A</span>
            </div>
            {DOC_LINES.map((line, i) => (
              <div key={i} className="flex gap-1.5 mb-2.75">
                {line.map((w, j) => (
                  <div key={j} className="h-[9px] rounded-[1px] bg-sh-bar" style={{ width: `${w}%` }} />
                ))}
              </div>
            ))}
            <span className="inline-flex items-center gap-1.75 mt-4 font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sh-amber animate-[pulseDot_2s_ease-in-out_infinite]" />
              Livré — 0 faille critique
            </span>
          </div>
        </section>
      </div>

      <div className="relative z-[1] max-w-[1080px] mx-auto px-6">
        <Reveal
          delayIndex={0}
          className="border-y border-sh-panel-line py-7.5 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="text-[13px] text-sh-ink-dim">
            <strong className="block text-sh-ink text-[15px] font-semibold mb-1">
              Vérification manuelle
            </strong>
            Chaque testeur est identifié avant de rejoindre le vivier — aucun profil anonyme
            n&apos;accède à une mission.
          </div>
          <div className="text-[13px] text-sh-ink-dim">
            <strong className="block text-sh-ink text-[15px] font-semibold mb-1">
              Prix fixe, annoncé d&apos;avance
            </strong>
            De {MIN_PRICE} à {MAX_PRICE} selon le périmètre. Pas de devis à négocier, pas de
            surprise à la facture.
          </div>
          <div className="text-[13px] text-sh-ink-dim">
            <strong className="block text-sh-ink text-[15px] font-semibold mb-1">
              Cadre juridique signé
            </strong>
            Autorisation de test signée électroniquement par les deux parties avant que le
            moindre test ne commence.
          </div>
        </Reveal>
      </div>

      <div className="relative z-[1] max-w-[1080px] mx-auto px-6">
        <section className="py-22">
          <Reveal delayIndex={1} className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-3">
            Comment ça marche
          </Reveal>
          <Reveal delayIndex={2} className="text-[30px] font-bold tracking-[-0.01em] mb-4">
            <h2>Trois étapes, aucune ambiguïté</h2>
          </Reveal>
          <Reveal delayIndex={3} className="text-sh-ink-dim text-[15px] max-w-[56ch] mb-12">
            Le même processus pour chaque mission, du premier clic au rapport final.
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Reveal delayIndex={4} className="sh-glass rounded-[3px] p-6.5">
              <div className="font-plex-mono text-sm text-sh-amber mb-3.5">01</div>
              <h3 className="text-[17px] font-semibold mb-2">Choisissez un package</h3>
              <p className="text-sh-ink-dim text-sm">
                Décrivez l&apos;URL à tester et l&apos;environnement — production ou
                préproduction.
              </p>
            </Reveal>
            <Reveal delayIndex={5} className="sh-glass rounded-[3px] p-6.5">
              <div className="font-plex-mono text-sm text-sh-amber mb-3.5">02</div>
              <h3 className="text-[17px] font-semibold mb-2">Un testeur vérifié intervient</h3>
              <p className="text-sh-ink-dim text-sm">
                Dans le périmètre et la fenêtre temporelle signés par les deux parties, rien de
                plus.
              </p>
            </Reveal>
            <Reveal delayIndex={6} className="sh-glass rounded-[3px] p-6.5">
              <div className="font-plex-mono text-sm text-sh-amber mb-3.5">03</div>
              <h3 className="text-[17px] font-semibold mb-2">Recevez un rapport clair</h3>
              <p className="text-sh-ink-dim text-sm">
                Vulnérabilités classées par criticité, recommandations concrètes, sans jargon
                inutile.
              </p>
            </Reveal>
          </div>
        </section>
      </div>

      <div className="relative z-[1] max-w-[1080px] mx-auto px-6">
        <section className="pb-22">
          <Reveal delayIndex={7} className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-3">
            Tarifs
          </Reveal>
          <Reveal delayIndex={8} className="text-[30px] font-bold tracking-[-0.01em] mb-4">
            <h2>Quatre formats, un prix qui ne bouge pas</h2>
          </Reveal>
          <Reveal delayIndex={9} className="text-sh-ink-dim text-[15px] max-w-[56ch] mb-12">
            Trois formats à prix fixe pour les besoins courants, plus un format sur mesure pour
            les périmètres plus complexes.
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {CHECKOUT_PACKAGES.map((pkg, i) => (
              <Reveal key={pkg.code} delayIndex={10 + i} className="sh-glass rounded-[3px] p-7">
                <p className="font-plex-mono text-[11px] tracking-[0.1em] uppercase text-sh-ink-dim mb-2">
                  {pkg.eyebrow}
                </p>
                <div className="text-lg font-semibold mb-2">{pkg.name}</div>
                <p className="text-sh-ink-dim text-[13px] mb-5">{pkg.scope}.</p>
                <div className="font-plex-mono text-[28px] font-semibold text-sh-amber mb-1">
                  {formatUsd(pkg.priceCents)}
                </div>
                <p className="text-sh-ink-dim text-[13px] mb-5.5">{pkg.delivery}</p>
                <Link
                  href="/commander"
                  className="inline-flex items-center gap-1 font-plex-mono text-xs tracking-[0.05em] uppercase text-sh-ink border-b border-sh-amber pb-0.5 transition-colors duration-200 hover:text-sh-amber"
                >
                  Commander <ArrowRight size={14} />
                </Link>
              </Reveal>
            ))}
            <Reveal
              delayIndex={10 + CHECKOUT_PACKAGES.length}
              className="sh-glass rounded-[3px] border-2 border-sh-amber p-7"
            >
              <p className="font-plex-mono text-[11px] tracking-[0.1em] uppercase text-sh-amber mb-2">
                {CUSTOM_PACKAGE.eyebrow}
              </p>
              <div className="text-lg font-semibold mb-2">{CUSTOM_PACKAGE.name}</div>
              <p className="text-sh-ink-dim text-[13px] mb-5">{CUSTOM_PACKAGE.scope}</p>
              <div className="font-plex-mono text-[28px] font-semibold text-sh-amber mb-1">
                À partir de {formatUsd(CUSTOM_PACKAGE.startingPriceCents)}
              </div>
              <p className="text-sh-ink-dim text-[13px] mb-5.5">Devis personnalisé</p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-1 font-plex-mono text-xs tracking-[0.05em] uppercase text-sh-ink border-b border-sh-amber pb-0.5 transition-colors duration-200 hover:text-sh-amber"
              >
                Nous contacter <ArrowRight size={14} />
              </Link>
            </Reveal>
          </div>
        </section>
      </div>

      <div className="relative z-[1] max-w-[1080px] mx-auto px-6">
        <section className="pb-22">
          <Reveal
            delayIndex={11 + CHECKOUT_PACKAGES.length}
            className="sh-glass rounded-[3px] p-11 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8"
          >
            <div>
              <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-1.5">
                Pour les testeurs
              </p>
              <h2 className="text-[30px] font-bold tracking-[-0.01em] mb-2.5">
                Vous trouvez des failles ? Faites-en une activité rémunérée.
              </h2>
              <p className="text-sh-ink-dim text-sm max-w-[46ch]">
                Candidature ouverte à tous, examinée manuellement. Aucun accès à une mission tant
                que votre profil n&apos;est pas vérifié — c&apos;est ce qui protège nos clients,
                et votre crédibilité.
              </p>
            </div>
            <Link
              href="/candidature"
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-[3px] px-5 py-3.5 font-plex-mono text-[13px] font-semibold tracking-[0.04em] uppercase bg-sh-amber text-sh-amber-ink transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-8px_var(--color-sh-amber-glow)]"
            >
              Postuler maintenant
            </Link>
          </Reveal>
        </section>
      </div>

      <div className="relative z-[1] max-w-[1080px] mx-auto px-6">
        <footer className="border-t border-sh-panel-line py-8 flex justify-between items-center text-[13px] text-sh-ink-faint">
          <div className="font-plex-mono text-[13px]">
            SAFE<span className="text-sh-amber">HARBOR</span>
          </div>
          <div>© 2026 SafeHarbor</div>
        </footer>
      </div>
    </div>
  );
}
