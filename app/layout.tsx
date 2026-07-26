import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "SafeHarbor — Audits de sécurité par des experts vérifiés",
  description:
    "Faites tester la sécurité de votre site par de vrais experts vérifiés manuellement. Prix fixe, rapport détaillé, cadre juridique signé.",
};

// Appliqué avant le premier rendu pour éviter un flash du mauvais thème :
// le thème sombre est la valeur par défaut (aucun attribut posé), donc ce
// script n'a besoin d'agir que si l'utilisateur a explicitement choisi le
// mode clair lors d'une visite précédente.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    if (localStorage.getItem("sh-theme") === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${ibmPlexMono.variable} ${ibmPlexSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
