// ============================================================================
// Edge Function : submit-report
// Le testeur a déjà déposé son fichier dans le bucket Storage
// (mission-documents/{mission_id}/...) directement depuis le frontend — la
// policy Storage dédiée l'y autorise. Cette fonction enregistre les
// métadonnées du rapport et fait avancer le statut de la mission.
//
// Resoumission : si un rapport existe déjà pour cette mission, cet appel le
// met à jour plutôt que d'en créer un second — utile si le testeur doit
// corriger quelque chose avant la relecture de la Plateforme.
//
// Important, conforme à l'Article 5 des CGU : le rapport n'est PAS transmis
// automatiquement au client à ce stade. Le statut passe à 'report_submitted',
// pas 'delivered' — la transmission après triage reste une étape manuelle
// admin pour l'instant (voir admin-queries).
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

const ALLOWED_PRIOR_STATUSES = ["contracts_signed", "in_progress"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Authentification requise" }, 401);

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await callerClient.auth.getUser();
  if (authError || !user) return json({ error: "Session invalide" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const {
    mission_id,
    storage_path,
    critical_count = 0,
    high_count = 0,
    medium_count = 0,
    low_count = 0,
    summary,
  } = body;

  if (!mission_id || !storage_path) {
    return json({ error: "mission_id et storage_path sont requis" }, 400);
  }
  if (!storage_path.startsWith(`${mission_id}/`)) {
    return json({ error: "storage_path doit être situé dans le dossier de la mission" }, 400);
  }
  if (!summary || typeof summary !== "string" || summary.trim().length < 10) {
    return json({ error: "Un résumé du rapport est requis (10 caractères minimum)" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("id, status, testeur_id")
    .eq("id", mission_id)
    .maybeSingle();

  if (missionError) { console.error(missionError); return json({ error: "Erreur serveur" }, 500); }
  if (!mission) return json({ error: "Mission introuvable" }, 404);

  const { data: assignments, error: assignmentsError } = await supabase
    .from("mission_assignments")
    .select("testeur_id")
    .eq("mission_id", mission_id);
  if (assignmentsError) { console.error(assignmentsError); return json({ error: "Erreur serveur" }, 500); }

  const testeurIds = new Set<string>((assignments ?? []).map((a) => a.testeur_id));
  if (mission.testeur_id) testeurIds.add(mission.testeur_id);

  if (!testeurIds.has(user.id)) {
    return json({ error: "Vous n'êtes pas assigné à cette mission" }, 403);
  }

  if (!ALLOWED_PRIOR_STATUSES.includes(mission.status)) {
    return json(
      { error: `Impossible de soumettre un rapport : la mission est au statut "${mission.status}", pas encore prête pour ça.` },
      409,
    );
  }

  const { data: existingReport, error: existingReportError } = await supabase
    .from("reports")
    .select("id")
    .eq("mission_id", mission_id)
    .maybeSingle();
  if (existingReportError) { console.error(existingReportError); return json({ error: "Erreur serveur" }, 500); }

  const reportPayload = {
    mission_id,
    testeur_id: user.id,
    storage_path,
    critical_count,
    high_count,
    medium_count,
    low_count,
    summary,
    submitted_at: new Date().toISOString(),
  };

  if (existingReport) {
    const { error: updateError } = await supabase
      .from("reports")
      .update(reportPayload)
      .eq("id", existingReport.id);
    if (updateError) { console.error(updateError); return json({ error: "Erreur lors de la mise à jour du rapport" }, 500); }
  } else {
    const { error: insertError } = await supabase.from("reports").insert(reportPayload);
    if (insertError) { console.error(insertError); return json({ error: "Erreur lors de l'enregistrement du rapport" }, 500); }
  }

  const { error: updateMissionError } = await supabase
    .from("missions")
    .update({ status: "report_submitted" })
    .eq("id", mission_id);
  if (updateMissionError) { console.error(updateMissionError); return json({ error: "Erreur lors de la mise à jour de la mission" }, 500); }

  return json({
    status: "report_submitted",
    resubmission: Boolean(existingReport),
    message: existingReport
      ? "Rapport mis à jour avec succès."
      : "Rapport soumis avec succès — en attente de relecture par l'équipe.",
  });
});
