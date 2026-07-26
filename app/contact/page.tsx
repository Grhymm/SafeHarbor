import { SiteHeader } from "@/components/SiteHeader";
import { RedactionBars } from "@/components/RedactionBars";

const CONTACT_EMAIL = "contact@safeharbor.io";

export default function ContactPage() {
  return (
    <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen">
      <SiteHeader />
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        <RedactionBars />
        <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
          Sur devis — nous contacter
        </p>
        <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">
          Discutons de votre périmètre
        </h1>
        <p className="text-sh-ink-dim text-[15px] max-w-[52ch] mb-10">
          Pour un périmètre complexe, multi-domaines, ou des besoins spécifiques qui sortent des
          trois packages standards, décrivez-nous votre besoin et on revient vers vous avec un devis.
        </p>

        <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7">
          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
            Nous écrire
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-sh-amber text-lg font-plex-mono break-all"
          >
            {CONTACT_EMAIL}
          </a>
          <p className="text-sh-ink-dim text-[13px] mt-4">
            Précisez l&apos;URL (ou les URLs) à couvrir, l&apos;environnement, et ce qui rend le
            périmètre plus complexe qu&apos;un audit standard — ça nous aide à revenir vers vous
            plus vite avec un chiffrage.
          </p>
        </div>
      </div>
    </div>
  );
}
