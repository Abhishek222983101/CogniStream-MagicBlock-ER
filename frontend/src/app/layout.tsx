import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import WalletProvider from "@/components/WalletProvider";
import { ToastProvider } from "@/components/Toast";

const bricolage = Bricolage_Grotesque({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: "CogniStream | Privacy-First Clinical Trial Matching",
  description: "AI-powered clinical trial matching on Solana with MagicBlock Ephemeral Rollups for gasless, private transactions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${jetbrainsMono.variable} antialiased selection:bg-black selection:text-[#A7F3D0]`}
      >
        <WalletProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </WalletProvider>
      </body>
    </html>
  );
}