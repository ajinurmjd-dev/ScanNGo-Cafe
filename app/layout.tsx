import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ScanNGo Cafe',
  description: 'Smart QR-POS & Table Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
