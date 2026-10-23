import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Toaster } from "sonner";
import { prefsBootScript } from "@/components/shell/prefs-provider";
import { PwaRegister } from "@/components/shell/pwa-register";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const serif = Source_Serif_4({ subsets: ["latin"], variable: "--font-source-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Counsel · Gestión legal simple", template: "%s" },
  description: "Casos, plazos, escritos y cobros de tu despacho en un solo lugar.",
  applicationName: "Counsel",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Counsel", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f4" },
    { media: "(prefers-color-scheme: dark)", color: "#161615" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-BO" className={`${inter.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: prefsBootScript }} />
      </head>
      <body>
        <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:p-3">
          Saltar al contenido
        </a>
        {children}
        <Toaster position="bottom-center" toastOptions={{ style: { fontSize: "1rem" } }} />
        <PwaRegister />
      </body>
    </html>
  );
}
