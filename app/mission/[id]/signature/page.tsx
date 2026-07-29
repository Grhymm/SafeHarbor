"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import posthog from "posthog-js";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { RedactionBars } from "@/components/RedactionBars";
import { SiteHeader } from "@/components/SiteHeader";

type MissionInfo = {
  id: string;
  client_id: string;
  package_name_snapshot: string;
  target_urls: string[];
  environment: string | null;
  status: string;
};

type SignResult =
  | { status: "signed"; message: string }
  | { status: "pending_signature"; client_signed: boolean; testeurs_signed: number; testeurs_total: number };

type PageState = "loading" | "unauthenticated" | "not-found" | "ready";

export default function MissionSignaturePage() {
  const params = useParams<{ id: string }>();
  const missionId = params.id;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [mission, setMission] = useState<MissionInfo | null>(null);
  const [signResult, setSignResult] = useState<SignResult | null>(null);
  const [alreadySignedByMe, setAlreadySignedByMe] = useState(false);
  const [signing, setSigning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function callSignEndpoint(accessToken: string) {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ mission_id: missionId }),
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Une erreur est survenue.");
      return result as SignResult;
    }

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) return;

      if (!session) {
        setPageState("unauthenticated");
        return;
      }

      setSession(session);

      const { data: missionData, error: missionError } = await supabase
        .from("missions")
        .select("id, client_id, package_name_snapshot, target_urls, environment, status")
        .eq("id", missionId)
        .maybeSingle();

      if (!active) return;

      if (missionError || !missionData) {
        setPageState("not-found");
        return;
      }

      setMission(missionData as MissionInfo);

      const { data: document } = await supabase
        .from("documents")
        .select("id, status")
        .eq("mission_id", missionId)
        .eq("type", "autorisation_test")
        .maybeSingle();

      if (!active) return;

      if (document?.status === "signed") {
        setSignResult({ status: "signed", message: "Toutes les parties ont signé — la mission peut démarrer." });
        setAlreadySignedByMe(true);
        setPageState("ready");
        return;
      }

      let signedByMe = false;
      if (document) {
        const { data: signatures } = await supabase
          .from("signatures")
          .select("signer_id")
          .eq("document_id", document.id);

        signedByMe = (signatures ?? []).some((s) => s.signer_id === session.user.id);
      }

      if (!active) return;
      setAlreadySignedByMe(signedByMe);

      // Déjà signé par cette personne : on peut rappeler la fonction sans risque
      // (idempotente) pour rafraîchir le décompte exact des autres parties.
      if (signedByMe) {
        try {
          const result = await callSignEndpoint(session.access_token);
          if (active) setSignResult(result);
        } catch (err) {
          if (active) setErrorMsg(err instanceof Error ? err.message : String(err));
        }
      }

      if (active) setPageState("ready");
    }

    init();

    return () => {
      active = false;
    };
  }, [missionId]);

  async function handleSign() {
    if (!session) return;
    setSigning(true);
    setErrorMsg(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sign-document`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ mission_id: missionId }),
        }
      );
      const result = await response.json();

      if (!response.ok) {
        setErrorMsg(result.error || "Une erreur est survenue.");
        return;
      }

      posthog.capture("test_authorization_signed", {
        signer_role: mission?.client_id === session.user.id ? "client" : "testeur",
        signature_status: (result as SignResult).status,
      });
      setSignResult(result as SignResult);
      setAlreadySignedByMe(true);
    } catch (err) {
      setErrorMsg(`Erreur réseau : ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSigning(false);
    }
  }

  const isClient = !!(session && mission && mission.client_id === session.user.id);
  const dashboardHref = isClient ? "/mes-missions" : "/testeur/missions";

  if (pageState === "loading") {
    return (
      <div className="bg-sh-bg min-h-screen">
        <SiteHeader />
      </div>
    );
  }

  return (
    <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen">
      <SiteHeader />
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        <RedactionBars />
        <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
          Autorisation de test — signature électronique
        </p>
        <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">
          Signer l&apos;autorisation de test
        </h1>

        {pageState === "ready" && (
          <Link
            href={dashboardHref}
            className="inline-block text-sh-ink-dim text-sm mb-6 hover:text-sh-ink"
          >
            ← Retour à mes missions
          </Link>
        )}

        {pageState === "unauthenticated" && (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-sh-ink-dim text-sm">
            Vous devez être connecté pour accéder à cette page.{" "}
            <Link href="/commander" className="text-sh-amber">
              Connexion client
            </Link>{" "}
            ·{" "}
            <Link href="/testeur/connexion" className="text-sh-amber">
              Connexion testeur
            </Link>
          </div>
        )}

        {pageState === "not-found" && (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-sh-ink-dim text-sm">
            Mission introuvable, ou vous n&apos;avez pas accès à cette mission.
          </div>
        )}

        {pageState === "ready" && mission && (
          <>
            <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 mb-5">
              <p className="font-plex-mono text-[11px] tracking-[0.1em] uppercase text-sh-ink-dim mb-1.5">
                Mission
              </p>
              <div className="text-lg font-semibold mb-4">{mission.package_name_snapshot}</div>

              <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                URLs cibles
              </p>
              <div className="text-sh-ink text-[14px] mb-4 break-all">
                {mission.target_urls.join(", ")}
              </div>

              <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
                Environnement
              </p>
              <div className="text-sh-ink text-[14px]">
                {mission.environment === "production" ? "Production" : mission.environment === "staging" ? "Staging / préproduction" : "Non précisé"}
              </div>
            </div>

            <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 mb-5 text-[14px] text-sh-ink-dim space-y-4">
              <p>
                En signant électroniquement ce document, vous confirmez avoir pris connaissance
                des termes de l&apos;Autorisation de Test pour la mission{" "}
                <strong className="text-sh-ink font-medium">{mission.package_name_snapshot}</strong>{" "}
                et vous les acceptez.
              </p>
              <p>
                <strong className="text-sh-ink font-medium">Périmètre.</strong> Le test autorisé
                par ce document est strictement limité aux URLs listées ci-dessus. Toute action en
                dehors de ce périmètre précis n&apos;est pas couverte par cette autorisation.
              </p>
              <p>
                <strong className="text-sh-ink font-medium">Fenêtre temporelle.</strong> Les dates
                et heures précises d&apos;intervention restent à définir avec l&apos;équipe
                SafeHarbor avant le démarrage effectif du test ; aucune action ne doit être menée
                en dehors de cette fenêtre une fois confirmée.
              </p>
              <p>
                <strong className="text-sh-ink font-medium">Confidentialité.</strong> Toute
                information obtenue dans le cadre de ce test (vulnérabilités, données, accès)
                est strictement confidentielle et ne peut être divulguée à un tiers ni utilisée en
                dehors du cadre de cette mission.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
                {errorMsg}
              </div>
            )}

            {signResult?.status === "signed" && (
              <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-11 text-center">
                <div className="inline-block font-plex-mono text-xs tracking-[0.12em] uppercase text-sh-ok-ink border border-sh-ok-ink rounded-[3px] px-3.5 py-1.5 mb-4.5">
                  Document signé
                </div>
                <p className="text-sh-ink-dim text-sm max-w-[42ch] mx-auto mb-6">
                  {signResult.message}
                </p>
                <Link
                  href={dashboardHref}
                  className="inline-block font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-4 py-2.5"
                >
                  Retour au tableau de bord
                </Link>
              </div>
            )}

            {signResult?.status === "pending_signature" && (
              <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7">
                <p className="font-plex-mono text-xs tracking-[0.08em] uppercase text-sh-amber mb-3">
                  En attente des autres signatures
                </p>
                <p className="text-sh-ink-dim text-sm mb-1.5">
                  {signResult.testeurs_signed}/{signResult.testeurs_total} testeur
                  {signResult.testeurs_total > 1 ? "s" : ""} {signResult.testeurs_signed > 1 ? "ont" : "a"} signé.
                </p>
                <p className="text-sh-ink-dim text-sm mb-5">
                  {signResult.client_signed ? "Le client a signé." : "En attente de la signature du client."}
                </p>
                {alreadySignedByMe && (
                  <p className="text-sh-ok-ink text-sm mb-4">Vous avez déjà signé ce document.</p>
                )}
                <Link
                  href={dashboardHref}
                  className="inline-block font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-4 py-2.5"
                >
                  Retour au tableau de bord
                </Link>
              </div>
            )}

            {!signResult && !alreadySignedByMe && (
              <button
                disabled={signing}
                onClick={handleSign}
                className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4.5 py-3 font-plex-mono text-[13px] font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signing ? "Signature en cours…" : "Je lis et j'accepte, je signe électroniquement"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
