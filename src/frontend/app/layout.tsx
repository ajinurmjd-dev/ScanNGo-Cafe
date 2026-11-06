import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScanNGo Cafe - Order",
  description: "Place your order at ScanNGo Cafe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
