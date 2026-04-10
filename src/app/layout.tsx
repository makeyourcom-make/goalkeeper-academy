import type { Metadata } from "next";
import { Anton, Inter } from "next/font/google";
import "./globals.css";

const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-anton",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Goalkeeper Academy",
    template: "%s | Goalkeeper Academy",
  },
  description:
    "Académie de gardiens de but du Chablais valaisan. Formation spécialisée pour les jeunes gardiens de 6 à 18 ans.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${anton.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-white font-sans text-grey-700 antialiased">
        {children}
      </body>
    </html>
  );
}
