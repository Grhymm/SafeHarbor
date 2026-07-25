// ============================================================================
// Edge Function : validate-mission
// Le Client valide le rapport reçu — conformément à l'Article 6 de
// l'Engagement Testeur ("le paiement est déclenché après validation du
// rapport par le Client"). Crée une ligne `payouts` par testeur assigné et
// fait passer la mission à 'validated'.
//
// SIMPLIFICATION V1 assumée : si plusieurs testeurs sont assignés à la même
// mission (table mission_assignments), le montant prévu
// (testeur_payout_cents_snapshot) est réparti à parts égales entre eux,
// arrondi à l'euro/dollar inférieur, le reliquat allant au premier assigné
// par ordre d'assignation. Ce choix est à revalider dès qu'une vraie mission
// à plusieurs testeurs existera — le modèle initial visait un testeur unique
// par mission.
//
// Les versements créés ici restent 'pending' — le virement réel au testeur
// demeure manuel en V1 (voir admin-queries), cette fonction ne fait
// qu'enregistrer ce qui est dû et à qui.
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
  const { mission_id } = body;
  if (!mission_id) return json({ error: "mission_id requis" }, 400);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("id, client_id, testeur_id, status, testeur_payout_cents_snapshot, currency_snapshot")
    .eq("id", mission_id)
    .maybeSingle();

  if (missionError) { console.error(missionError); return json({ error: "Erreur serveur" }, 500); }
  if (!mission) return json({ error: "Mission introuvable" }, 404);

  if (mission.client_id !== user.id) {
    return json({ error: "Tu n'es pas le client de cette mission" }, 403);
  }

  if (mission.status !== "delivered") {
    return json(
      { error: `Impossible de valider : la mission est au statut "${mission.status}", pas encore livrée.` },
      409,
    );
  }

  if (!mission.testeur_payout_cents_snapshot) {
    await supabase.from("missions").update({ status: "validated" }).eq("id", mission_id);
    return json({ status: "validated", payouts_created: 0, message: "Mission validée — aucun versement testeur applicable pour ce package." });
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("mission_assignments")
    .select("testeur_id, assigned_at")
    .eq("mission_id", mission_id)
    .order("assigned_at", { ascending: true });
  if (assignmentsError) { console.error(assignmentsError); return json({ error: "Erreur serveur" }, 500); }

  const testeurIds = (assignments ?? []).map((a) => a.testeur_id);
  if (mission.testeur_id && !testeurIds.includes(mission.testeur_id)) {
    testeurIds.unshift(mission.testeur_id);
  }

  if (testeurIds.length === 0) {
    console.error(`Mission ${mission_id} validée sans aucun testeur assigné — situation anormale`);
    await supabase.from("missions").update({ status: "validated" }).eq("id", mission_id);
    return json({ status: "validated", payouts_created: 0, message: "Mission validée, mais aucun testeur assigné trouvé — à vérifier manuellement." });
  }

  const totalCents = mission.testeur_payout_cents_snapshot;
  const shareCents = Math.floor(totalCents / testeurIds.length);
  const remainder = totalCents - shareCents * testeurIds.length;

  const payoutRows = testeurIds.map((testeurId, index) => ({
    mission_id,
    testeur_id: testeurId,
    amount_cents: shareCents + (index === 0 ? remainder : 0),
    status: "pending" as const,
  }));

  const { error: payoutError } = await supabase.from("payouts").insert(payoutRows);
  if (payoutError) { console.error(payoutError); return json({ error: "Erreur lors de la création des versements" }, 500); }

  const { error: updateMissionError } = await supabase
    .from("missions")
    .update({ status: "validated" })
    .eq("id", mission_id)
    .eq("status", "delivered");
  if (updateMissionError) { console.error(updateMissionError); return json({ error: "Erreur lors de la mise à jour de la mission" }, 500); }

  return json({
    status: "validated",
    payouts_created: payoutRows.length,
    message: `Mission validée — ${payoutRows.length} versement(s) enregistré(s) en attente de virement.`,
  });
});
