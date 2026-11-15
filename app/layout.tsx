import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/Providers";
import { CapsuleNav } from "@/components/nav/CapsuleNav";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Laydays",
  description: "Every hour of a ship's wait, ruled. Every claim, presented before day 90.",
  icons: { icon: "/art/mark.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Providers>
          <CapsuleNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
