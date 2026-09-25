# MSR CHITS — Simple Chit Management System

A production-ready, lightweight, professional Chit Fund Management Web Application built as an installable **Progressive Web App (PWA)** for **iPhone 15 Plus** and Desktop, powered by a **Single-File Google Apps Script Web App Backend (`backend-app-script/Code.gs`)** and **Google Sheets** as the database.

---

## 📱 iPhone 15 Plus & PWA Optimizations

- **Target Mobile Viewport**: 430px width (iPhone 15 Plus, 15, 14, 13, and standard iOS Safari).
- **iOS Safe Area Insets**: Dynamic Island & Notch support (`env(safe-area-inset-top)`), Home Indicator bottom clearance (`env(safe-area-inset-bottom)`).
- **Mobile Bottom Navigation Bar**: Fixed bottom tabs (`Dashboard`, `Chits`, `Members`, `Payments`, `More`) with minimum 44px touch targets.
- **Mobile Card-Based Tables**: Complex tables intelligently transform into vertical cards on mobile viewports.
- **Mobile Bottom-Sheet Modals**: Full bottom-sheet modals with `inputMode="decimal"` for amounts and `inputMode="numeric"` for mobile numbers.
- **Offline Shell**: Service Worker precaching with Workbox (`vite-plugin-pwa`) and real-time offline indicators.

---

## 🎨 Design System & Stitch Visual Language

- **Primary Forest Green**: `#003524`
- **Primary Container**: `#174D38`
- **Light Green Surface**: `#F0FCF4`
- **On Surface Dark**: `#131E19`
- **Chit Gold Accent**: `#FED255` / `#C9A227`
- **Supporting Gold**: `#755B00`
- **Typography**: Inter & Plus Jakarta Sans
- **NO Commission Percentages**: Strictly displays exact Master 20-Month Schedule contributions (Sum = ₹88,825).

---

## 🏗️ Architecture

```
iPhone 15 Plus / Desktop
        ↓
MSR CHITS PWA (React + Vite)
        ↓ (Fetch POST / text/plain JSON payload)
Google Apps Script Web App
        ↓
backend-app-script/Code.gs (ONE FILE ONLY)
        ↓
Google Spreadsheet (8 Tabs)
```

- **NO** Firebase
- **NO** Supabase / MongoDB / SQL
- **NO** Node / Express server
- **NO** multiple `.gs` files — Everything is self-contained in `backend-app-script/Code.gs`.

---

## 📁 File Structure

```
MSR CHITS/
│
├── backend-app-script/
│   └── Code.gs                  # Complete single-file Google Apps Script backend
│
├── public/
│   ├── favicon.svg              # Vector brand emblem
│   ├── apple-touch-icon.png     # 180x180 iOS home screen icon
│   ├── pwa-192x192.png          # 192x192 PWA icon
│   ├── pwa-512x512.png          # 512x512 maskable PWA icon
│   └── manifest.webmanifest     # PWA Manifest
│
├── src/
│   ├── components/
│   │   ├── layout/              # Sidebar, Header, MobileNavigation, Layout
│   │   ├── common/              # StatCard, StatusBadge, DataTable, SearchBar, FilterBar, Modal, ConfirmDialog, NetworkStatus, PwaUpdatePrompt
│   │   ├── chits/               # ChitForm, ChitSchedule, ChitTimeline, AssignChitModal
│   │   ├── members/             # MemberForm, MemberDetailsModal
│   │   ├── payments/            # PaymentForm (auto due amount calculation)
│   │   └── payouts/             # PayoutForm (two-step confirmation screen)
│   │
│   ├── pages/
│   │   ├── Login.jsx            # Portal login with backend health status
│   │   ├── Dashboard.jsx        # 4 top stats, 20M progress, Month 2 status
│   │   ├── Chits.jsx            # Chit groups directory
│   │   ├── ChitDetails.jsx      # Master 20M schedule, unassigned rules
│   │   ├── Members.jsx          # Member directory, filters, card view
│   │   ├── MemberDetails.jsx    # Member ledger statement & printable view
│   │   ├── Payments.jsx         # Installment payments & receipt tracking
│   │   ├── Payouts.jsx          # Prize money disbursements & ledger
│   │   ├── Reports.jsx          # Monthly breakdown, CSV export & print
│   │   └── Settings.jsx         # Organization settings & PWA install guide
│   │
│   ├── services/
│   │   ├── api.js               # Unified API service with offline fallback
│   │   └── auth.js              # Authentication service
│   │
│   ├── context/
│   │   ├── AuthContext.jsx      # Authentication session context
│   │   └── ChitContext.jsx      # Active chit, sync status, global modals
│   │
│   ├── data/
│   │   └── demoData.js          # Master seed data & allocation rules
│   │
│   ├── utils/
│   │   ├── currency.js          # Indian Rupee (₹) formatting
│   │   ├── date.js              # Dates and relative sync time
│   │   └── validation.js        # Mobile and input validation
│   │
│   ├── App.jsx                  # React router setup & route protection
│   ├── main.jsx                 # Entry point
│   └── index.css                # Tailwind CSS & iOS safe-area styling
│
├── .env.example
├── index.html                   # iOS PWA meta, viewport-fit=cover
├── package.json
├── vite.config.js               # Vite + Tailwind + VitePWA config
└── README.md
```

---

## 📊 Google Sheets & Apps Script Setup (Step-by-Step)

### 1. Create Google Sheet
1. Open [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Name it **"MSR CHITS Database"**.

### 2. Open Apps Script
1. In Google Sheets, click **Extensions** > **Apps Script**.
2. Delete any default code in `Code.gs`.

### 3. Paste Single Backend File
1. Copy the entire content of [`backend-app-script/Code.gs`](file:///d:/MSR%20Chit/backend-app-script/Code.gs).
2. Paste it into the Apps Script editor `Code.gs`.
3. Save the project (Ctrl+S).

### 4. Run `setupDatabase()` Once
1. In the Apps Script toolbar, select `setupDatabase` from the function dropdown.
2. Click **Run**.
3. Review and grant Google permissions when prompted.
4. All 8 sheets will be created and formatted automatically:
   - `Users`
   - `Chits`
   - `Members`
   - `MonthlySchedule`
   - `Payments`
   - `Payouts`
   - `ActivityLog`
   - `Settings`

### 5. Deploy as Web App
1. Click **Deploy** (top right) > **New deployment**.
2. Click the gear icon > **Web app**.
3. Configure:
   - **Description**: `MSR Chits API`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`
4. Click **Deploy**.
5. Copy the generated **Web app URL** (e.g. `https://script.google.com/macros/s/.../exec`).

### 6. Connect React Frontend
1. In your local project, create/edit `.env`:
   ```env
   VITE_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   ```
2. Start the app:
   ```bash
   npm run dev
   ```

---

## 📱 How to Install on iPhone 15 Plus

1. Open the deployed application URL in **Safari** on your iPhone 15 Plus.
2. Tap the **Share** button (box with an arrow pointing up at the bottom).
3. Scroll down and tap **"Add to Home Screen"**.
4. Tap **"Add"** in the top-right corner.
5. The **MSR CHITS** app icon will appear on your Home Screen and launch in full-screen standalone mode.

---

## 🔑 Admin Credentials
- **Username / Mobile**: `admin` or `9840123456`
- **Password**: `admin123`
