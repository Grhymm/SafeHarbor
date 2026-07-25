// ============================================================================
// Edge Function : paddle-webhook
// Reçoit les notifications Paddle (Developer Tools > Notifications), vérifie
// leur signature, et met à jour missions/payments en conséquence.
//
// IMPORTANT — dépendance côté frontend, pas encore construite :
// Cette fonction rattache un paiement à une mission via `custom_data.mission_id`
// sur la transaction Paddle. Il faut donc que le code qui crée la transaction
// Paddle (au moment où le Client commande un package) transmette bien
// `customData: { mission_id: "<uuid de la mission>" }` au checkout/à l'API.
// Sans ça, cette fonction reçoit le paiement mais ne sait pas quelle mission
// faire passer de 'draft' à 'paid'.
//
// À VÉRIFIER avant mise en prod (voir commentaires inline) :
// 1. Le nom exact de l'événement de remboursement ("adjustment.created" est
//    la meilleure estimation au moment de l'écriture, à reconfirmer dans le
//    simulateur de webhooks Paddle).
// 2. Le chemin exact du montant dans transaction.completed
//    (data.details.totals.total) — à vérifier avec un vrai payload via le
//    simulateur Paddle avant de faire confiance au calcul du montant encaissé.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PADDLE_WEBHOOK_SECRET = Deno.env.get("PADDLE_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TOLERANCE_SECONDS = 300;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
): Promise<boolean> {
  if (!signatureHeader || !PADDLE_WEBHOOK_SECRET) return false;

  const match = signatureHeader.match(/^ts=(\d+);h1=([0-9a-f]+)$/);
  if (!match) return false;
  const [, ts, h1] = match;

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(ts));
  if (ageSeconds > TOLERANCE_SECONDS) {
    console.error("Webhook Paddle rejeté : timestamp hors tolérance");
    return false;
  }

  const signedPayload = `${ts}:${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PADDLE_WEBHOOK_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload),
  );
  const computedHex = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(hexToBytes(computedHex), hexToBytes(h1));
}

async function handleTransactionCompleted(data: any) {
  const missionId = data.custom_data?.mission_id;
  const paddleTransactionId = data.id;
  const currency = data.currency_code ?? "EUR";
  const amountCents = Number(data.details?.totals?.total ?? 0);

  if (!missionId) {
    console.error(
      `transaction.completed sans custom_data.mission_id — transaction ${paddleTransactionId}`,
    );
    return;
  }

  const { data: mission, error: missionError } = await supabase
    .from("missions")
    .select("id, client_id, status")
    .eq("id", missionId)
    .maybeSingle();

  if (missionError) throw missionError;
  if (!mission) {
    console.error(
      `Mission ${missionId} introuvable pour la transaction ${paddleTransactionId}`,
    );
    return;
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    mission_id: mission.id,
    client_id: mission.client_id,
    paddle_transaction_id: paddleTransactionId,
    amount_cents: amountCents,
    currency,
    status: "paid",
    paid_at: new Date().toISOString(),
  });

  if (paymentError) {
    if (paymentError.code === "23505") {
      console.log(`Transaction ${paddleTransactionId} déjà traitée, ignorée.`);
      return;
    }
    throw paymentError;
  }

  const { error: updateError } = await supabase
    .from("missions")
    .update({ status: "paid" })
    .eq("id", mission.id)
    .eq("status", "draft");

  if (updateError) throw updateError;
}

async function handleAdjustmentCreated(data: any) {
  const paddleTransactionId = data.transaction_id;
  const isFullRefund = data.type === "full" || data.action === "refund";
  const refundedCents = Number(data.totals?.total ?? 0);

  const { data: payment, error: paymentLookupError } = await supabase
    .from("payments")
    .select("id, mission_id")
    .eq("paddle_transaction_id", paddleTransactionId)
    .maybeSingle();

  if (paymentLookupError) throw paymentLookupError;
  if (!payment) {
    console.error(`Aucun paiement trouvé pour la transaction ${paddleTransactionId}`);
    return;
  }

  const { error: updatePaymentError } = await supabase
    .from("payments")
    .update({
      status: isFullRefund ? "refunded" : "partially_refunded",
      refunded_cents: refundedCents,
    })
    .eq("id", payment.id);
  if (updatePaymentError) throw updatePaymentError;

  if (isFullRefund) {
    const { error: updateMissionError } = await supabase
      .from("missions")
      .update({ status: "refunded" })
      .eq("id", payment.mission_id);
    if (updateMissionError) throw updateMissionError;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  const isValid = await verifyPaddleSignature(rawBody, signature);
  if (!isValid) {
    console.error("Signature Paddle invalide ou absente — requête rejetée");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const eventType = event.event_type as string;
  const data = event.data ?? {};

  try {
    switch (eventType) {
      case "transaction.completed":
        await handleTransactionCompleted(data);
        break;
      case "adjustment.created":
        await handleAdjustmentCreated(data);
        break;
      default:
        console.log(`Événement Paddle non géré, ignoré : ${eventType}`);
    }
  } catch (err) {
    console.error(`Erreur de traitement pour ${eventType}:`, err);
    return new Response("Processing error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
