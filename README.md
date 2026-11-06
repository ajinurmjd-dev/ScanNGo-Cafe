# ScanNGo Cafe

Smart QR-POS & Table Management System untuk UMKM Cafe

## 📋 Dokumentasi

- **[PRD.md](./docs/PRD.md)** - Spesifikasi produk lengkap, ERD, dan arsitektur sistem

## 🏗️ Struktur Folder

```
ScanNGo-Cafe/
├── docs/              # Dokumentasi sistem & spesifikasi
│   └── PRD.md
├── src/
│   ├── frontend/      # Next.js aplikasi (Customer POS & Admin)
│   ├── backend/       # Supabase Edge Functions / API
│   └── db/            # SQL migrations & triggers
├── assets/            # Diagram & screenshots
└── README.md
```

## 🚀 Tech Stack

- **Frontend:** Next.js + React + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Realtime)
- **Database:** PostgreSQL dengan Views & Triggers
- **Deployment:** Vercel (Frontend) + Supabase (Backend)

## ✨ Fitur Utama

- QR Code scanning per meja (validasi lokasi via IP/Wi-Fi)
- Order management realtime (Kasir & Barista)
- Auto-generate Wi-Fi voucher saat pembayaran
- Dashboard analitik penjualan (harian/mingguan/bulanan)
- Kitchen Display System (KDS) realtime

## 📌 Status

Portfolio project - Implementation in progress
