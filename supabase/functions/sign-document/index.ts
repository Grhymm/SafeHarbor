// ============================================================================
// Edge Function : sign-document
// Signature électronique de l'Autorisation de Test par le Client ou un
// Testeur assigné à une mission.
//
// SIMPLIFICATION V1 assumée : pas de PDF généré. Le document tourne autour
// des données déjà présentes sur la mission (URLs, dates, parties) — la
// signature porte sur ces termes affichés dynamiquement côté frontend, pas
// sur un fichier stocké. `documents.storage_path` pointe vers un chemin
// placeholder tant qu'un vrai PDF n'est pas généré (amélioration V2).
//
// La signature "plateforme" est enregistrée automatiquement à la création
// du document : l'admin, en assignant un testeur, exprime déjà le
// consentement de la Plateforme aux termes spécifiques de cette mission.
// Seuls le Client et le(s) Testeur(s) doivent activement signer ici.
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
    .select("id, client_id, testeur_id, status")
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

  const isClient = user.id === mission.client_id;
  const isTesteur = testeurIds.has(user.id);

  if (!isClient && !isTesteur) {
    return json({ error: "Tu ne fais pas partie de cette mission" }, 403);
  }
  if (testeurIds.size === 0) {
    return json(
      { error: "Aucun testeur n'est encore assigné à cette mission — la signature n'est pas encore possible" },
      409,
    );
  }

  let { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, status")
    .eq("mission_id", mission_id)
    .eq("type", "autorisation_test")
    .maybeSingle();

  if (docError) { console.error(docError); return json({ error: "Erreur serveur" }, 500); }

  if (!document) {
    const { data: newDoc, error: createDocError } = await supabase
      .from("documents")
      .insert({
        mission_id,
        type: "autorisation_test",
        storage_path: `${mission_id}/autorisation-test.json`,
        status: "pending_signature",
      })
      .select("id, status")
      .single();
    if (createDocError) { console.error(createDocError); return json({ error: "Erreur serveur" }, 500); }
    document = newDoc;

    const { error: platformSigError } = await supabase.from("signatures").insert({
      document_id: document.id,
      signer_id: null,
      signer_role: "plateforme",
      signed_at: new Date().toISOString(),
    });
    if (platformSigError) console.error("Erreur signature plateforme:", platformSigError);
  }

  if (document.status === "signed") {
    return json({ status: "signed", message: "Ce document est déjà entièrement signé." });
  }

  const signerRole = isClient ? "client" : "testeur";
  const { data: existingSig } = await supabase
    .from("signatures")
    .select("id")
    .eq("document_id", document.id)
    .eq("signer_id", user.id)
    .maybeSingle();

  if (!existingSig) {
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim() ?? null;

    const { error: sigError } = await supabase.from("signatures").insert({
      document_id: document.id,
      signer_id: user.id,
      signer_role: signerRole,
      signed_at: new Date().toISOString(),
      ip_address: ip,
    });
    if (sigError) { console.error(sigError); return json({ error: "Erreur lors de l'enregistrement de la signature" }, 500); }
  }

  const { data: allSignatures, error: allSigError } = await supabase
    .from("signatures")
    .select("signer_id")
    .eq("document_id", document.id);
  if (allSigError) { console.error(allSigError); return json({ error: "Erreur serveur" }, 500); }

  const signedUserIds = new Set((allSignatures ?? []).map((s) => s.signer_id).filter(Boolean));
  const clientSigned = signedUserIds.has(mission.client_id);
  const allTesteursSigned = [...testeurIds].every((id) => signedUserIds.has(id));

  if (clientSigned && allTesteursSigned) {
    await supabase.from("documents").update({ status: "signed" }).eq("id", document.id);
    await supabase.from("missions").update({ status: "contracts_signed" }).eq("id", mission_id);
    return json({ status: "signed", message: "Toutes les parties ont signé — la mission peut démarrer." });
  }

  return json({
    status: "pending_signature",
    client_signed: clientSigned,
    testeurs_signed: [...testeurIds].filter((id) => signedUserIds.has(id)).length,
    testeurs_total: testeurIds.size,
  });
});
