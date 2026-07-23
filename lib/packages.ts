export type PackageCode = "scan_express" | "audit_essentiel" | "audit_complet";

export type CheckoutPackage = {
  code: PackageCode;
  eyebrow: string;
  name: string;
  scope: string;
  priceCents: number;
  delivery: string;
};

export const CHECKOUT_PACKAGES: CheckoutPackage[] = [
  {
    code: "scan_express",
    eyebrow: "Package — Scan Express",
    name: "Scan Express",
    scope: "Scan automatisé de vulnérabilités connues — pas d'intervention humaine manuelle",
    priceCents: 4900,
    delivery: "Résultats sous 24h",
  },
  {
    code: "audit_essentiel",
    eyebrow: "Package — Essentiel",
    name: "Audit Essentiel",
    scope: "Site vitrine / petite boutique — surface publique + authentification simple",
    priceCents: 14900,
    delivery: "Livré sous 72h",
  },
  {
    code: "audit_complet",
    eyebrow: "Package — Complet",
    name: "Audit Complet",
    scope: "E-commerce / espace membre — parcours authentifié, paiement en boîte noire, back-office",
    priceCents: 39900,
    delivery: "Livré sous 5 jours ouvrés",
  },
];

export const CUSTOM_PACKAGE = {
  eyebrow: "Sur devis",
  name: "Sur mesure",
  scope: "Périmètre complexe, multi-domaines, ou besoins spécifiques — devis établi après échange avec l'équipe.",
  startingPriceCents: 149900,
};

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}
