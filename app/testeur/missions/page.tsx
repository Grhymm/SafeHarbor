"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useProtectedSession } from "@/lib/useProtectedSession";
import { RedactionBars } from "@/components/RedactionBars";
import { StatusBadge, type MissionStatus } from "@/components/StatusBadge";

type Mission = {
  id: string;
  package_name_snapshot: string;
  target_urls: string[];
  status: MissionStatus;
};

function MissionCard({ mission }: { mission: Mission }) {
  return (
    <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 mb-5">
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="text-lg font-semibold">{mission.package_name_snapshot}</div>
        <StatusBadge status={mission.status} />
      </div>
      <div className="text-sh-ink-dim text-[13px] mb-4 break-all">
        {mission.target_urls.join(", ")}
      </div>
      {mission.status === "tester_assigned" && (
        <Link
          href={`/mission/${mission.id}/signature`}
          className="inline-block font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-3 py-2"
        >
          Signer l&apos;autorisation de test
        </Link>
      )}
      {(mission.status === "contracts_signed" || mission.status === "in_progress") && (
        <Link
          href={`/mission/${mission.id}/rapport`}
          className="inline-block font-plex-mono text-xs tracking-[0.06em] uppercase text-sh-amber border border-sh-amber rounded-[3px] px-3 py-2"
        >
          Soumettre le rapport
        </Link>
      )}
    </div>
  );
}

export default function TesteurMissionsPage() {
  const { session, checkingSession } = useProtectedSession("/testeur/connexion");
  const [missions, setMissions] = useState<Mission[] | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    supabase
      .from("missions")
      .select("id, package_name_snapshot, target_urls, status")
      .then(({ data, error }) => {
        if (error) {
          setErrorMsg(error.message);
          return;
        }
        setMissions(data as Mission[]);
      });
  }, [session]);

  if (checkingSession) {
    return <div className="bg-sh-bg min-h-screen" />;
  }

  return (
    <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen">
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        <RedactionBars />
        <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
          Accès testeur — mes missions
        </p>
        <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">Mes missions</h1>
        <p className="text-sh-ink-dim text-[15px] max-w-[52ch] mb-8">
          Missions qui te sont assignées.
        </p>

        <div className="flex justify-between items-center mb-6 font-plex-mono text-xs text-sh-ink-dim">
          <span>Connecté : {session?.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-transparent text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-3.5 py-2 text-[13px] cursor-pointer"
          >
            Se déconnecter
          </button>
        </div>

        {errorMsg && (
          <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
            {errorMsg}
          </div>
        )}

        {missions === null && !errorMsg && (
          <div className="text-sh-ink-dim text-sm">Chargement des missions…</div>
        )}

        {missions !== null && missions.length === 0 && (
          <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 text-center text-sh-ink-dim text-sm">
            Aucune mission assignée pour le moment.
          </div>
        )}

        {missions?.map((mission) => (
          <MissionCard key={mission.id} mission={mission} />
        ))}
      </div>
    </div>
  );
}
