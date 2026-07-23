import Link from "next/link";
import { ArrowRight } from "lucide-react";

const REDACTION_ROWS = [
  [28, 84, 16],
  [52, 20, 60],
];

const DOC_LINES = [
  [38, 22],
  [60],
  [30, 44],
  [50, 18],
  [70],
];

export default function Home() {
  return (
    <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen">
      <div className="max-w-[1080px] mx-auto px-6">
        <nav className="flex justify-between items-center py-5.5 border-b border-sh-panel-line">
          <div className="font-plex-mono text-[15px] font-semibold tracking-[0.02em]">
            SAFE<span className="text-sh-amber">HARBOR</span>
          </div>
          <div className="flex gap-7 text-sm text-sh-ink-dim">
            <Link href="/commander" className="hover:text-sh-ink">
              Commander un audit
            </Link>
            <Link href="/candidature" className="hover:text-sh-ink">
              Devenir testeur
            </Link>
          </div>
        </nav>
      </div>

      <div className="max-w-[1080px] mx-auto px-6">
        <section className="py-22 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
          <div>
            <div className="flex flex-col gap-2 mb-6.5" aria-hidden="true">
              {REDACTION_ROWS.map((row, i) => (
                <div key={i} className="flex gap-1.5">
                  {row.map((w, j) => (
                    <div key={j} className="h-[11px] rounded-[1px] bg-sh-bar" style={{ width: `${w}px` }} />
                  ))}
                </div>
              ))}
            </div>

            <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-4">
              Plateforme d&apos;audit de sécurité
            </p>
            <h1 className="text-[34px] lg:text-[44px] font-bold leading-[1.12] tracking-[-0.02em] mb-5.5">
              La sécurité de votre site,
              <br />
              testée par de <span className="text-sh-amber">vrais experts vérifiés</span>.
            </h1>
            <p className="text-sh-ink-dim text-base max-w-[46ch] mb-8.5">
              Un audit mené par un testeur vérifié manuellement, livré en 72h à 5 jours, à prix
              fixe — sans jargon commercial, sans devis à rallonge.
            </p>

            <div className="flex gap-3.5 flex-wrap">
              <Link
                href="/commander"
                className="inline-flex items-center gap-2 rounded-[3px] px-5 py-3.5 font-plex-mono text-[13px] font-semibold tracking-[0.04em] uppercase bg-sh-amber text-sh-amber-ink"
              >
                Commander un audit
              </Link>
              <Link
                href="/candidature"
                className="inline-flex items-center gap-2 rounded-[3px] px-5 py-3.5 font-plex-mono text-[13px] font-semibold tracking-[0.04em] uppercase border border-sh-panel-line text-sh-ink"
              >
                Rejoindre le vivier de testeurs
              </Link>
            </div>
          </div>

          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-6.5" aria-hidden="true">
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
            <span className="inline-block mt-4 font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-2.5 py-1.5">
              Livré — 0 faille critique
            </span>
          </div>
        </section>
      </div>

      <div className="max-w-[1080px] mx-auto px-6">
        <div className="border-y border-sh-panel-line py-7.5 grid grid-cols-1 md:grid-cols-3 gap-6">
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
            590€ ou 1590€ selon le périmètre. Pas de devis à négocier, pas de surprise à la
            facture.
          </div>
          <div className="text-[13px] text-sh-ink-dim">
            <strong className="block text-sh-ink text-[15px] font-semibold mb-1">
              Cadre juridique signé
            </strong>
            Autorisation de test signée électroniquement par les deux parties avant que le
            moindre test ne commence.
          </div>
        </div>
      </div>

      <div className="max-w-[1080px] mx-auto px-6">
        <section className="py-22">
          <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-3">
            Comment ça marche
          </p>
          <h2 className="text-[30px] font-bold tracking-[-0.01em] mb-4">
            Trois étapes, aucune ambiguïté
          </h2>
          <p className="text-sh-ink-dim text-[15px] max-w-[56ch] mb-12">
            Le même processus pour chaque mission, du premier clic au rapport final.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-6.5">
              <div className="font-plex-mono text-sm text-sh-amber mb-3.5">01</div>
              <h3 className="text-[17px] font-semibold mb-2">Choisissez un package</h3>
              <p className="text-sh-ink-dim text-sm">
                Décrivez l&apos;URL à tester et l&apos;environnement — production ou
                préproduction.
              </p>
            </div>
            <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-6.5">
              <div className="font-plex-mono text-sm text-sh-amber mb-3.5">02</div>
              <h3 className="text-[17px] font-semibold mb-2">Un testeur vérifié intervient</h3>
              <p className="text-sh-ink-dim text-sm">
                Dans le périmètre et la fenêtre temporelle signés par les deux parties, rien de
                plus.
              </p>
            </div>
            <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-6.5">
              <div className="font-plex-mono text-sm text-sh-amber mb-3.5">03</div>
              <h3 className="text-[17px] font-semibold mb-2">Recevez un rapport clair</h3>
              <p className="text-sh-ink-dim text-sm">
                Vulnérabilités classées par criticité, recommandations concrètes, sans jargon
                inutile.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="max-w-[1080px] mx-auto px-6">
        <section className="pb-22">
          <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-3">
            Tarifs
          </p>
          <h2 className="text-[30px] font-bold tracking-[-0.01em] mb-4">
            Deux formats, un prix qui ne bouge pas
          </h2>
          <p className="text-sh-ink-dim text-[15px] max-w-[56ch] mb-12">
            Au-delà de ces deux packages, un devis sur mesure reste possible pour les périmètres
            plus complexes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7">
              <p className="font-plex-mono text-[11px] tracking-[0.1em] uppercase text-sh-ink-dim mb-2">
                Package — Essentiel
              </p>
              <div className="text-lg font-semibold mb-2">Audit Essentiel</div>
              <p className="text-sh-ink-dim text-[13px] mb-5">
                Site vitrine / petite boutique — surface publique + authentification simple.
              </p>
              <div className="font-plex-mono text-[28px] font-semibold text-sh-amber mb-1">
                590 €
              </div>
              <p className="text-sh-ink-dim text-[13px] mb-5.5">Livré sous 72h</p>
              <Link
                href="/commander"
                className="inline-flex items-center gap-1 font-plex-mono text-xs tracking-[0.05em] uppercase text-sh-ink border-b border-sh-amber pb-0.5"
              >
                Commander <ArrowRight size={14} />
              </Link>
            </div>
            <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7">
              <p className="font-plex-mono text-[11px] tracking-[0.1em] uppercase text-sh-ink-dim mb-2">
                Package — Complet
              </p>
              <div className="text-lg font-semibold mb-2">Audit Complet</div>
              <p className="text-sh-ink-dim text-[13px] mb-5">
                E-commerce / espace membre — parcours authentifié, paiement en boîte noire,
                back-office.
              </p>
              <div className="font-plex-mono text-[28px] font-semibold text-sh-amber mb-1">
                1 590 €
              </div>
              <p className="text-sh-ink-dim text-[13px] mb-5.5">Livré sous 5 jours ouvrés</p>
              <Link
                href="/commander"
                className="inline-flex items-center gap-1 font-plex-mono text-xs tracking-[0.05em] uppercase text-sh-ink border-b border-sh-amber pb-0.5"
              >
                Commander <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <div className="max-w-[1080px] mx-auto px-6">
        <section className="pb-22">
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-11 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
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
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-[3px] px-5 py-3.5 font-plex-mono text-[13px] font-semibold tracking-[0.04em] uppercase bg-sh-amber text-sh-amber-ink"
            >
              Postuler maintenant
            </Link>
          </div>
        </section>
      </div>

      <div className="max-w-[1080px] mx-auto px-6">
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
