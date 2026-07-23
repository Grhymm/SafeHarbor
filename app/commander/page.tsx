"use client";

import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { initializePaddle, type Paddle, type Environments } from "@paddle/paddle-js";
import { supabase } from "@/lib/supabase/client";
import { RedactionBars } from "@/components/RedactionBars";

type Msg = { type: "error" | "ok"; text: string } | null;

type PackageCode = "audit_essentiel" | "audit_complet";

const PACKAGES: {
  code: PackageCode;
  eyebrow: string;
  name: string;
  scope: string;
  price: string;
  delivery: string;
}[] = [
  {
    code: "audit_essentiel",
    eyebrow: "Package — Essentiel",
    name: "Audit Essentiel",
    scope: "Site vitrine / petite boutique — surface publique + authentification simple",
    price: "590 €",
    delivery: "Livré sous 72h",
  },
  {
    code: "audit_complet",
    eyebrow: "Package — Complet",
    name: "Audit Complet",
    scope: "E-commerce / espace membre — parcours authentifié, paiement en boîte noire, back-office",
    price: "1 590 €",
    delivery: "Livré sous 5 jours ouvrés",
  },
];

function MessageBox({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <div
      className={`rounded-[3px] px-3.5 py-3 text-[13px] mt-4 ${
        msg.type === "error" ? "bg-sh-error-bg text-sh-error-ink" : "bg-sh-ok-bg text-sh-ok-ink"
      }`}
    >
      {msg.text}
    </div>
  );
}

function PackageCard({
  pkg,
  isOrdering,
  onOrder,
}: {
  pkg: (typeof PACKAGES)[number];
  isOrdering: boolean;
  onOrder: (code: PackageCode, url: string, environment: string) => void;
}) {
  const [url, setUrl] = useState("");
  const [environment, setEnvironment] = useState("production");
  const [cguAccepted, setCguAccepted] = useState(false);

  return (
    <div className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 mb-5">
      <p className="font-plex-mono text-[11px] tracking-[0.1em] uppercase text-sh-ink-dim mb-1.5">
        {pkg.eyebrow}
      </p>
      <div className="text-lg font-semibold mb-1.5">{pkg.name}</div>
      <div className="text-sh-ink-dim text-[13px] mb-4">{pkg.scope}</div>
      <div className="font-plex-mono text-2xl font-semibold text-sh-amber mb-1">{pkg.price}</div>
      <div className="text-sh-ink-dim text-[13px] mb-5">{pkg.delivery}</div>

      <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
        URL du site à tester
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://exemple.com"
        required
        className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] mb-4.5 text-sh-ink focus:outline-none focus:border-sh-amber"
      />

      <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
        Environnement
      </label>
      <select
        value={environment}
        onChange={(e) => setEnvironment(e.target.value)}
        className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] mb-4.5 text-sh-ink focus:outline-none focus:border-sh-amber"
      >
        <option value="production">Production</option>
        <option value="staging">Staging / préproduction</option>
      </select>

      {/* Pas encore de page CGU/CGV cliquable : le contenu n'existe pour l'instant qu'en Word.
          Dépendance à créer plus tard, puis à lier ici une fois publiée. */}
      <label className="flex items-start gap-2.5 mb-4.5 cursor-pointer">
        <input
          type="checkbox"
          checked={cguAccepted}
          onChange={(e) => setCguAccepted(e.target.checked)}
          className="accent-sh-amber w-4 h-4 mt-0.5 shrink-0 cursor-pointer"
        />
        <span className="text-[13px] text-sh-ink-dim">
          J&apos;accepte les Conditions Générales d&apos;Utilisation et de Vente
        </span>
      </label>

      <button
        disabled={isOrdering || !cguAccepted}
        onClick={() => onOrder(pkg.code, url.trim(), environment)}
        className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4.5 py-3 font-plex-mono text-[13px] font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isOrdering ? "Préparation du paiement…" : `Commander l'${pkg.name}`}
      </button>
    </div>
  );
}

export default function CommanderPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [loginMsg, setLoginMsg] = useState<Msg>(null);
  const [orderMsg, setOrderMsg] = useState<Msg>(null);
  const [orderingCode, setOrderingCode] = useState<PackageCode | null>(null);

  const paddleRef = useRef<Paddle | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    initializePaddle({
      token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
      environment: process.env.NEXT_PUBLIC_PADDLE_ENV as Environments,
      eventCallback: (event) => {
        if (event.name === "checkout.completed") {
          setOrderMsg({
            type: "ok",
            text: "Paiement reçu — la mission est en cours de traitement. Tu recevras la confirmation par e-mail.",
          });
        }
      },
    }).then((paddle) => {
      paddleRef.current = paddle;
    });
  }, []);

  async function handleSendLink() {
    if (!email.trim()) {
      setLoginMsg({ type: "error", text: "Entre une adresse e-mail." });
      return;
    }

    setIsSendingLink(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href },
    });
    setIsSendingLink(false);

    if (error) {
      setLoginMsg({ type: "error", text: `Erreur : ${error.message}` });
    } else {
      setLoginMsg({ type: "ok", text: "Lien envoyé — vérifie ta boîte mail (et les spams)." });
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  async function handleOrder(packageCode: PackageCode, url: string, environment: string) {
    if (!url) {
      setOrderMsg({ type: "error", text: "Indique l'URL du site à tester." });
      return;
    }

    setOrderingCode(packageCode);
    setOrderMsg(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            package_code: packageCode,
            target_urls: [url],
            environment,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setOrderMsg({ type: "error", text: result.error || "Une erreur est survenue." });
        return;
      }

      paddleRef.current?.Checkout.open({ transactionId: result.transaction_id });
    } catch (err) {
      setOrderMsg({
        type: "error",
        text: `Erreur réseau : ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setOrderingCode(null);
    }
  }

  const isAuthenticated = !checkingSession && !!session;

  return (
    <div className="bg-sh-bg text-sh-ink font-plex-sans min-h-screen">
      <div className="max-w-[640px] mx-auto px-5 pt-14 pb-24">
        <h2 className="sr-only">Formulaire de commande d&apos;un audit de sécurité</h2>

        <RedactionBars />
        <p className="font-plex-mono text-xs tracking-[0.14em] text-sh-amber uppercase mb-2.5">
          Accès client — commande d&apos;audit
        </p>
        <h1 className="text-[28px] font-semibold mb-3.5 tracking-[-0.01em]">
          Commander un audit de sécurité
        </h1>
        <p className="text-sh-ink-dim text-[15px] max-w-[52ch] mb-10">
          Choisis un package, décris le périmètre à tester, et procède au paiement.
        </p>

        {!isAuthenticated && (
          <section className="bg-sh-panel border border-sh-panel-line rounded-[3px] p-7 mb-5">
            <label className="block font-plex-mono text-[11px] tracking-[0.08em] uppercase text-sh-ink-dim mb-2">
              Adresse e-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="toi@entreprise.com"
              autoComplete="email"
              className="w-full bg-sh-bg border border-sh-panel-line rounded-[3px] px-3 py-2.5 text-[14px] mb-4.5 text-sh-ink focus:outline-none focus:border-sh-amber"
            />
            <button
              disabled={isSendingLink}
              onClick={handleSendLink}
              className="bg-sh-amber text-sh-amber-ink border-none rounded-[3px] px-4.5 py-3 font-plex-mono text-[13px] font-semibold tracking-[0.05em] uppercase cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSendingLink ? "Envoi en cours…" : "Recevoir un lien de connexion"}
            </button>
            <MessageBox msg={loginMsg} />
          </section>
        )}

        {isAuthenticated && (
          <div>
            <div className="flex justify-between items-center mb-6 font-plex-mono text-xs text-sh-ink-dim">
              <span>Connecté : {session!.user.email}</span>
              <button
                onClick={handleLogout}
                className="bg-transparent text-sh-ink-dim border border-sh-panel-line rounded-[3px] px-3.5 py-2 text-[13px] cursor-pointer"
              >
                Se déconnecter
              </button>
            </div>

            <MessageBox msg={orderMsg} />

            {PACKAGES.map((pkg) => (
              <PackageCard
                key={pkg.code}
                pkg={pkg}
                isOrdering={orderingCode === pkg.code}
                onOrder={handleOrder}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
