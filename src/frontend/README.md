# ScanNGo Cafe - Frontend

Next.js App Router + TypeScript + Tailwind CSS + Supabase

## Setup

1. Install dependencies:
```bash
cd src/frontend
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` dengan Supabase credentials dari dashboard.

4. Run development server:
```bash
npm run dev
```

## Structure

```
src/frontend/
├── app/                  # Next.js App Router pages
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── lib/
│   ├── supabase.ts       # Supabase client
│   └── database.types.ts # Generated types from DB schema
└── package.json
```

## Database Types

Types generated from `src/db/001-create-tables.sql`:
- `tables` - Meja cafe
- `menu_items` - Daftar menu
- `orders` - Pesanan pelanggan
- `order_items` - Detail pesanan
- `wifi_vouchers` - Kupon Wi-Fi otomatis

## Build

```bash
npm run build
```
