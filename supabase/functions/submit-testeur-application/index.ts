// ============================================================================
// Edge Function : submit-testeur-application
// Formulaire public de candidature testeur. Pas d'authentification requise
// (verify_jwt=false) — c'est justement le point d'entrée pour QUI QUE CE SOIT
// qui veut candidater, sans compte préexistant.
//
// Sécurité : le compte est créé directement via l'Admin API avec
// email_confirm=true (pas d'email envoyé — évite la limite d'envoi du
// service email par défaut, et une candidature n'exige pas un accès
// immédiat). Le vrai garde-fou est ailleurs : verification_status='pending'
// à l'insertion. Un candidat n'apparaît dans aucune mission, ne peut signer
// aucune Autorisation de Test et n'a accès à rien tant qu'un admin ne passe
// pas manuellement son statut à 'verified' (le trigger
// prevent_testeur_self_verification empêche un candidat de se valider
// lui-même — cf. migration mission_assignments_and_service_role_fix).
//
// profile_id renvoyé au frontend : sert uniquement à afficher/suivre le
// statut de LA candidature qu'on vient de soumettre (via la table publique
// et restreinte testeur_application_status), pas à authentifier quoi que
// ce soit.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const { full_name, email, specialties, legal_status, motivation } = body;

  if (!full_name || typeof full_name !== "string" || full_name.trim().length < 2) {
    return json({ error: "Le nom complet est requis." }, 400);
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || typeof email !== "string" || !emailPattern.test(email)) {
    return json({ error: "Une adresse e-mail valide est requise." }, 400);
  }
  if (!motivation || typeof motivation !== "string" || motivation.trim().length < 20) {
    return json({ error: "Décris ton expérience en au moins quelques phrases (20 caractères minimum)." }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createError) {
    if (createError.message?.toLowerCase().includes("already been registered")) {
      return json({ error: "Cette adresse e-mail est déjà associée à un compte ou une candidature." }, 409);
    }
    console.error("Erreur création compte candidat:", createError);
    return json({ error: "Impossible de créer le compte." }, 500);
  }

  const userId = created.user.id;

  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "testeur", full_name })
    .eq("id", userId);

  if (roleError) {
    console.error("Erreur mise à jour du rôle:", roleError);
    return json({ error: "Erreur lors de l'enregistrement du profil." }, 500);
  }

  const { error: testeurError } = await supabase.from("testeur_profiles").insert({
    profile_id: userId,
    verification_status: "pending",
    specialties: Array.isArray(specialties) ? specialties : [],
    legal_status: legal_status ?? null,
    bio: motivation,
    active: false,
  });

  if (testeurError) {
    console.error("Erreur enregistrement candidature:", testeurError);
    return json({ error: "Erreur lors de l'enregistrement de la candidature." }, 500);
  }

  return json({
    success: true,
    message: "Candidature enregistrée. Elle sera examinée par l'équipe.",
    profile_id: userId,
  });
});
