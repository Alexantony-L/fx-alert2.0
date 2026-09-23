import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Forex Price Alert",
  description: "Simple forex price alerts delivered to Telegram",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
