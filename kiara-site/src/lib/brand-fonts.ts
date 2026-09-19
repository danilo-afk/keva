import { JetBrains_Mono, Manrope, Sora } from "next/font/google";

// Fontes oficiais do rebrand.
export const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
  variable: "--font-sora",
});

export const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-manrope",
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});
