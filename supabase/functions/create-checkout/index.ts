// ============================================================================
// Edge Function : create-checkout
// Appelée par le frontend quand un Client authentifié commande un package.
// 1. Vérifie l'identité de l'appelant (verify_jwt=true + vérification interne).
// 2. Crée la mission en base (statut 'draft'), avec le prix figé (snapshot).
// 3. Crée la transaction Paddle correspondante, avec custom_data.mission_id —
//    c'est ce qui permet à paddle-webhook de retrouver la mission plus tard.
// 4. Renvoie le transaction_id au frontend pour ouvrir Paddle.Checkout.open().
//
// Secrets requis (Project Settings > Edge Functions > Secrets) :
//   PADDLE_API_KEY  — clé API Paddle (PAS le client-side token, PAS le secret webhook)
//   PADDLE_API_BASE — optionnel, défaut https://sandbox-api.paddle.com
//                     (passer à https://api.paddle.com en production)
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY") ?? "";
const PADDLE_API_BASE = Deno.env.get("PADDLE_API_BASE") ?? "https://sandbox-api.paddle.com";

// À restreindre à ton propre domaine une fois que le frontend a une adresse fixe.
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

  // ---- 1. Identité de l'appelant ------------------------------------------
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Authentification requise" }, 401);

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await callerClient.auth.getUser();
  if (authError || !user) return json({ error: "Session invalide ou expirée" }, 401);

  // ---- 2. Lecture et validation de la commande ----------------------------
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const { package_code, target_urls, environment, emergency_contact_name, emergency_contact_phone } = body;
  if (!package_code || !Array.isArray(target_urls) || target_urls.length === 0) {
    return json({ error: "package_code et target_urls (tableau non vide) sont requis" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("*")
    .eq("code", package_code)
    .eq("is_active", true)
    .maybeSingle();

  if (pkgError) {
    console.error("Erreur lecture package:", pkgError);
    return json({ error: "Erreur serveur" }, 500);
  }
  if (!pkg) return json({ error: `Package inconnu ou inactif : ${package_code}` }, 404);
  if (!pkg.price_cents || !pkg.paddle_price_id) {
    return json(
      { error: "Ce package n'est pas encore relié à Paddle (paddle_price_id manquant). Contactez l'équipe, ou utilisez le formulaire Sur mesure." },
      409,
    );
  }

  // ---- 3. Création de la mission (snapshot du prix, Article 4/6 CGU) -----
  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .insert({
      client_id: user.id,
      package_id: pkg.id,
      status: "draft",
      package_code_snapshot: pkg.code,
      package_name_snapshot: pkg.name,
      price_cents_snapshot: pkg.price_cents,
      testeur_payout_cents_snapshot: pkg.testeur_payout_cents,
      currency_snapshot: pkg.currency,
      delivery_value_snapshot: pkg.delivery_value,
      delivery_unit_snapshot: pkg.delivery_unit,
      target_urls,
      environment: environment ?? null,
      emergency_contact_name: emergency_contact_name ?? null,
      emergency_contact_phone: emergency_contact_phone ?? null,
    })
    .select()
    .single();

  if (missionError) {
    console.error("Erreur création mission:", missionError);
    return json({ error: "Impossible de créer la mission" }, 500);
  }

  // ---- 4. Création de la transaction Paddle -------------------------------
  const paddleResponse = await fetch(`${PADDLE_API_BASE}/transactions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [{ price_id: pkg.paddle_price_id, quantity: 1 }],
      custom_data: { mission_id: mission.id },
      collection_mode: "automatic",
    }),
  });

  if (!paddleResponse.ok) {
    const errText = await paddleResponse.text();
    console.error("Erreur API Paddle:", paddleResponse.status, errText);
    // Nettoie la mission orpheline plutôt que de laisser un brouillon fantôme.
    await supabase.from("missions").delete().eq("id", mission.id);
    return json({ error: "Erreur lors de la création du paiement", details: errText }, 502);
  }

  const paddleData = await paddleResponse.json();
  const transactionId = paddleData.data?.id;

  return json({ mission_id: mission.id, transaction_id: transactionId });
});
