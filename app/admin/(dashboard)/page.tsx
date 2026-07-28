"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { RedactionBars } from "@/components/RedactionBars";
import { STATUS_MAP, type MissionStatus } from "@/components/StatusBadge";

type DashboardData = {
  pendingApplications: number;
  pendingPayouts: number;
  missionsByStatus: Partial<Record<MissionStatus, number>>;
};

function StatTile({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7">
      <div className="font-plex-mono text-3xl font-semibold text-sh-amber mb-1.5">{value}</div>
      <div className="text-sh-ink-dim text-[13px]">{label}</div>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="block transition-colors duration-200 hover:border-sh-amber">
      {content}
    </Link>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      const [{ count: pendingApplications, error: applicationsError }, { count: pendingPayouts, error: payoutsError }, { data: missions, error: missionsError }] =
        await Promise.all([
          supabase
            .from("testeur_profiles")
            .select("*", { count: "exact", head: true })
            .eq("verification_status", "pending"),
          supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("missions").select("status"),
        ]);

      if (applicationsError || payoutsError || missionsError) {
        setErrorMsg(
          applicationsError?.message || payoutsError?.message || missionsError?.message || "Une erreur est survenue."
        );
        return;
      }

      const missionsByStatus: Partial<Record<MissionStatus, number>> = {};
      (missions ?? []).forEach((m) => {
        const status = m.status as MissionStatus;
        missionsByStatus[status] = (missionsByStatus[status] ?? 0) + 1;
      });

      setData({
        pendingApplications: pendingApplications ?? 0,
        pendingPayouts: pendingPayouts ?? 0,
        missionsByStatus,
      });
    }

    loadDashboard();
  }, []);

  return (
    <>
      <RedactionBars />
      <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
        Accès administrateur — tableau de bord
      </p>
      <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">Tableau de bord</h1>

      {errorMsg && (
        <div className="bg-sh-error-bg text-sh-error-ink rounded-[3px] px-3.5 py-3 text-[13px] mb-5">
          {errorMsg}
        </div>
      )}

      {!data && !errorMsg && <div className="text-sh-ink-dim text-sm">Chargement…</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
            <StatTile
              label="Candidatures en attente"
              value={data.pendingApplications}
              href="/admin/candidatures"
            />
            <StatTile
              label="Versements en attente"
              value={data.pendingPayouts}
              href="/admin/versements"
            />
          </div>

          <p className="font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-3">
            Missions par statut
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(data.missionsByStatus) as MissionStatus[]).map((status) => (
              <div key={status} className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-4">
                <div className="font-plex-mono text-xl font-semibold text-sh-amber mb-1">
                  {data.missionsByStatus[status]}
                </div>
                <div className="text-sh-ink-dim text-[12px]">{STATUS_MAP[status]?.label ?? status}</div>
              </div>
            ))}
            {Object.keys(data.missionsByStatus).length === 0 && (
              <div className="text-sh-ink-dim text-sm col-span-full">Aucune mission.</div>
            )}
          </div>
        </>
      )}
    </>
  );
}
