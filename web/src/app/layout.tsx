import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@/components/ConnectButton";
import { NETWORK_LABEL } from "@/lib/config";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "ArcInvoice · USDC payment links on Arc",
  description: "Create an invoice, share a link, get paid in native USDC on Arc. One transaction, no approvals, final in one block.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
          <header className="hdr">
            <Link href="/" className="brand"><span className="logo">A</span>Arc<span className="w">Invoice</span></Link>
            <span className="pill"><span className="dot" />{NETWORK_LABEL}</span>
            <div style={{ flex: 1 }} />
            <ConnectButton />
          </header>
          <main className="main">{children}</main>
          <footer className="ftr">
            Native USDC settlement on Arc · one transaction, no approvals, final in one block.<br />
            <a href="https://github.com/kang5647/arc-invoice" target="_blank" rel="noreferrer">GitHub</a> · <a href="https://docs.arc.io" target="_blank" rel="noreferrer">Arc docs</a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
