import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/nav";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "Council of eCLAWmmerce — Agentic AI Tools for Ecommerce Builders",
  description:
    "The open-source intelligence layer for agentic ecommerce builders. New tools auto-discovered and assessed weekly by AI. No hype, just signal.",
  icons: {
    icon: "/crab-logo.png",
    apple: "/crab-logo.png",
  },
  openGraph: {
    title: "Council of eCLAWmmerce",
    description:
      "The open-source intelligence layer for agentic ecommerce builders.",
    url: "https://eclawmmerce.ai",
    siteName: "Council of eCLAWmmerce",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
