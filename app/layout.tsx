import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { BASE_PATH } from "@/lib/site";

import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Unconditional integer factorization",
  description:
    "Factor integers in your browser with Rust compiled to WebAssembly, and read what Google's L_N[1/3, O(1)] factoring result does and does not change.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <head>
        {/* GitHub Pages cannot send COOP/COEP headers; this service worker adds them so
            multithreaded WebAssembly (SharedArrayBuffer) works. It reloads once on first visit. */}
        <script src={`${BASE_PATH}/coi-serviceworker.js`} />
      </head>
      <body>{children}</body>
    </html>
  );
}
